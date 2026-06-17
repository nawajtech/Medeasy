<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AppNotification;
use App\Services\FcmService;
use App\Services\NotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use RuntimeException;

class NotificationController extends Controller
{
    public function __construct(
        private FcmService $fcm,
        private NotificationService $notifications
    ) {}

    public function index(Request $request): JsonResponse
    {
        $items = AppNotification::where('user_id', $request->user()->id)
            ->orderByDesc('created_at')
            ->limit(50)
            ->get()
            ->map(fn (AppNotification $item) => $this->formatNotification($item));

        return response()->json($items);
    }

    public function markAsRead(Request $request, string $id): JsonResponse
    {
        $notification = AppNotification::where('user_id', $request->user()->id)->findOrFail($id);
        $notification->markAsRead();

        return response()->json($this->formatNotification($notification->fresh()));
    }

    public function markAllAsRead(Request $request): JsonResponse
    {
        AppNotification::where('user_id', $request->user()->id)
            ->whereNull('read_at')
            ->update(['read_at' => now()]);

        return response()->json(['message' => 'All notifications marked as read.']);
    }

    public function registerToken(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'token' => ['required', 'string', 'max:1000'],
            'device_name' => ['nullable', 'string', 'max:255'],
        ]);

        $record = $this->fcm->registerToken(
            $request->user(),
            $validated['token'],
            $validated['device_name'] ?? null
        );

        return response()->json([
            'message' => 'FCM token registered.',
            'id' => $record->id,
            'user_id' => $record->user_id,
        ]);
    }

    public function removeToken(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'token' => ['required', 'string', 'max:1000'],
        ]);

        $this->fcm->removeToken($validated['token']);

        return response()->json(['message' => 'FCM token removed.']);
    }

    public function test(Request $request): JsonResponse
    {
        if (! $this->fcm->isConfigured()) {
            return response()->json([
                'message' => 'Firebase is not configured on the server. Add FIREBASE_CREDENTIALS to .env.',
            ], 503);
        }

        try {
            $notification = $this->notifications->notifyUser(
                $request->user(),
                'MedEasy Test',
                'Push notifications are working!'
            );
        } catch (RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 500);
        }

        return response()->json([
            'message' => 'Test notification sent.',
            'notification' => $this->formatNotification($notification),
        ]);
    }

    private function formatNotification(AppNotification $notification): array
    {
        return [
            'id' => (string) $notification->id,
            'title' => $notification->title,
            'body' => $notification->body,
            'data' => $notification->data ?? [],
            'read' => $notification->read_at !== null,
            'receivedAt' => $notification->created_at?->toIso8601String(),
        ];
    }
}
