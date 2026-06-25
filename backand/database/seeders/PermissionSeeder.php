<?php

namespace Database\Seeders;

use App\Services\PermissionRegistryService;
use Illuminate\Database\Seeder;

class PermissionSeeder extends Seeder
{
    public function run(): void
    {
        app(PermissionRegistryService::class)->syncToDatabase();
    }
}
