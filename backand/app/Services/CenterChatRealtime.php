<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class CenterChatRealtime
{
    public function emit(int $conversationId, string $event, array $payload): void
    {
        $base = rtrim((string) config('services.center_chat_socket.url', ''), '/');
        $secret = (string) config('services.center_chat_socket.secret', '');

        if ($base === '' || $secret === '') {
            return;
        }

        try {
            Http::timeout(2)
                ->withHeaders(['X-Center-Chat-Secret' => $secret])
                ->post($base.'/emit', [
                    'conversation_id' => $conversationId,
                    'event' => $event,
                    'payload' => $payload,
                ]);
        } catch (\Throwable $e) {
            Log::warning('Center chat socket emit failed', [
                'conversation_id' => $conversationId,
                'event' => $event,
                'error' => $e->getMessage(),
            ]);
        }
    }
}
