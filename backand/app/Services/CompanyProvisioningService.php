<?php

namespace App\Services;

use App\Models\Branch;
use App\Models\Company;
use App\Models\Plan;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class CompanyProvisioningService
{
    public function __construct(
        private readonly CompanySetupService $setup,
        private readonly UserRoleService $userRoles,
        private readonly TenantRoleProvisioningService $tenantRoles,
        private readonly SubscriptionService $subscriptions,
    ) {}

    /**
     * Create organization, bootstrap defaults, provision subscription, and create primary tenant admin.
     */
    public function provision(array $companyData, array $adminData, ?Plan $plan = null): Company
    {
        return DB::transaction(function () use ($companyData, $adminData, $plan) {
            $company = Company::create($companyData);
            $this->setup->bootstrap($company);
            $this->subscriptions->ensureForCompany($company, $plan);
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
