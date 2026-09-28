<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CenterConversation;
use App\Models\Patient;
use App\Models\User;
use App\Services\CenterChatService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Laravel\Sanctum\PersonalAccessToken;

class CenterChatRealtimeController extends Controller
{
    public function __construct(private CenterChatService $chat) {}

    /**
     * Socket.IO server calls this with the client's Bearer token
     * to confirm they may join a conversation room.
     */
    public function authorize(Request $request): JsonResponse
    {
        $data = $request->validate([
            'conversation_id' => ['required', 'integer'],
        ]);

        $plain = $request->bearerToken();
        abort_unless(is_string($plain) && $plain !== '', 401, 'Unauthenticated.');

        $accessToken = PersonalAccessToken::findToken($plain);
        abort_unless($accessToken, 401, 'Unauthenticated.');

        $actor = $accessToken->tokenable;
        abort_unless($actor, 401, 'Unauthenticated.');

        $conversation = CenterConversation::query()
            ->whereKey((int) $data['conversation_id'])
            ->first();

        abort_unless($conversation, 404, 'Conversation not found.');

        if ($actor instanceof Patient) {
            abort_unless((int) $conversation->patient_id === (int) $actor->id, 403, 'Forbidden.');

            return response()->json([
                'ok' => true,
                'actor_type' => 'patient',
                'actor_id' => (int) $actor->id,
                'conversation_id' => (int) $conversation->id,
            ]);
        }

        if ($actor instanceof User) {
            $companyId = $actor->company_id ? (int) $actor->company_id : null;
            abort_unless($companyId && (int) $conversation->company_id === $companyId, 403, 'Forbidden.');

            $company = $actor->company;
            abort_unless($company && $this->chat->isDiagnosticCentre($company), 403, 'Forbidden.');

            return response()->json([
                'ok' => true,
                'actor_type' => 'staff',
                'actor_id' => (int) $actor->id,
                'conversation_id' => (int) $conversation->id,
                'company_id' => $companyId,
            ]);
        }

        abort(403, 'Forbidden.');
    }
}
