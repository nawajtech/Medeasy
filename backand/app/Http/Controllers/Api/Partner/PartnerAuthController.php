<?php

namespace App\Http\Controllers\Api\Partner;

use App\Http\Controllers\Controller;
use App\Models\Partner;
use App\Models\PartnerOtp;
use App\Services\PartnerOtpService;
use App\Support\ContactRules;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class PartnerAuthController extends Controller
{
    public function __construct(private PartnerOtpService $otp) {}

    public function sendRegisterOtp(Request $request): JsonResponse
    {
        $request->merge(['phone' => trim((string) $request->input('phone', ''))]);

        $validated = $request->validate([
            'phone' => [...ContactRules::phone(), Rule::unique('partners', 'phone')],
        ]);

        return response()->json($this->otp->send($validated['phone'], 'register'));
    }

    public function verifyRegisterOtp(Request $request): JsonResponse
    {
        $request->merge(['phone' => trim((string) $request->input('phone', ''))]);

        $validated = $request->validate([
            'phone' => ContactRules::phone(),
            'otp' => ['required', 'string', 'regex:/^\d{6}$/'],
        ]);

        $this->otp->verify($validated['phone'], $validated['otp'], 'register');

        return response()->json(['message' => 'Mobile number verified.']);
    }

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

        $this->otp->assertRecentlyVerified($validated['phone'], 'register');

        $partner = Partner::create([
            ...$validated,
            'phone_verified_at' => now(),
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

        if ($validated['phone'] !== $partner->phone) {
            $this->otp->assertRecentlyVerified($validated['phone'], 'register');
            $validated['phone_verified_at'] = now();
        }

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
        $request->merge(['phone' => trim((string) $request->input('phone', ''))]);

        $validated = $request->validate([
            'phone' => ContactRules::phone(),
        ]);

        $partner = Partner::where('phone', $validated['phone'])->first();
        if (! $partner) {
            // Do not reveal whether the phone exists.
            return response()->json([
                'message' => 'If this mobile is registered, an OTP has been sent.',
                'expires_in' => 600,
            ]);
        }

        return response()->json($this->otp->send($validated['phone'], 'reset'));
    }

    public function resetPassword(Request $request): JsonResponse
    {
        $request->merge(['phone' => trim((string) $request->input('phone', ''))]);

        $validated = $request->validate([
            'phone' => ContactRules::phone(),
            'otp' => ['required', 'string', 'regex:/^\d{6}$/'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        $this->otp->verify($validated['phone'], $validated['otp'], 'reset');

        $partner = Partner::where('phone', $validated['phone'])->first();
        if (! $partner) {
            throw ValidationException::withMessages([
                'phone' => ['No partner account found for this mobile number.'],
            ]);
        }

        $partner->update(['password' => $validated['password']]);

        PartnerOtp::query()
            ->where('phone', $validated['phone'])
            ->where('purpose', 'reset')
            ->delete();

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
            'phone_verified_at' => $partner->phone_verified_at?->toIso8601String(),
            'status' => $partner->status,
        ];
    }
}
