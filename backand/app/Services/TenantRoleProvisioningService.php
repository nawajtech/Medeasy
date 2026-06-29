<?php

namespace App\Services;

use App\Models\Company;
use App\Models\Role;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class TenantRoleProvisioningService
{
    public function __construct(
        private readonly PermissionRegistryService $permissions,
    ) {}

    /** Create or refresh default system roles for one company. */
    public function provisionForCompany(Company $company): void
    {
        $guard = $this->permissions->guardName();
        $allowed = $this->permissions->permissionNamesForCompany($company);

        foreach (config('permissions.roles', []) as $name => $definition) {
            if ($name === User::ROLE_SUPER_ADMIN) {
                continue;
            }

            $role = Role::updateOrCreate(
                [
                    'name' => $name,
                    'guard_name' => $guard,
                    'company_id' => $company->id,
                ],
                [
                    'description' => $definition['description'] ?? null,
                    'is_system' => $definition['is_system'] ?? false,
                ]
            );

            $patterns = $this->permissionPatternsForRole($name, $definition, $company);
            $resolved = $this->permissions->resolvePatterns($patterns);
            $role->syncPermissions(array_values(array_intersect($resolved, $allowed)));
        }

        $this->permissions->forgetCache();
    }

    /** @return array<int, string> */
    private function permissionPatternsForRole(string $name, array $definition, Company $company): array
    {
        if ($name === User::ROLE_DOCTOR && $company->isDiagnosticsOnly()) {
            return config('permissions.role_context_permissions.doctor.diagnostics_only', []);
        }

        return $definition['permissions'] ?? [];
    }

    /** Trim all company roles when super admin changes enabled modules. */
    public function syncModuleAccess(Company $company): void
    {
        $this->provisionForCompany($company);

        $allowed = collect($this->permissions->permissionNamesForCompany($company));

        Role::query()
            ->where('company_id', $company->id)
            ->each(function (Role $role) use ($allowed) {
                $current = $role->permissions->pluck('name');
                $filtered = $current->intersect($allowed)->values()->all();

                if ($current->count() !== count($filtered)) {
                    $role->syncPermissions($filtered);
                }
            });

        $this->permissions->forgetCache();
    }

    /** Move legacy shared roles into per-company roles. */
    public function migrateGlobalRolesToTenants(): void
    {
        $guard = $this->permissions->guardName();

        $legacyRoles = Role::query()
            ->whereNull('company_id')
            ->where('name', '!=', User::ROLE_SUPER_ADMIN)
            ->get();

        if ($legacyRoles->isEmpty()) {
            Company::query()->each(fn (Company $c) => $this->provisionForCompany($c));

            return;
        }

        DB::transaction(function () use ($legacyRoles, $guard) {
            $legacyByName = $legacyRoles->keyBy('name');

            Company::query()->each(function (Company $company) use ($legacyByName, $guard) {
                $roleMap = [];

                foreach ($legacyByName as $name => $legacyRole) {
                    $tenantRole = Role::updateOrCreate(
                        [
                            'name' => $name,
                            'guard_name' => $guard,
                            'company_id' => $company->id,
                        ],
                        [
                            'description' => $legacyRole->description,
                            'is_system' => $legacyRole->is_system,
                        ]
                    );

                    $allowed = $this->permissions->permissionNamesForCompany($company);
                    $legacyPerms = $legacyRole->permissions->pluck('name')->all();
                    $tenantRole->syncPermissions(array_values(array_intersect($legacyPerms, $allowed)));

                    $roleMap[$name] = $tenantRole;
                }

                User::query()
                    ->where('company_id', $company->id)
                    ->whereNotNull('role')
                    ->each(function (User $user) use ($roleMap) {
                        $tenantRole = $roleMap[$user->role] ?? null;
                        if ($tenantRole) {
                            $user->syncRoles([$tenantRole]);
                        }
                    });
            });

            foreach ($legacyRoles as $legacyRole) {
                if (! $legacyRole->users()->exists()) {
                    $legacyRole->delete();
                }
            }
        });

        $this->permissions->forgetCache();
    }
}
