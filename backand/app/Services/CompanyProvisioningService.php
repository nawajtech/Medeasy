<?php

namespace App\Services;

use App\Models\Branch;
use App\Models\Company;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class CompanyProvisioningService
{
    public function __construct(
        private readonly CompanySetupService $setup,
        private readonly UserRoleService $userRoles,
        private readonly TenantRoleProvisioningService $tenantRoles,
    ) {}

    /**
     * Create organization, bootstrap defaults, and provision the primary tenant admin.
     */
    public function provision(array $companyData, array $adminData): Company
    {
        return DB::transaction(function () use ($companyData, $adminData) {
            $company = Company::create($companyData);
            $this->setup->bootstrap($company);
            $this->tenantRoles->provisionForCompany($company);

            $mainBranchId = Branch::query()
                ->where('company_id', $company->id)
                ->where('is_main', true)
                ->value('id');

            $admin = User::create([
                'name' => $adminData['name'],
                'email' => $adminData['email'],
                'password' => $adminData['password'],
                'phone' => $adminData['phone'] ?? null,
                'role' => User::ROLE_COMPANY_ADMIN,
                'company_id' => $company->id,
                'branch_id' => $mainBranchId,
                'status' => true,
            ]);

            $this->userRoles->assignRole($admin, User::ROLE_COMPANY_ADMIN);

            $company->update(['primary_admin_id' => $admin->id]);

            return $company->fresh(['primaryAdmin']);
        });
    }
}
