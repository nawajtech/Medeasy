<?php

namespace App\Services;

use App\Models\Role;
use App\Models\User;

class UserRoleService
{
    public function assignRole(User $user, string $roleName): void
    {
        $role = $this->findRoleForUser($user, $roleName);
        $user->syncRoles([$role]);
        $user->update(['role' => $roleName]);
    }

    public function findRoleForUser(User $user, string $roleName): Role
    {
        $guard = app(PermissionRegistryService::class)->guardName();

        if ($roleName === User::ROLE_SUPER_ADMIN) {
            return Role::where('name', $roleName)
                ->where('guard_name', $guard)
                ->whereNull('company_id')
                ->firstOrFail();
        }

        if (! $user->company_id) {
            abort(422, 'Tenant users must belong to a company.');
        }

        return Role::where('name', $roleName)
            ->where('guard_name', $guard)
            ->where('company_id', $user->company_id)
            ->firstOrFail();
    }

    public function syncExistingUsers(): void
    {
        User::query()->each(function (User $user) {
            if (! $user->role) {
                return;
            }

            try {
                $this->assignRole($user, $user->role);
            } catch (\Throwable) {
                // Skip until tenant roles are provisioned.
            }
        });
    }
}
