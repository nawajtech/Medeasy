<?php

namespace Database\Seeders;

use App\Models\Company;
use App\Models\Department;
use App\Models\Doctor;
use App\Models\User;
use App\Services\CompanySetupService;
use App\Services\TenantRoleProvisioningService;
use App\Services\UserRoleService;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class SaasSeeder extends Seeder
{
    public function run(): void
    {
        $setup = app(CompanySetupService::class);
        $userRoles = app(UserRoleService::class);
        $tenantRoles = app(TenantRoleProvisioningService::class);

        $superAdmin = User::updateOrCreate(
            ['email' => 'super@medeasy.com'],
            [
                'name' => 'Super Admin',
                'password' => Hash::make('password'),
                'role' => User::ROLE_SUPER_ADMIN,
                'company_id' => null,
                'status' => true,
            ]
        );
        $userRoles->assignRole($superAdmin, User::ROLE_SUPER_ADMIN);

        $companies = [
            [
                'name' => 'Apollo Clinic',
                'code' => 'APOLLO',
                'admin_email' => 'admin@apollo.com',
                'doctor_email' => 'doctor@apollo.com',
            ],
            [
                'name' => 'Riyaj Clinic',
                'code' => 'RIYAJ',
                'admin_email' => 'admin@riyaj.com',
                'doctor_email' => 'doctor@riyaj.com',
            ],
        ];

        foreach ($companies as $row) {
            $company = Company::withTrashed()
                ->where('name', $row['name'])
                ->orWhere('code', $row['code'])
                ->first();

            if (! $company) {
                $company = Company::create([
                    'name' => $row['name'],
                    'code' => $row['code'],
                    'email' => $row['admin_email'],
                    'phone' => '+92 300 0000000',
                    'modules' => ['clinic', 'laboratory', 'diagnostics'],
                    'is_active' => true,
                ]);
            } else {
                $company->restore();
                $company->update([
                    'code' => $row['code'],
                    'email' => $row['admin_email'],
                    'is_active' => true,
                ]);
            }

            $setup->bootstrap($company);
            $tenantRoles->provisionForCompany($company);

            $adminUser = User::updateOrCreate(
                ['email' => $row['admin_email']],
                [
                    'name' => $row['name'].' Admin',
                    'password' => Hash::make('password'),
                    'role' => User::ROLE_COMPANY_ADMIN,
                    'company_id' => $company->id,
                    'status' => true,
                ]
            );
            $userRoles->assignRole($adminUser, User::ROLE_COMPANY_ADMIN);

            $company->update(['primary_admin_id' => $adminUser->id]);

            $doctorUser = User::updateOrCreate(
                ['email' => $row['doctor_email']],
                [
                    'name' => $row['name'].' Doctor',
                    'password' => Hash::make('password'),
                    'role' => User::ROLE_DOCTOR,
                    'company_id' => $company->id,
                    'status' => true,
                ]
            );
            $userRoles->assignRole($doctorUser, User::ROLE_DOCTOR);

            $departmentId = Department::where('company_id', $company->id)->value('id');

            Doctor::updateOrCreate(
                ['user_id' => $doctorUser->id],
                [
                    'company_id' => $company->id,
                    'department_id' => $departmentId,
                    'doctor_code' => strtoupper($row['code']).'-DOC-001',
                    'consultation_fee' => 1500,
                    'qualification' => 'MBBS',
                ]
            );
        }
    }
}
