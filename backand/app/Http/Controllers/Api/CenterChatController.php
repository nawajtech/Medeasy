<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CenterConversation;
use App\Models\CenterMessage;
use App\Models\User;
use App\Services\CenterChatService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CenterChatController extends Controller
{
    public function __construct(private CenterChatService $chat) {}

    public function index(Request $request): JsonResponse
    {
        $companyId = $this->companyId($request, false);
        if (! $companyId) {
            return response()->json(['data' => []]);
        }

        $this->chat->touchPresence('staff', $request->user()->id, $companyId);

        $conversations = CenterConversation::query()
            ->with(['company:id,name', 'patient:id,name'])
            ->where('company_id', $companyId)
            ->orderByDesc('last_message_at')
            ->orderByDesc('id')
            ->get();

        return response()->json([
            'data' => $this->chat->listPayloads($conversations, 'staff'),
        ]);
    }

    public function unread(Request $request): JsonResponse
    {
        $companyId = $this->companyId($request, false);
        if (! $companyId) {
            return response()->json(['unread_count' => 0]);
        }

        $this->chat->touchPresence('staff', $request->user()->id, $companyId);

        return response()->json([
            'unread_count' => $this->chat->totalUnreadForCompany($companyId),
        ]);
    }

    public function show(Request $request, int $conversation): JsonResponse
    {
        $companyId = $this->companyId($request);
        $record = $this->find($companyId, $conversation);
        $this->chat->touchPresence('staff', $request->user()->id, $companyId);

        if ($request->boolean('mark_read')) {
            $this->chat->markRead($record, 'staff');
            $record->refresh();
        }

        return response()->json([
            'conversation' => $this->chat->conversationPayload($record, 'staff'),
            'messages' => $this->chat->messages($record, (int) $request->query('after', 0)),
        ]);
    }

    public function send(Request $request, int $conversation): JsonResponse
    {
        $companyId = $this->companyId($request);
        $record = $this->find($companyId, $conversation);

        $data = $request->validate([
            'body' => ['nullable', 'string', 'max:2000'],
            'image' => ['nullable', 'image', 'mimes:jpeg,jpg,png,gif,webp', 'max:5120'],
        ]);

        abort_if(
            trim((string) ($data['body'] ?? '')) === '' && ! $request->hasFile('image'),
            422,
            'Message cannot be empty.'
        );

        /** @var User $user */
        $user = $request->user();
        $message = $this->chat->send(
            $record,
            CenterMessage::TYPE_STAFF,
            $user,
            $data['body'] ?? null,
            $request->file('image')
        );
        $this->chat->touchPresence('staff', $user->id, $companyId);
        $record->refresh();

        return response()->json([
            'message' => $this->chat->messagePayload($message, $record),
            'conversation' => $this->chat->conversationPayload($record, 'staff'),
        ], 201);
    }

    private function companyId(Request $request, bool $required = true): ?int
    {
        /** @var User $user */
        $user = $request->user();
        $companyId = $user->company_id ? (int) $user->company_id : null;

        if (! $companyId) {
            abort_if($required, 403, 'Centre chat is available to diagnostic centre staff.');

            return null;
        }

        $company = $user->company;
        abort_unless($company && $this->chat->isDiagnosticCentre($company), 403, 'Centre chat is available to diagnostic centres.');

        return $companyId;
    }

    private function find(int $companyId, int $id): CenterConversation
    {
        $conversation = CenterConversation::query()
            ->with(['company:id,name', 'patient:id,name'])
            ->where('company_id', $companyId)
            ->whereKey($id)
            ->first();

        abort_unless($conversation, 404, 'Conversation not found.');

        return $conversation;
    }
}
