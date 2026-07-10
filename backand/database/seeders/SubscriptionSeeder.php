<?php

namespace Database\Seeders;

use App\Models\Company;
use App\Models\Feature;
use App\Models\Plan;
use App\Models\PlanLimit;
use App\Services\SubscriptionService;
use Illuminate\Database\Seeder;

class SubscriptionSeeder extends Seeder
{
    public function run(): void
    {
        $features = $this->seedFeatures();
        $this->seedPlans($features);
        $this->backfillCompanySubscriptions();
    }

    protected function backfillCompanySubscriptions(): void
    {
        $subscriptions = app(SubscriptionService::class);

        Company::query()->each(function (Company $company) use ($subscriptions) {
            $subscriptions->ensureForCompany($company);
        });
    }

    protected function seedFeatures(): array
    {
        $definitions = [
            [Feature::PATIENT_MANAGEMENT, 'Patient Management', 'core', 10],
            [Feature::APPOINTMENT_MANAGEMENT, 'Appointment Management', 'core', 20],
            [Feature::BILLING, 'Billing', 'core', 30],
            [Feature::LAB_MODULE, 'Lab Module', 'modules', 40],
            [Feature::DIAGNOSTICS_MODULE, 'Diagnostics Module', 'modules', 45],
            [Feature::PHARMACY, 'Medicine Master', 'modules', 50],
            [Feature::INVENTORY, 'Inventory', 'modules', 60],
            [Feature::MULTI_BRANCH, 'Multi Branch', 'enterprise', 70],
            [Feature::API_ACCESS, 'API Access', 'enterprise', 80],
            [Feature::ANALYTICS, 'Analytics', 'insights', 90],
            [Feature::AI_OCR, 'AI OCR', 'ai', 100],
            [Feature::AI_REPORT_EXPLANATION, 'AI Report Explanation', 'ai', 110],
            [Feature::VOICE_ASSISTANT, 'Voice Assistant', 'ai', 120],
            [Feature::AI_CHAT_ASSISTANT, 'AI Chat Assistant', 'ai', 130],
        ];

        $features = [];

        foreach ($definitions as [$key, $name, $category, $order]) {
            $features[$key] = Feature::updateOrCreate(
                ['key' => $key],
                [
                    'name' => $name,
                    'category' => $category,
                    'is_active' => true,
                    'display_order' => $order,
                ]
            );
        }

        return $features;
    }

    protected function seedPlans(array $features): void
    {
        $plans = [
            Plan::CODE_BASIC => [
                'name' => 'Basic',
                'description' => 'Designed for small clinics and diagnostic centers.',
                'monthly_price' => 999,
                'yearly_price' => 9990,
                'trial_days' => 14,
                'display_order' => 1,
                'features' => [
                    Feature::PATIENT_MANAGEMENT,
                    Feature::APPOINTMENT_MANAGEMENT,
                    Feature::BILLING,
                    Feature::DIAGNOSTICS_MODULE,
                ],
                'limits' => [
                    PlanLimit::MAX_USERS => 5,
                    PlanLimit::MAX_BRANCHES => 1,
                    PlanLimit::MAX_STORAGE_MB => 5120,
                    PlanLimit::MAX_PATIENTS => 500,
                    PlanLimit::MAX_MONTHLY_REPORTS => 50,
                    PlanLimit::MAX_API_REQUESTS => 0,
                ],
            ],
            Plan::CODE_PREMIUM => [
                'name' => 'Premium',
                'description' => 'Designed for growing clinics and laboratories.',
                'monthly_price' => 2499,
                'yearly_price' => 24990,
                'trial_days' => 14,
                'display_order' => 2,
                'features' => [
                    Feature::PATIENT_MANAGEMENT,
                    Feature::APPOINTMENT_MANAGEMENT,
                    Feature::BILLING,
                    Feature::LAB_MODULE,
                    Feature::DIAGNOSTICS_MODULE,
                    Feature::PHARMACY,
                    Feature::INVENTORY,
                    Feature::ANALYTICS,
                ],
                'limits' => [
                    PlanLimit::MAX_USERS => 15,
                    PlanLimit::MAX_BRANCHES => 3,
                    PlanLimit::MAX_STORAGE_MB => 20480,
                    PlanLimit::MAX_PATIENTS => 5000,
                    PlanLimit::MAX_MONTHLY_REPORTS => 200,
                    PlanLimit::MAX_API_REQUESTS => 1000,
                ],
            ],
            Plan::CODE_ENTERPRISE => [
                'name' => 'Enterprise',
                'description' => 'Designed for hospitals and multi-branch organizations.',
                'monthly_price' => 4999,
                'yearly_price' => 49990,
                'trial_days' => 30,
                'display_order' => 3,
                'features' => [
                    Feature::PATIENT_MANAGEMENT,
                    Feature::APPOINTMENT_MANAGEMENT,
                    Feature::BILLING,
                    Feature::LAB_MODULE,
                    Feature::DIAGNOSTICS_MODULE,
                    Feature::PHARMACY,
                    Feature::INVENTORY,
                    Feature::MULTI_BRANCH,
                    Feature::API_ACCESS,
                    Feature::ANALYTICS,
                ],
                'limits' => [
                    PlanLimit::MAX_USERS => 100,
                    PlanLimit::MAX_BRANCHES => 25,
                    PlanLimit::MAX_STORAGE_MB => 102400,
                    PlanLimit::MAX_PATIENTS => null,
                    PlanLimit::MAX_MONTHLY_REPORTS => null,
                    PlanLimit::MAX_API_REQUESTS => 50000,
                ],
            ],
            Plan::CODE_AI_GOLD => [
                'name' => 'AI Gold',
                'description' => 'Designed for customers who require AI-powered healthcare features.',
                'monthly_price' => 7999,
                'yearly_price' => 79990,
                'trial_days' => 14,
                'display_order' => 4,
                'features' => array_keys($features),
                'limits' => [
                    PlanLimit::MAX_USERS => null,
                    PlanLimit::MAX_BRANCHES => null,
                    PlanLimit::MAX_STORAGE_MB => null,
                    PlanLimit::MAX_PATIENTS => null,
                    PlanLimit::MAX_MONTHLY_REPORTS => null,
                    PlanLimit::MAX_API_REQUESTS => null,
                ],
            ],
        ];

        foreach ($plans as $code => $definition) {
            $plan = Plan::updateOrCreate(
                ['code' => $code],
                [
                    'name' => $definition['name'],
                    'description' => $definition['description'],
                    'monthly_price' => $definition['monthly_price'],
                    'yearly_price' => $definition['yearly_price'],
                    'currency' => 'INR',
                    'trial_days' => $definition['trial_days'],
                    'status' => Plan::STATUS_ACTIVE,
                    'display_order' => $definition['display_order'],
                ]
            );

            $syncFeatures = [];
            foreach ($features as $key => $feature) {
                $syncFeatures[$feature->id] = [
                    'is_enabled' => in_array($key, $definition['features'], true),
                ];
            }
            $plan->features()->sync($syncFeatures);

            foreach ($definition['limits'] as $limitKey => $limitValue) {
                PlanLimit::updateOrCreate(
                    ['plan_id' => $plan->id, 'limit_key' => $limitKey],
                    ['limit_value' => $limitValue]
                );
            }
        }
    }
}
