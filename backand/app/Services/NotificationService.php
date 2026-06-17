<?php

namespace App\Services;

use App\Models\AppNotification;
use App\Models\User;
use Illuminate\Support\Facades\Log;

class NotificationService
{
    public function __construct(
        private FcmService $fcm
    ) {}

    public function notifyUser(User $user, string $title, string $body, array $data = []): AppNotification
    {
        $notification = AppNotification::create([
            'user_id' => $user->id,
            'title' => $title,
            'body' => $body,
            'data' => $data,
        ]);

        if ($this->fcm->isConfigured()) {
            try {
                $this->fcm->sendToUser($user, $title, $body, [
                    ...$data,
                    'notification_id' => (string) $notification->id,
                ]);
            } catch (\Throwable $e) {
                Log::warning('FCM push failed but notification was saved', [
                    'user_id' => $user->id,
                    'notification_id' => $notification->id,
                    'error' => $e->getMessage(),
                ]);
            }
        }

        return $notification;
    }
}
