<?php

namespace Database\Seeders;

use App\Models\Company;
use Illuminate\Database\Seeder;

class CompanySeeder extends Seeder
{
    public function run(): void
    {
        $companies = [
            [
                'name' => 'Apollo Diagnostics',
                'code' => 'APOLLO',
                'phone' => '+92 300 1112233',
                'email' => 'info@apollodiagnostics.com',
                'address' => 'Main Boulevard, Gulberg',
                'city' => 'Lahore',
                'state' => 'Punjab',
                'country' => 'Pakistan',
                'website' => 'https://apollodiagnostics.example',
                'description' => 'Diagnostic imaging and laboratory centre.',
                'modules' => ['diagnostics', 'laboratory'],
            ],
            [
                'name' => 'Riyaj Diagnostics',
                'code' => 'RIYAJ',
                'phone' => '+92 321 4455667',
                'email' => 'contact@riyajdiagnostics.com',
                'address' => 'Street 12, DHA Phase 5',
                'city' => 'Karachi',
                'state' => 'Sindh',
                'country' => 'Pakistan',
                'website' => 'https://riyajdiagnostics.example',
                'description' => 'Family health and diagnostics center.',
                'modules' => ['diagnostics', 'laboratory'],
            ],
            [
                'name' => 'City Care Lab',
                'code' => 'CITYCARE',
                'phone' => '+92 42 35789012',
                'email' => 'admin@citycare.com',
                'address' => 'Ferozepur Road',
                'city' => 'Lahore',
                'state' => 'Punjab',
                'country' => 'Pakistan',
                'description' => 'Pathology laboratory and diagnostic services.',
                'modules' => ['laboratory', 'diagnostics'],
            ],
        ];

        foreach ($companies as $row) {
            $modules = Company::normalizeModules($row['modules'] ?? ['diagnostics', 'laboratory']);
            unset($row['modules']);

            Company::firstOrCreate(['name' => $row['name']], [
                ...$row,
                'modules' => $modules,
                'type' => Company::deriveLegacyType($modules),
                'is_active' => true,
            ]);
        }
    }
}
