<?php

namespace App\Http\Controllers\Api\Partner;

use App\Http\Controllers\Controller;
use App\Mail\PartnerPasswordResetOtpMail;
use App\Models\Partner;
use App\Models\PasswordResetOtp;
use App\Services\PlatformBrandingService;
use App\Support\ContactRules;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class PartnerAuthController extends Controller
{
    private const OTP_TTL_MINUTES = 10;

    private const RESEND_COOLDOWN_SECONDS = 60;

    private const MAX_ATTEMPTS = 5;

    public function register(Request $request): JsonResponse
    {
        $request->merge(['phone' => trim((string) $request->input('phone', ''))]);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'type' => ['required', Rule::in(Partner::TYPES)],
            'phone' => [...ContactRules::phone(), Rule::unique('partners', 'phone')],
            'email' => [...ContactRules::email(), Rule::unique('partners', 'email')],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
            'address' => ['required', 'string', 'max:1000'],
            'city' => ['required', 'string', 'max:100'],
            'state' => ['required', 'string', 'max:100'],
            'professional_details' => ['nullable', 'string', 'max:2000'],
        ]);

        $partner = Partner::create([
            ...$validated,
            'status' => true,
        ]);

        $token = $partner->createToken('partner-portal')->plainTextToken;

        return response()->json([
            'token' => $token,
            'partner' => $this->partnerPayload($partner),
        ], 201);
    }

    public function login(Request $request): JsonResponse
    {
        $credentials = $request->validate([
            'email' => ContactRules::email(),
            'password' => ['required', 'string'],
        ]);

        $partner = Partner::where('email', $credentials['email'])->first();

        if (! $partner || ! Hash::check($credentials['password'], $partner->password)) {
            throw ValidationException::withMessages([
                'email' => ['Invalid email or password.'],
            ]);
        }

        if (! $partner->status) {
            throw ValidationException::withMessages([
                'email' => ['This account is disabled.'],
            ]);
        }

        $token = $partner->createToken('partner-portal')->plainTextToken;

        return response()->json([
            'token' => $token,
            'partner' => $this->partnerPayload($partner),
        ]);
    }

    public function me(Request $request): JsonResponse
    {
        /** @var Partner $partner */
        $partner = $request->user();

        return response()->json([
            'partner' => $this->partnerPayload($partner),
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()?->delete();

        return response()->json(['message' => 'Logged out successfully']);
    }

    public function updateProfile(Request $request): JsonResponse
    {
        /** @var Partner $partner */
        $partner = $request->user();
        $request->merge(['phone' => trim((string) $request->input('phone', $partner->phone))]);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'type' => ['required', Rule::in(Partner::TYPES)],
            'email' => [...ContactRules::email(), Rule::unique('partners', 'email')->ignore($partner->id)],
            'phone' => [...ContactRules::phone(), Rule::unique('partners', 'phone')->ignore($partner->id)],
            'address' => ['required', 'string', 'max:1000'],
            'city' => ['required', 'string', 'max:100'],
            'state' => ['required', 'string', 'max:100'],
            'professional_details' => ['nullable', 'string', 'max:2000'],
        ]);

        $partner->update($validated);

        return response()->json([
            'partner' => $this->partnerPayload($partner->fresh()),
        ]);
    }

    public function changePassword(Request $request): JsonResponse
    {
        /** @var Partner $partner */
        $partner = $request->user();

        $validated = $request->validate([
            'current_password' => ['required', 'string'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        if (! Hash::check($validated['current_password'], $partner->password)) {
            throw ValidationException::withMessages([
                'current_password' => ['Current password is incorrect.'],
            ]);
        }

        $partner->update(['password' => $validated['password']]);

        return response()->json(['message' => 'Password updated.']);
    }

    public function sendForgotPasswordOtp(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => ContactRules::email(),
        ]);

        $email = strtolower(trim($validated['email']));
        $partner = Partner::query()
            ->whereRaw('LOWER(email) = ?', [$email])
            ->first();

        if (! $partner) {
            // Do not reveal whether the email exists.
            return response()->json([
                'message' => 'If this email is registered, a verification code has been sent.',
                'expires_in' => self::OTP_TTL_MINUTES * 60,
            ]);
        }

        if (! $partner->status) {
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
            Mail::to($partner->email)->send(new PartnerPasswordResetOtpMail(
                $partner,
                $code,
                self::OTP_TTL_MINUTES,
                $brand['name'] ?? config('app.name', 'ApnaMedi'),
            ));
        } catch (\Throwable $exception) {
            $otp->delete();
            Log::error('Partner password reset OTP mail failed', [
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

    public function resetPassword(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => ContactRules::email(),
            'otp' => ['required', 'string', 'regex:/^\d{6}$/'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        $email = strtolower(trim($validated['email']));
        $record = PasswordResetOtp::query()
            ->where('email', $email)
            ->whereNull('used_at')
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
            $record->update(['used_at' => now()]);

            throw ValidationException::withMessages([
                'otp' => ['Too many incorrect attempts. Request a new code.'],
            ]);
        }

        if (! Hash::check($validated['otp'], $record->code_hash)) {
            $record->increment('attempts');
            $left = self::MAX_ATTEMPTS - (int) $record->fresh()->attempts;

            if ($left <= 0) {
                $record->update(['used_at' => now()]);

                throw ValidationException::withMessages([
                    'otp' => ['Too many incorrect attempts. Request a new code.'],
                ]);
            }

            throw ValidationException::withMessages([
                'otp' => ["That code is incorrect. {$left} attempt".($left === 1 ? '' : 's').' left.'],
            ]);
        }

        $partner = Partner::query()
            ->whereRaw('LOWER(email) = ?', [$email])
            ->first();

        if (! $partner) {
            throw ValidationException::withMessages([
                'email' => ['No partner account found for this email.'],
            ]);
        }

        $partner->update(['password' => $validated['password']]);
        $partner->tokens()->delete();
        $record->update([
            'verified_at' => now(),
            'used_at' => now(),
        ]);

        PasswordResetOtp::query()
            ->where('email', $email)
            ->whereNull('used_at')
            ->update(['used_at' => now()]);

        return response()->json(['message' => 'Password reset successfully. You can sign in now.']);
    }

    private function partnerPayload(Partner $partner): array
    {
        return [
            'id' => $partner->id,
            'name' => $partner->name,
            'type' => $partner->type,
            'phone' => $partner->phone,
            'email' => $partner->email,
            'address' => $partner->address,
            'city' => $partner->city,
            'state' => $partner->state,
            'professional_details' => $partner->professional_details,
            'status' => $partner->status,
        ];
    }
}
