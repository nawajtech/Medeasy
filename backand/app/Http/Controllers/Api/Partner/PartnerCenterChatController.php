<?php

namespace App\Http\Controllers\Api\Partner;

use App\Http\Controllers\Controller;
use App\Models\CenterConversation;
use App\Models\CenterMessage;
use App\Models\Company;
use App\Models\Partner;
use App\Models\ReferralPartner;
use App\Services\CenterChatService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Partner portal side of centre chat: a partner talks to the staff
 * of a diagnostic centre.
 */
class PartnerCenterChatController extends Controller
{
    public function __construct(private CenterChatService $chat) {}

    public function index(Request $request): JsonResponse
    {
        /** @var Partner $partner */
        $partner = $request->user();
        $this->chat->touchPresence('partner', $partner->id, null);

        $conversations = CenterConversation::query()
            ->with(['company:id,name', 'partner:id,name,type'])
            ->where('partner_id', $partner->id)
            ->orderByDesc('last_message_at')
            ->orderByDesc('id')
            ->get();

        return response()->json([
            'data' => $this->chat->listPayloads($conversations, 'partner'),
        ]);
    }

    public function unread(Request $request): JsonResponse
    {
        /** @var Partner $partner */
        $partner = $request->user();
        $this->chat->touchPresence('partner', $partner->id, null);

        return response()->json([
            'unread_count' => $this->chat->totalUnreadForPartner($partner->id),
        ]);
    }

    public function start(Request $request): JsonResponse
    {
        /** @var Partner $partner */
        $partner = $request->user();

        $data = $request->validate([
            'company_id' => ['required', 'integer'],
        ]);

        $company = $this->resolveCentreForPartner($partner, (int) $data['company_id']);
        $conversation = $this->chat->openForPartner($partner, $company);
        $this->chat->touchPresence('partner', $partner->id, null);
        $this->chat->markRead($conversation, 'partner');
        $conversation->refresh();

        return response()->json([
            'conversation' => $this->chat->conversationPayload($conversation, 'partner'),
            'messages' => $this->chat->messages($conversation),
        ]);
    }

    public function show(Request $request, int $conversation): JsonResponse
    {
        /** @var Partner $partner */
        $partner = $request->user();
        $record = $this->find($partner, $conversation);
        $this->chat->touchPresence('partner', $partner->id, null);

        if ($request->boolean('mark_read')) {
            $this->chat->markRead($record, 'partner');
            $record->refresh();
        }

        return response()->json([
            'conversation' => $this->chat->conversationPayload($record, 'partner'),
            'messages' => $this->chat->messages($record, (int) $request->query('after', 0)),
        ]);
    }

    public function send(Request $request, int $conversation): JsonResponse
    {
        /** @var Partner $partner */
        $partner = $request->user();
        $record = $this->find($partner, $conversation);

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
            CenterMessage::TYPE_PARTNER,
            null,
            $data['body'] ?? null,
            $image
        );
        $this->chat->touchPresence('partner', $partner->id, null);
        $record->refresh();

        return response()->json([
            'message' => $this->chat->messagePayload($message, $record),
            'conversation' => $this->chat->conversationPayload($record, 'partner'),
        ], 201);
    }

    public function destroy(Request $request, int $conversation): JsonResponse
    {
        /** @var Partner $partner */
        $partner = $request->user();
        $record = $this->find($partner, $conversation);
        $this->chat->softDelete($record);

        return response()->json(['message' => 'Chat deleted.']);
    }

    /**
     * A partner may chat with a centre they are partnered with, or with
     * any centre that is open to partner discovery (e.g. to ask before
     * sending a partnership request).
     */
    private function resolveCentreForPartner(Partner $partner, int $companyId): Company
    {
        $company = $this->chat->resolveCentre($companyId);

        $partnered = ReferralPartner::withoutGlobalScopes()
            ->where('partner_account_id', $partner->id)
            ->where('company_id', $company->id)
            ->where('status', 'active')
            ->exists();

        abort_unless(
            $partnered || $company->partner_discovery_enabled,
            404,
            'Diagnostic centre not found.'
        );

        return $company;
    }

    private function find(Partner $partner, int $id): CenterConversation
    {
        $conversation = CenterConversation::query()
            ->with(['company:id,name', 'partner:id,name,type'])
            ->where('partner_id', $partner->id)
            ->whereKey($id)
            ->first();

        abort_unless($conversation, 404, 'Conversation not found.');

        return $conversation;
    }
}
