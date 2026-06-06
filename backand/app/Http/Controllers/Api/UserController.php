<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Concerns\HandlesTenancy;
use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class UserController extends Controller
{
    use HandlesTenancy;

    private const STAFF_ROLES = [
        User::ROLE_COMPANY_ADMIN,
        User::ROLE_STAFF,
        User::ROLE_LAB_TECHNICIAN,
        User::ROLE_RADIOLOGIST,
        User::ROLE_RECEPTIONIST,
        User::ROLE_PHARMACIST,
    ];

    public function index(Request $request): JsonResponse
    {
        $query = User::with(['doctor', 'company', 'branch'])
            ->whereIn('role', self::STAFF_ROLES)
            ->orderByDesc('created_at');

        if (! auth()->user()->isSuperAdmin()) {
            $query->where('company_id', auth()->user()->company_id);
        } elseif ($request->filled('company_id')) {
            $query->where('company_id', (int) $request->company_id);
        }

        return response()->json($query->get());
    }

    public function store(Request $request): JsonResponse
    {
        if (auth()->user()->isDoctor()) {
            abort(403, 'Doctors cannot manage users.');
        }

        $companyId = auth()->user()->isSuperAdmin()
            ? (int) $request->validate(['company_id' => ['required', 'exists:companies,id']])['company_id']
            : auth()->user()->company_id;

        $validated = $request->validate($this->rules(null, $companyId));

        $user = User::create([
            ...$validated,
            'company_id' => $companyId,
            'branch_id'  => $validated['branch_id'] ?? null,
            'status'     => $request->boolean('status', true),
        ]);

        return response()->json($user->load(['company']), 201);
    }

    public function show(string $id): JsonResponse
    {
        $user = User::with(['doctor', 'company'])->findOrFail($id);
        $this->assertStaffUserAccess($user);

        return response()->json($user);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $user = User::findOrFail($id);
        $this->assertStaffUserAccess($user);

        $validated = $request->validate($this->rules($user->id, $user->company_id));

        if (empty($validated['password'])) {
            unset($validated['password']);
        }

        $user->update($validated);

        return response()->json($user->fresh(['doctor', 'company']));
    }

    public function destroy(string $id): JsonResponse
    {
        $user = User::findOrFail($id);
        $this->assertStaffUserAccess($user);
        $user->delete();

        return response()->json(['message' => 'User deleted successfully']);
    }

    private function assertStaffUserAccess(User $user): void
    {
        if (! in_array($user->role, self::STAFF_ROLES, true)) {
            abort(404);
        }

        if (auth()->user()->isSuperAdmin()) {
            return;
        }

        if ((int) $user->company_id !== (int) auth()->user()->company_id) {
            abort(403, 'You do not have access to this user.');
        }
    }

    private function rules(?int $userId = null, ?int $companyId = null): array
    {
        $allowedRoles = auth()->user()->isSuperAdmin()
            ? self::STAFF_ROLES
            : [User::ROLE_STAFF];

        return [
            'company_id' => auth()->user()->isSuperAdmin()
                ? ['required', 'exists:companies,id']
                : ['prohibited'],
            'branch_id' => ['nullable', 'exists:branches,id'],
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', Rule::unique('users', 'email')->ignore($userId)],
            'phone' => ['nullable', 'string', 'max:20', Rule::unique('users', 'phone')->ignore($userId)],
            'password' => [$userId ? 'nullable' : 'required', 'string', 'min:8'],
            'role' => ['required', Rule::in(User::ROLES)],
            'status' => ['boolean'],
        ];
    }
}
