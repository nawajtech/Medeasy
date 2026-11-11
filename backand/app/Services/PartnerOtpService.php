<?php

namespace App\Services;

use App\Models\PartnerOtp;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;

class PartnerOtpService
{
    private const TTL_MINUTES = 10;

    private const MAX_ATTEMPTS = 5;

    public function send(string $phone, string $purpose = 'register'): array
    {
        $phone = trim($phone);

        PartnerOtp::query()
            ->where('phone', $phone)
            ->where('purpose', $purpose)
            ->whereNull('verified_at')
            ->delete();

        $code = (string) random_int(100000, 999999);

        PartnerOtp::create([
            'phone' => $phone,
            'purpose' => $purpose,
            'code_hash' => Hash::make($code),
            'expires_at' => now()->addMinutes(self::TTL_MINUTES),
        ]);

        // No SMS provider wired yet — log for ops; expose in debug for local testing.
        Log::info('Partner phone OTP generated', [
            'phone' => $phone,
            'purpose' => $purpose,
            'otp' => $code,
        ]);

        $payload = [
            'message' => 'OTP sent to your mobile number.',
            'expires_in' => self::TTL_MINUTES * 60,
        ];

        if (config('app.debug')) {
            $payload['dev_otp'] = $code;
        }

        return $payload;
    }

    public function verify(string $phone, string $otp, string $purpose = 'register'): void
    {
        $phone = trim($phone);

        $record = PartnerOtp::query()
            ->where('phone', $phone)
            ->where('purpose', $purpose)
            ->whereNull('verified_at')
            ->where('expires_at', '>', now())
            ->latest('id')
            ->first();

        if (! $record) {
            throw ValidationException::withMessages([
                'otp' => ['This code is invalid or has expired. Request a new one.'],
            ]);
        }

        if ($record->attempts >= self::MAX_ATTEMPTS) {
            throw ValidationException::withMessages([
                'otp' => ['Too many incorrect attempts. Request a new code.'],
            ]);
        }

        if (! Hash::check($otp, $record->code_hash)) {
            $record->increment('attempts');
            $left = self::MAX_ATTEMPTS - (int) $record->fresh()->attempts;

            if ($left <= 0) {
                throw ValidationException::withMessages([
                    'otp' => ['Too many incorrect attempts. Request a new code.'],
                ]);
            }

            throw ValidationException::withMessages([
                'otp' => ["That code is incorrect. {$left} attempt".($left === 1 ? '' : 's').' left.'],
            ]);
        }

        $record->update(['verified_at' => now()]);
    }

    public function assertRecentlyVerified(string $phone, string $purpose = 'register', int $withinMinutes = 30): void
    {
        $ok = PartnerOtp::query()
            ->where('phone', trim($phone))
            ->where('purpose', $purpose)
            ->whereNotNull('verified_at')
            ->where('verified_at', '>=', now()->subMinutes($withinMinutes))
            ->exists();

        if (! $ok) {
            throw ValidationException::withMessages([
                'phone' => ['Please verify your mobile number with OTP before continuing.'],
            ]);
        }
    }
}
