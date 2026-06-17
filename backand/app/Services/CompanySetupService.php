<?php

namespace App\Services;

use App\Models\Branch;
use App\Models\Company;
use App\Models\Department;
use App\Models\Setting;
use App\Support\SettingDefinitions;

class CompanySetupService
{
    public function bootstrap(Company $company): void
    {
        // Create the default main branch using the company's own details
        Branch::firstOrCreate(
            ['company_id' => $company->id, 'is_main' => true],
            [
                'company_id' => $company->id,
                'name'       => $company->name.' — Main Branch',
                'code'       => 'MAIN',
                'address'    => $company->address ?? null,
                'city'       => $company->city ?? null,
                'phone'      => $company->phone ?? null,
                'email'      => $company->email ?? null,
                'is_main'    => true,
                'is_active'  => true,
            ]
        );

        $departments = [
            ['name' => 'General Medicine', 'code' => 'GEN'],
            ['name' => 'Cardiology', 'code' => 'CARD'],
            ['name' => 'Pediatrics', 'code' => 'PED'],
            ['name' => 'Orthopedics', 'code' => 'ORTH'],
        ];

        foreach ($departments as $row) {
            Department::firstOrCreate(
                ['company_id' => $company->id, 'name' => $row['name']],
                [...$row, 'company_id' => $company->id, 'is_active' => true]
            );
        }

        $this->ensureSettings($company);
    }

    public function ensureSettings(Company $company): void
    {
        $defaults = [
            'clinic_name' => $company->name,
            'clinic_email' => $company->email ?? '',
            'clinic_phone' => $company->phone ?? '',
            'clinic_address' => $company->address ?? '',
            'clinic_website' => $company->website ?? '',
            'company_logo' => $company->logo_url ?? '',
        ];

        foreach (SettingDefinitions::all() as $definition) {
            Setting::firstOrCreate(
                ['company_id' => $company->id, 'key' => $definition['key']],
                [
                    'company_id' => $company->id,
                    'key' => $definition['key'],
                    'label' => $definition['label'],
                    'group' => $definition['group'],
                    'value' => $defaults[$definition['key']] ?? ($definition['default'] ?? ''),
                ]
            );
        }
    }
}
