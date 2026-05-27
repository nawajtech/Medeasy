<?php

namespace Database\Seeders;

use App\Models\Company;
use App\Services\CompanySetupService;
use Illuminate\Database\Seeder;

class SettingsSeeder extends Seeder
{
    public function run(): void
    {
        $setup = app(CompanySetupService::class);

        Company::each(fn (Company $company) => $setup->bootstrap($company));
    }
}
