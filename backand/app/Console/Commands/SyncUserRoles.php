<?php

namespace App\Console\Commands;

use App\Services\UserRoleService;
use Illuminate\Console\Command;

class SyncUserRoles extends Command
{
    protected $signature = 'apnamedi:sync-user-roles';

    protected $description = 'Sync users.role column to Spatie role assignments';

    public function handle(UserRoleService $service): int
    {
        $service->syncExistingUsers();
        $this->info('User roles synced successfully.');

        return self::SUCCESS;
    }
}
