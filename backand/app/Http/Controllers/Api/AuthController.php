<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use App\Models\User;
use App\Services\SubscriptionService;
use App\Services\UserRoleService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function login(Request $request, UserRoleService $userRoles): JsonResponse
    {
        $credentials = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        $user = User::where('email', $credentials['email'])->first();

        if (! $user || ! Hash::check($credentials['password'], $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['Invalid email or password.'],
            ]);
        }

        if (! $user->status) {
            throw ValidationException::withMessages([
                'email' => ['This account is disabled.'],
            ]);
        }

        $this->refreshTenantUserRole($user, $userRoles);

        $user->update(['last_login_at' => now()]);
        $user->loadMissing('roles');
        $token = $user->createToken('medeasy-api')->plainTextToken;

        return response()->json([
            'token' => $token,
            'user' => $this->userPayload($user->load(['company', 'doctor.department'])),
        ]);
    }

    public function me(Request $request, UserRoleService $userRoles): JsonResponse
    {
        $user = $request->user();
        $this->refreshTenantUserRole($user, $userRoles);
        $user->load(['company', 'doctor.department']);

        return response()->json([
            'user' => $this->userPayload($user),
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()?->delete();

        return response()->json(['message' => 'Logged out successfully']);
    }

    public function updateProfile(Request $request): JsonResponse
    {
        $user = $request->user();

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', Rule::unique('users', 'email')->ignore($user->id)],
            'phone' => ['nullable', 'string', 'max:20', Rule::unique('users', 'phone')->ignore($user->id)],
        ]);

        $user->update($validated);

        return response()->json([
            'message' => 'Profile updated successfully.',
            'user' => $this->userPayload($user->fresh(['company', 'doctor.department'])),
        ]);
    }

    public function changePassword(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'current_password' => ['required', 'string'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        $user = $request->user();

        if (! Hash::check($validated['current_password'], $user->password)) {
            throw ValidationException::withMessages([
                'current_password' => ['Current password is incorrect.'],
            ]);
        }

        $user->update(['password' => $validated['password']]);

        return response()->json(['message' => 'Password changed successfully.']);
    }

    private function refreshTenantUserRole(User $user, UserRoleService $userRoles): void
    {
        if (! $user->company_id || $user->isSuperAdmin() || ! $user->role) {
            return;
        }

        try {
            $userRoles->assignRole($user, $user->role);
        } catch (\Throwable) {
            // Role may not exist yet for this tenant.
        }

        $user->unsetRelation('roles');
        $user->unsetRelation('permissions');
    }

    private function userPayload(User $user): array
    {
        $payload = [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'phone' => $user->phone,
            'role' => $user->role,
            'roles' => $user->getRoleNames(),
            'permissions' => $user->permissionNames(),
            'status' => $user->status,
            'company_id' => $user->company_id,
            'company' => $user->company,
            'currency' => $this->resolveCurrency($user),
            'doctor_id' => $user->doctor?->id,
            'doctor' => $user->doctor,
        ];

        if ($user->company) {
            $payload['subscription'] = app(SubscriptionService::class)
                ->subscriptionSummary($user->company);
        }

        return $payload;
    }

    /** Active display currency for the user's organisation (defaults to INR). */
    private function resolveCurrency(User $user): string
    {
        $default = config('theme.currency', 'INR');

        if (! $user->company_id) {
            return $default;
        }

        $value = Setting::withoutGlobalScopes()
            ->where('company_id', $user->company_id)
            ->where('key', 'currency')
            ->value('value');

        return $value ?: $default;
    }
}
