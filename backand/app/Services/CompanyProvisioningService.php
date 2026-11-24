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
        private readonly UniqueCodeGenerator $codes,
    ) {}

    /**
     * Create organization, bootstrap defaults, and create primary tenant admin.
     */
    public function provision(array $companyData, array $adminData): Company
    {
        return DB::transaction(function () use ($companyData, $adminData) {
            $companyName = (string) ($companyData['name'] ?? 'XX');
            $companyData['code'] = $this->codes->forCompany($companyName);

            $company = Company::create($companyData);
            $this->setup->bootstrap($company);
            $this->tenantRoles->provisionForCompany($company);

            $mainBranchId = Branch::query()
                ->where('company_id', $company->id)
                ->where('is_main', true)
                ->value('id');

            $adminName = (string) ($adminData['name'] ?? 'XX');
            $admin = User::create([
                'name' => $adminData['name'],
                'email' => $adminData['email'],
                'password' => $adminData['password'],
                'phone' => $adminData['phone'] ?? null,
                'role' => User::ROLE_COMPANY_ADMIN,
                'user_code' => $this->codes->forUser($adminName, $company->name, (int) $company->id),
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
