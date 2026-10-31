<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Mail\PasswordResetOtpMail;
use App\Models\PasswordResetOtp;
use App\Models\User;
use App\Services\AuditService;
use App\Services\PlatformBrandingService;
use App\Support\ContactRules;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class PasswordResetController extends Controller
{
    private const OTP_TTL_MINUTES = 10;

    private const RESET_TTL_MINUTES = 15;

    private const RESEND_COOLDOWN_SECONDS = 60;

    private const MAX_ATTEMPTS = 5;

    public function sendOtp(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => ContactRules::email(),
        ]);

        $email = $this->normalizeEmail($validated['email']);
        $user = $this->findUser($email);

        if (! $user) {
            throw ValidationException::withMessages([
                'email' => ['No account found with this email.'],
            ]);
        }

        if (! $user->status) {
            throw ValidationException::withMessages([
                'email' => ['This account is disabled.'],
            ]);
        }

        $recent = PasswordResetOtp::query()
            ->where('email', $email)
            ->whereNull('used_at')
            ->where('created_at', '>=', now()->subSeconds(self::RESEND_COOLDOWN_SECONDS))
            ->latest('id')
            ->first();

        if ($recent) {
            $elapsed = now()->getTimestamp() - $recent->created_at->getTimestamp();
            $wait = max(1, self::RESEND_COOLDOWN_SECONDS - $elapsed);

            return response()->json([
                'message' => 'Please wait before requesting another code.',
                'retry_after' => $wait,
            ], 429);
        }

        $code = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);

        PasswordResetOtp::query()
            ->where('email', $email)
            ->whereNull('used_at')
            ->update(['used_at' => now()]);

        $otp = PasswordResetOtp::create([
            'email' => $email,
            'code_hash' => Hash::make($code),
            'expires_at' => now()->addMinutes(self::OTP_TTL_MINUTES),
        ]);

        try {
            $brand = app(PlatformBrandingService::class)->chrome();
            Mail::to($user->email)->send(new PasswordResetOtpMail(
                $user,
                $code,
                self::OTP_TTL_MINUTES,
                $brand['name'] ?? config('app.name', 'ApnaMedi'),
            ));
        } catch (\Throwable $exception) {
            $otp->delete();
            Log::error('Password reset OTP mail failed', [
                'email' => $email,
                'error' => $exception->getMessage(),
            ]);

            return response()->json([
                'message' => 'We could not send the verification email. Please try again.',
            ], 500);
        }

        return response()->json([
            'message' => 'A verification code was sent to your email.',
            'expires_in' => self::OTP_TTL_MINUTES * 60,
        ]);
    }

    public function verifyOtp(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'otp' => ['required', 'string', 'regex:/^\d{6}$/'],
            'email' => ContactRules::email(),
        ]);

        $email = $this->normalizeEmail($validated['email']);
        $record = $this->activeOtp($email);

        if (! $record) {
            throw ValidationException::withMessages([
                'otp' => ['This code is invalid or has expired. Request a new one.'],
            ]);
        }

        if ($record->attempts >= self::MAX_ATTEMPTS) {
            $record->update(['used_at' => now()]);

            throw ValidationException::withMessages([
                'otp' => ['Too many incorrect attempts. Request a new code.'],
            ]);
        }

        if (! Hash::check($validated['otp'], $record->code_hash)) {
            $record->increment('attempts');

            if ($record->attempts >= self::MAX_ATTEMPTS) {
                $record->update(['used_at' => now()]);

                throw ValidationException::withMessages([
                    'otp' => ['Too many incorrect attempts. Request a new code.'],
                ]);
            }

            $left = self::MAX_ATTEMPTS - $record->attempts;

            throw ValidationException::withMessages([
                'otp' => ["That code is incorrect. {$left} attempt".($left === 1 ? '' : 's').' left.'],
            ]);
        }

        $token = Str::random(64);
        $record->update([
            'verified_at' => now(),
            'reset_token_hash' => Hash::make($token),
            'reset_expires_at' => now()->addMinutes(self::RESET_TTL_MINUTES),
        ]);

        return response()->json([
            'message' => 'Code verified. Choose a new password.',
            'reset_token' => $token,
        ]);
    }

    public function resetPassword(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'reset_token' => ['required', 'string', 'size:64'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
            'email' => ContactRules::email(),
        ]);

        $email = $this->normalizeEmail($validated['email']);
        $user = $this->findUser($email);
        $record = PasswordResetOtp::query()
            ->where('email', $email)
            ->whereNotNull('verified_at')
            ->whereNull('used_at')
            ->where('reset_expires_at', '>', now())
            ->latest('id')
            ->first();

        $tokenMatches = $record
            && $record->reset_token_hash
            && Hash::check($validated['reset_token'], $record->reset_token_hash);

        if (! $user || ! $user->status || ! $tokenMatches) {
            throw ValidationException::withMessages([
                'reset_token' => ['This reset session has expired. Start again.'],
            ]);
        }

        $user->update(['password' => $validated['password']]);
        $user->tokens()->delete();
        $record->update(['used_at' => now()]);

        PasswordResetOtp::query()
            ->where('email', $email)
            ->whereNull('used_at')
            ->update(['used_at' => now()]);

        app(AuditService::class)->logAuth('password_reset', $user);

        return response()->json([
            'message' => 'Password updated. You can sign in with your new password.',
        ]);
    }

    private function normalizeEmail(string $email): string
    {
        return strtolower(trim($email));
    }

    private function findUser(string $email): ?User
    {
        return User::query()
            ->whereRaw('LOWER(email) = ?', [$email])
            ->first();
    }

    private function activeOtp(string $email): ?PasswordResetOtp
    {
        return PasswordResetOtp::query()
            ->where('email', $email)
            ->whereNull('used_at')
            ->whereNull('verified_at')
            ->where('expires_at', '>', now())
            ->latest('id')
            ->first();
    }
}
