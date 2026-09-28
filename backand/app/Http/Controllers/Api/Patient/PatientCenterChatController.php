<?php

namespace App\Http\Controllers\Api\Patient;

use App\Http\Controllers\Controller;
use App\Models\CenterConversation;
use App\Models\CenterMessage;
use App\Models\Patient;
use App\Services\CenterChatService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PatientCenterChatController extends Controller
{
    public function __construct(private CenterChatService $chat) {}

    public function index(Request $request): JsonResponse
    {
        /** @var Patient $patient */
        $patient = $request->user();
        $this->chat->touchPresence('patient', $patient->id, null);

        $conversations = CenterConversation::query()
            ->with(['company:id,name', 'patient:id,name'])
            ->where('patient_id', $patient->id)
            ->orderByDesc('last_message_at')
            ->orderByDesc('id')
            ->get();

        return response()->json([
            'data' => $this->chat->listPayloads($conversations, 'patient'),
        ]);
    }

    public function unread(Request $request): JsonResponse
    {
        /** @var Patient $patient */
        $patient = $request->user();
        $this->chat->touchPresence('patient', $patient->id, null);

        return response()->json([
            'unread_count' => $this->chat->totalUnreadForPatient($patient->id),
        ]);
    }

    public function start(Request $request): JsonResponse
    {
        /** @var Patient $patient */
        $patient = $request->user();

        $data = $request->validate([
            'company_id' => ['required', 'integer'],
        ]);

        $company = $this->chat->resolveCentre((int) $data['company_id']);
        $conversation = $this->chat->openForPatient($patient, $company);
        $this->chat->touchPresence('patient', $patient->id, null);
        $this->chat->markRead($conversation, 'patient');
        $conversation->refresh();

        return response()->json([
            'conversation' => $this->chat->conversationPayload($conversation, 'patient'),
            'messages' => $this->chat->messages($conversation),
        ]);
    }

    public function show(Request $request, int $conversation): JsonResponse
    {
        /** @var Patient $patient */
        $patient = $request->user();
        $record = $this->find($patient, $conversation);
        $this->chat->touchPresence('patient', $patient->id, null);

        if ($request->boolean('mark_read')) {
            $this->chat->markRead($record, 'patient');
            $record->refresh();
        }

        return response()->json([
            'conversation' => $this->chat->conversationPayload($record, 'patient'),
            'messages' => $this->chat->messages($record, (int) $request->query('after', 0)),
        ]);
    }

    public function send(Request $request, int $conversation): JsonResponse
    {
        /** @var Patient $patient */
        $patient = $request->user();
        $record = $this->find($patient, $conversation);

        $data = $request->validate([
            'body' => ['nullable', 'string', 'max:2000'],
            'image' => ['nullable', 'image', 'mimes:jpeg,jpg,png,gif,webp', 'max:5120'],
            'image_base64' => ['nullable', 'string'],
        ]);

        $image = $request->file('image')
            ?: ((! empty($data['image_base64']) && str_starts_with($data['image_base64'], 'data:image/'))
                ? $data['image_base64']
                : null);

        abort_if(
            trim((string) ($data['body'] ?? '')) === '' && ! $image,
            422,
            'Message cannot be empty.'
        );

        $message = $this->chat->send(
            $record,
            CenterMessage::TYPE_PATIENT,
            null,
            $data['body'] ?? null,
            $image
        );
        $this->chat->touchPresence('patient', $patient->id, null);
        $record->refresh();

        return response()->json([
            'message' => $this->chat->messagePayload($message, $record),
            'conversation' => $this->chat->conversationPayload($record, 'patient'),
        ], 201);
    }

    private function find(Patient $patient, int $id): CenterConversation
    {
        $conversation = CenterConversation::query()
            ->with(['company:id,name', 'patient:id,name'])
            ->where('patient_id', $patient->id)
            ->whereKey($id)
            ->first();

        abort_unless($conversation, 404, 'Conversation not found.');

        return $conversation;
    }
}
