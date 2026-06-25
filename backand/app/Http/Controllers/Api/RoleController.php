<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreRoleRequest;
use App\Http\Requests\SyncRolePermissionsRequest;
use App\Http\Requests\UpdateRoleRequest;
use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use App\Services\PermissionRegistryService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class RoleController extends Controller
{
    public function __construct(
        private readonly PermissionRegistryService $permissions,
    ) {}

    public function index(): JsonResponse
    {
        $this->assertTenantAdmin();

        $roles = Role::query()
            ->where('company_id', auth()->user()->company_id)
            ->withCount('permissions')
            ->orderBy('name')
            ->get()
            ->map(fn (Role $role) => $this->rolePayload($role));

        return response()->json($roles);
    }

    public function store(StoreRoleRequest $request): JsonResponse
    {
        $this->assertTenantAdmin();

        $role = Role::create([
            ...$request->validated(),
            'guard_name' => $this->permissions->guardName(),
            'company_id' => auth()->user()->company_id,
            'is_system' => false,
        ]);

        return response()->json($this->rolePayload($role), 201);
    }

    public function show(Role $role): JsonResponse
    {
        $this->assertTenantAdmin();
        $this->assertOwnsRole($role);

        $role->load('permissions');

        return response()->json([
            ...$this->rolePayload($role),
            'permissions' => $role->permissions->pluck('name')->values(),
        ]);
    }

    public function update(UpdateRoleRequest $request, Role $role): JsonResponse
    {
        $this->assertTenantAdmin();
        $this->assertOwnsRole($role);

        if ($role->is_system && $request->has('name') && $request->name !== $role->name) {
            return response()->json(['message' => 'System role names cannot be changed.'], 422);
        }

        $role->update($request->validated());

        return response()->json($this->rolePayload($role->fresh()));
    }

    public function destroy(Role $role): JsonResponse
    {
        $this->assertTenantAdmin();
        $this->assertOwnsRole($role);

        if (! auth()->user()->can('role.delete')) {
            abort(403);
        }

        if ($role->is_system) {
            return response()->json(['message' => 'System roles cannot be deleted.'], 422);
        }

        if ($role->users()->exists()) {
            return response()->json(['message' => 'Cannot delete a role that is assigned to users.'], 422);
        }

        $role->delete();

        return response()->json(['message' => 'Role deleted successfully.']);
    }

    public function syncPermissions(SyncRolePermissionsRequest $request, Role $role): JsonResponse
    {
        $this->assertTenantAdmin();
        $this->assertOwnsRole($role);

        $guard = $this->permissions->guardName();
        $company = auth()->user()->company;
        $allowed = collect($this->permissions->permissionNamesForCompany($company));

        $requested = collect($request->validated('permissions'));
        $invalid = $requested->diff($allowed);
        if ($invalid->isNotEmpty()) {
            return response()->json([
                'message' => 'Some permissions are not enabled for your organization.',
                'invalid' => $invalid->values(),
            ], 422);
        }

        $permissionModels = $requested
            ->map(fn (string $name) => Permission::findByName($name, $guard))
            ->all();

        $role->syncPermissions($permissionModels);

        return response()->json([
            'message' => 'Permissions updated successfully.',
            'permissions' => $role->permissions()->pluck('name'),
        ]);
    }

    public function assignable(Request $request): JsonResponse
    {
        $user = auth()->user();

        if ($user->isSuperAdmin()) {
            $companyId = (int) $request->validate([
                'company_id' => ['required', 'exists:companies,id'],
            ])['company_id'];
        } else {
            $this->assertTenantAdmin();
            $companyId = $user->company_id;
        }

        $roles = Role::query()
            ->where('company_id', $companyId)
            ->where('name', '!=', User::ROLE_SUPER_ADMIN)
            ->when(! $user->isSuperAdmin(), fn ($q) => $q->whereNotIn('name', [
                User::ROLE_COMPANY_ADMIN,
                User::ROLE_DOCTOR,
            ]))
            ->orderBy('name')
            ->get(['id', 'name', 'description', 'is_system']);

        return response()->json($roles);
    }

    private function assertTenantAdmin(): void
    {
        if (auth()->user()->isSuperAdmin()) {
            abort(403, 'Roles are managed by each organization admin, not the platform super admin.');
        }
    }

    private function assertOwnsRole(Role $role): void
    {
        if ((int) $role->company_id !== (int) auth()->user()->company_id) {
            abort(404);
        }
    }

    private function rolePayload(Role $role): array
    {
        return [
            'id' => $role->id,
            'name' => $role->name,
            'label' => config("permissions.roles.{$role->name}.label")
                ?? ucwords(str_replace('_', ' ', $role->name)),
            'description' => $role->description,
            'is_system' => $role->is_system,
            'permissions_count' => $role->permissions_count ?? $role->permissions()->count(),
            'guard_name' => $role->guard_name,
            'company_id' => $role->company_id,
        ];
    }
}
