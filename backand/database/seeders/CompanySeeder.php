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
                'name' => 'Apollo Clinic',
                'code' => 'APOLLO',
                'phone' => '+92 300 1112233',
                'email' => 'info@apolloclinic.com',
                'address' => 'Main Boulevard, Gulberg',
                'city' => 'Lahore',
                'state' => 'Punjab',
                'country' => 'Pakistan',
                'website' => 'https://apolloclinic.example',
                'description' => 'Multi-specialty outpatient clinic.',
            ],
            [
                'name' => 'Riyaj Clinic',
                'code' => 'RIYAJ',
                'phone' => '+92 321 4455667',
                'email' => 'contact@riyajclinic.com',
                'address' => 'Street 12, DHA Phase 5',
                'city' => 'Karachi',
                'state' => 'Sindh',
                'country' => 'Pakistan',
                'website' => 'https://riyajclinic.example',
                'description' => 'Family health and diagnostics center.',
            ],
            [
                'name' => 'City Care Hospital',
                'code' => 'CITYCARE',
                'phone' => '+92 42 35789012',
                'email' => 'admin@citycare.com',
                'address' => 'Ferozepur Road',
                'city' => 'Lahore',
                'state' => 'Punjab',
                'country' => 'Pakistan',
                'description' => 'General hospital and emergency services.',
            ],
        ];

        foreach ($companies as $row) {
            Company::firstOrCreate(['name' => $row['name']], [
                ...$row,
                'is_active' => true,
            ]);
        }
    }
}
