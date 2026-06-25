<?php

namespace Database\Seeders;

use App\Models\Role;
use App\Models\User;
use App\Services\PermissionRegistryService;
use Illuminate\Database\Seeder;

class RolePermissionSeeder extends Seeder
{
    public function run(): void
    {
        $registry = app(PermissionRegistryService::class);
        $guard = $registry->guardName();
        $definition = config('permissions.roles.'.User::ROLE_SUPER_ADMIN, []);

        $role = Role::updateOrCreate(
            ['name' => User::ROLE_SUPER_ADMIN, 'guard_name' => $guard, 'company_id' => null],
            [
                'description' => $definition['description'] ?? null,
                'is_system' => $definition['is_system'] ?? true,
            ]
        );

        $role->syncPermissions(
            $registry->resolveRolePermissions($definition['permissions'] ?? [], $definition['exclude_permissions'] ?? [])
        );
        $registry->forgetCache();
    }
}
