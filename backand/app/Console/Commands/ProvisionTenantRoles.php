<?php

namespace App\Console\Commands;

use App\Models\Company;
use App\Services\TenantRoleProvisioningService;
use App\Services\UserRoleService;
use Illuminate\Console\Command;

class ProvisionTenantRoles extends Command
{
    protected $signature = 'medeasy:provision-tenant-roles {--migrate : Migrate legacy global roles to per-company roles}';

    protected $description = 'Provision company-wise roles and sync user assignments';

    public function handle(
        TenantRoleProvisioningService $tenantRoles,
        UserRoleService $userRoles,
    ): int {
        if ($this->option('migrate')) {
            $this->info('Migrating to company-wise roles…');
            $tenantRoles->migrateGlobalRolesToTenants();
        } else {
            Company::query()->each(fn (Company $c) => $tenantRoles->provisionForCompany($c));
        }

        $userRoles->syncExistingUsers();
        $this->info('Company-wise roles are ready.');

        return self::SUCCESS;
    }
}
