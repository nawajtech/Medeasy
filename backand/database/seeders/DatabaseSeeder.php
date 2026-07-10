<?php

namespace Database\Seeders;

use App\Services\TenantRoleProvisioningService;
use App\Services\UserRoleService;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    public function run(): void
    {
        $this->call(PermissionSeeder::class);
        $this->call(RolePermissionSeeder::class);
        $this->call(SubscriptionSeeder::class);
        $this->call(CompanySeeder::class);
        $this->call(SaasSeeder::class);

        app(TenantRoleProvisioningService::class)->migrateGlobalRolesToTenants();
        app(UserRoleService::class)->syncExistingUsers();
    }
}
