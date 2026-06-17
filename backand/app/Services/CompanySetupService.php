<?php

namespace App\Services;

use App\Models\Branch;
use App\Models\Company;
use App\Models\Department;
use App\Models\Setting;

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

        $settings = [
            ['key' => 'clinic_name', 'label' => 'Clinic name', 'value' => $company->name, 'group' => 'general'],
            ['key' => 'clinic_email', 'label' => 'Clinic email', 'value' => $company->email ?? '', 'group' => 'general'],
            ['key' => 'clinic_phone', 'label' => 'Clinic phone', 'value' => $company->phone ?? '', 'group' => 'general'],
            ['key' => 'currency', 'label' => 'Currency', 'value' => 'USD', 'group' => 'billing'],
            ['key' => 'appointment_slot_minutes', 'label' => 'Default appointment duration (minutes)', 'value' => '30', 'group' => 'appointments'],
        ];

        foreach ($settings as $row) {
            Setting::firstOrCreate(
                ['company_id' => $company->id, 'key' => $row['key']],
                [...$row, 'company_id' => $company->id]
            );
        }
    }
}
