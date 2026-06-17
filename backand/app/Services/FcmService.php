<?php

namespace App\Services;

use App\Models\FcmToken;
use App\Models\User;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use RuntimeException;

class FcmService
{
    private ?array $serviceAccount = null;

    public function isConfigured(): bool
    {
        $path = $this->credentialsPath();

        return $path !== null && is_readable($path);
    }

    private function credentialsPath(): ?string
    {
        $path = config('services.firebase.credentials');

        if (! is_string($path) || $path === '') {
            return null;
        }

        if (! str_starts_with($path, DIRECTORY_SEPARATOR) && ! preg_match('/^[A-Za-z]:[\\\\\\/]/', $path)) {
            $path = base_path($path);
        }

        return $path;
    }

    public function registerToken(User $user, string $token, ?string $deviceName = null): FcmToken
    {
        return FcmToken::updateOrCreate(
            ['token' => $token],
            [
                'user_id' => $user->id,
                'device_name' => $deviceName,
            ]
        );
    }

    public function removeToken(string $token): void
    {
        FcmToken::where('token', $token)->delete();
    }

    /**
     * @return array{sent: int, failed: int, removed: int}
     */
    public function sendToUser(User $user, string $title, string $body, array $data = []): array
    {
        $tokens = $user->fcmTokens()->pluck('token')->all();

        return $this->sendToTokens($tokens, $title, $body, $data);
    }

    /**
     * @param  list<string>  $tokens
     * @return array{sent: int, failed: int, removed: int}
     */
    public function sendToTokens(array $tokens, string $title, string $body, array $data = []): array
    {
        if (! $this->isConfigured()) {
            throw new RuntimeException('Firebase is not configured. Set FIREBASE_CREDENTIALS in .env.');
        }

        $tokens = array_values(array_unique(array_filter($tokens)));
        $result = ['sent' => 0, 'failed' => 0, 'removed' => 0];

        foreach ($tokens as $token) {
            try {
                $this->sendToToken($token, $title, $body, $data);
                $result['sent']++;
            } catch (RuntimeException $e) {
                $result['failed']++;

                if ($this->isInvalidTokenError($e->getMessage())) {
                    FcmToken::where('token', $token)->delete();
                    $result['removed']++;
                }

                Log::warning('FCM send failed', [
                    'token' => substr($token, 0, 20).'...',
                    'error' => $e->getMessage(),
                ]);
            }
        }

        return $result;
    }

    public function sendToToken(string $token, string $title, string $body, array $data = []): void
    {
        $projectId = config('services.firebase.project_id');
        $accessToken = $this->getAccessToken();

        $payload = [
            'message' => [
                'token' => $token,
                'notification' => [
                    'title' => $title,
                    'body' => $body,
                ],
                'data' => collect($data)->map(fn ($value) => (string) $value)->all(),
            ],
        ];

        $response = Http::withToken($accessToken)
            ->acceptJson()
            ->post("https://fcm.googleapis.com/v1/projects/{$projectId}/messages:send", $payload);

        if ($response->failed()) {
            throw new RuntimeException($response->json('error.message') ?? $response->body());
        }
    }

    private function isInvalidTokenError(string $message): bool
    {
        return str_contains($message, 'NOT_FOUND')
            || str_contains($message, 'UNREGISTERED')
            || str_contains($message, 'INVALID_ARGUMENT');
    }

    private function getAccessToken(): string
    {
        $response = Http::asForm()->post('https://oauth2.googleapis.com/token', [
            'grant_type' => 'urn:ietf:params:oauth:grant-type:jwt-bearer',
            'assertion' => $this->createJwt(),
        ]);

        if ($response->failed()) {
            throw new RuntimeException('Unable to authenticate with Firebase: '.$response->body());
        }

        return $response->json('access_token');
    }

    private function createJwt(): string
    {
        $account = $this->serviceAccount();
        $now = time();

        $header = $this->base64UrlEncode(json_encode(['alg' => 'RS256', 'typ' => 'JWT']));
        $claims = $this->base64UrlEncode(json_encode([
            'iss' => $account['client_email'],
            'scope' => 'https://www.googleapis.com/auth/firebase.messaging',
            'aud' => 'https://oauth2.googleapis.com/token',
            'iat' => $now,
            'exp' => $now + 3600,
        ]));

        $unsigned = "{$header}.{$claims}";
        $signature = '';

        openssl_sign(
            $unsigned,
            $signature,
            $account['private_key'],
            OPENSSL_ALGO_SHA256
        );

        return $unsigned.'.'.$this->base64UrlEncode($signature);
    }

    private function serviceAccount(): array
    {
        if ($this->serviceAccount !== null) {
            return $this->serviceAccount;
        }

        $path = $this->credentialsPath();
        if ($path === null) {
            throw new RuntimeException('Firebase credentials path is not configured.');
        }

        $json = file_get_contents($path);
        $account = json_decode($json, true);

        if (! is_array($account) || empty($account['client_email']) || empty($account['private_key'])) {
            throw new RuntimeException('Invalid Firebase service account JSON.');
        }

        return $this->serviceAccount = $account;
    }

    private function base64UrlEncode(string $value): string
    {
        return rtrim(strtr(base64_encode($value), '+/', '-_'), '=');
    }
}
