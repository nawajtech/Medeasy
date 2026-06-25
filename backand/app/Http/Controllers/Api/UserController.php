<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Concerns\HandlesTenancy;
use App\Http\Controllers\Controller;
use App\Models\Role;
use App\Models\User;
use App\Services\UserRoleService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class UserController extends Controller
{
    use HandlesTenancy;

    public function __construct(
        private readonly UserRoleService $userRoleService,
    ) {}

    private const STAFF_ROLES = [
        User::ROLE_COMPANY_ADMIN,
        User::ROLE_STAFF,
        User::ROLE_NURSE,
        User::ROLE_LAB_TECHNICIAN,
        User::ROLE_RADIOLOGIST,
        User::ROLE_RECEPTIONIST,
        User::ROLE_PHARMACIST,
        User::ROLE_ACCOUNTANT,
    ];

    public function index(Request $request): JsonResponse
    {
        $query = User::with(['doctor', 'company', 'branch', 'roles'])
            ->whereIn('role', self::STAFF_ROLES)
            ->where('role', '!=', User::ROLE_SUPER_ADMIN)
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
            ? (int) $request->input('company_id')
            : auth()->user()->company_id;

        $validated = $request->validate($this->rules(null, $companyId));

        $user = User::create([
            ...collect($validated)->except('role')->all(),
            'role' => $validated['role'],
            'company_id' => $companyId,
            'branch_id'  => $validated['branch_id'] ?? null,
            'status'     => $request->boolean('status', true),
        ]);

        $this->userRoleService->assignRole($user, $validated['role']);

        return response()->json($user->load(['company', 'roles']), 201);
    }

    public function show(string $id): JsonResponse
    {
        $user = User::with(['doctor', 'company', 'roles'])->findOrFail($id);
        $this->assertStaffUserAccess($user);

        return response()->json($user);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $user = User::findOrFail($id);
        $this->assertStaffUserAccess($user);
        $this->assertCanManageUser($user, 'update');

        $validated = $request->validate($this->rules($user->id, $user->company_id));

        if (empty($validated['password'])) {
            unset($validated['password']);
        }

        $role = $validated['role'] ?? $user->role;
        unset($validated['role']);
        $previousRole = $user->role;

        $user->update($validated);

        if ($role !== $previousRole) {
            $this->userRoleService->assignRole($user, $role);
        }

        return response()->json($user->fresh(['doctor', 'company', 'roles']));
    }

    public function destroy(string $id): JsonResponse
    {
        $user = User::findOrFail($id);
        $this->assertStaffUserAccess($user);
        $this->assertCanManageUser($user, 'delete');
        $user->delete();

        return response()->json(['message' => 'User deleted successfully']);
    }

    public function assignableRoles(Request $request): JsonResponse
    {
        $actor = auth()->user();

        $companyId = $actor->isSuperAdmin()
            ? (int) $request->validate(['company_id' => ['required', 'exists:companies,id']])['company_id']
            : $actor->company_id;

        if (! $companyId) {
            return response()->json([]);
        }

        $roles = Role::query()
            ->where('company_id', $companyId)
            ->where('name', '!=', User::ROLE_SUPER_ADMIN)
            ->when(! $actor->isSuperAdmin(), fn ($q) => $q->whereNotIn('name', [
                User::ROLE_COMPANY_ADMIN,
                User::ROLE_DOCTOR,
            ]))
            ->orderBy('name')
            ->get(['id', 'name', 'description', 'is_system']);

        return response()->json($roles);
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

    /** Tenant admins manage staff only — not other organization administrators. */
    private function assertCanManageUser(User $user, string $action = 'update'): void
    {
        $actor = auth()->user();

        if ($actor->isSuperAdmin() || ! $user->isCompanyAdmin()) {
            return;
        }

        if ($action === 'delete') {
            abort(403, 'Only the platform super admin can remove organization administrators.');
        }

        if ($user->id !== $actor->id) {
            abort(403, 'Only the platform super admin can manage organization administrators.');
        }
    }

    private function allowedRoleNames(?int $companyId = null): array
    {
        $companyId = $companyId ?? auth()->user()->company_id;

        if (! $companyId) {
            return [];
        }

        $query = Role::query()
            ->where('company_id', $companyId)
            ->where('name', '!=', User::ROLE_SUPER_ADMIN);

        if (! auth()->user()->isSuperAdmin()) {
            $query->whereNotIn('name', [User::ROLE_COMPANY_ADMIN, User::ROLE_DOCTOR]);
        }

        return $query->pluck('name')->all();
    }

    private function rules(?int $userId = null, ?int $companyId = null): array
    {
        $allowedRoles = $this->allowedRoleNames($companyId);

        return [
            'company_id' => auth()->user()->isSuperAdmin()
                ? ['required', 'exists:companies,id']
                : ['prohibited'],
            'branch_id' => ['nullable', 'exists:branches,id'],
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', Rule::unique('users', 'email')->ignore($userId)],
            'phone' => ['nullable', 'string', 'max:20', Rule::unique('users', 'phone')->ignore($userId)],
            'password' => [$userId ? 'nullable' : 'required', 'string', 'min:8'],
            'role' => ['required', Rule::in($allowedRoles)],
            'status' => ['boolean'],
        ];
    }
}
