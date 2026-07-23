<?php

namespace App\Http\Controllers\Api;


use App\Http\Controllers\Controller;
use App\Models\Company;
use App\Models\Feature;
use App\Models\Plan;
use App\Models\PlanLimit;
use App\Models\Subscription;
use App\Models\SubscriptionPayment;
use App\Services\SubscriptionService;
use App\Services\TaxSettingsService;
use App\Support\TaxCalculator;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class AdminPlanController extends Controller
{
    public function features(): JsonResponse
    {
        $features = Feature::query()
            ->orderBy('display_order')
            ->get()
            ->map(fn (Feature $feature) => [
                'id' => $feature->id,
                'key' => $feature->key,
                'name' => $feature->name,
                'category' => $feature->category,
                'is_live' => $this->featureIsLive($feature->key),
            ]);

        return response()->json([
            'features' => $features,
            'limit_keys' => PlanLimit::KEYS,
            'limit_labels' => config('subscription.limit_labels', []),
        ]);
    }

    public function index(): JsonResponse
    {
        $plans = Plan::query()
            ->withCount('subscriptions')
            ->with(['limits', 'features:id,key,name'])
            ->orderBy('display_order')
            ->get()
            ->map(fn (Plan $plan) => $this->planPayload($plan));

        return response()->json(['plans' => $plans]);
    }

    public function subscriptionTax(TaxSettingsService $taxSettings): JsonResponse
    {
        return response()->json($taxSettings->subscriptionTaxPayload());
    }

    public function updateSubscriptionTax(Request $request, TaxSettingsService $taxSettings): JsonResponse
    {
        $validated = $request->validate([
            'enabled' => ['required', 'boolean'],
            'mode' => ['required', Rule::in([TaxCalculator::MODE_CGST_SGST, TaxCalculator::MODE_IGST])],
            'rate' => ['required', 'numeric', 'min:0', 'max:100'],
            'inclusive' => ['required', 'boolean'],
        ]);

        $payload = $taxSettings->savePlatformSubscriptionTax($validated, $request->user()?->id);

        return response()->json([
            'message' => 'Platform subscription tax saved.',
            'tax' => $payload,
        ]);
    }

    public function store(Request $request, TaxSettingsService $taxSettings): JsonResponse
    {
        $data = $this->validatePlan($request);
        $data['code'] = $data['code'] ?? Str::slug($data['name'], '_');
        $data = array_merge($taxSettings->defaultPlanTax(), $data);

        $plan = Plan::create($data);
        $this->syncFeatures($plan, $request->input('features', []));
        $this->syncLimits($plan, $request->input('limits', []));

        return response()->json([
            'message' => 'Plan created successfully.',
            'plan' => $this->planPayload($plan->fresh(['limits', 'features'])),
        ], 201);
    }

    public function update(Request $request, Plan $plan): JsonResponse
    {
        $data = $this->validatePlan($request, $plan->id);
        $plan->update($data);
        $this->syncFeatures($plan, $request->input('features', []));
        $this->syncLimits($plan, $request->input('limits', []));

        return response()->json([
            'message' => 'Plan updated successfully.',
            'plan' => $this->planPayload($plan->fresh(['limits', 'features'])),
        ]);
    }

    public function destroy(Plan $plan): JsonResponse
    {
        if ($plan->subscriptions()->exists()) {
            return response()->json([
                'message' => 'Cannot delete a plan that has subscriptions. Set status to inactive instead.',
            ], 422);
        }

        $plan->delete();

        return response()->json(['message' => 'Plan deleted successfully.']);
    }

    public function subscriptions(SubscriptionService $subscriptions): JsonResponse
    {
        $rows = Company::query()
            ->with(['subscriptions' => fn ($q) => $q->latest()->limit(1)])
            ->orderBy('name')
            ->get()
            ->map(function (Company $company) use ($subscriptions) {
                $current = $subscriptions->getCurrentSubscription($company)
                    ?? $company->subscriptions->first();

                return [
                    'company_id' => $company->id,
                    'company_name' => $company->name,
                    'company_code' => $company->code,
                    'is_active' => $company->is_active,
                    'subscription' => $current ? [
                        'id' => $current->id,
                        'status' => $current->status,
                        'plan_name' => $current->plan?->name,
                        'plan_id' => $current->plan_id,
                        'expires_at' => $current->expires_at,
                        'trial_ends_at' => $current->trial_ends_at,
                    ] : null,
                ];
            });

        return response()->json(['subscriptions' => $rows]);
    }

    public function assignSubscription(Request $request, Company $company, SubscriptionService $subscriptions): JsonResponse
    {
        $validated = $request->validate([
            'plan_id' => ['required', 'integer', 'exists:plans,id'],
            'start_trial' => ['boolean'],
            'billing_cycle' => ['nullable', 'in:monthly,yearly'],
        ]);

        $plan = Plan::query()
            ->where('id', $validated['plan_id'])
            ->where('status', Plan::STATUS_ACTIVE)
            ->firstOrFail();

        $subscription = $subscriptions->assignPlanByAdmin(
            $company,
            $plan,
            $validated['start_trial'] ?? true,
            $validated['billing_cycle'] ?? Subscription::BILLING_MONTHLY
        );

        return response()->json([
            'message' => "{$company->name} is now on the {$plan->name} plan.",
            'subscription' => $subscriptions->subscriptionSummary($company),
        ]);
    }

    public function payments(): JsonResponse
    {
        $payments = SubscriptionPayment::query()
            ->with(['subscription.company:id,name,code', 'subscription.plan:id,name'])
            ->orderByDesc('created_at')
            ->limit(100)
            ->get()
            ->map(fn (SubscriptionPayment $payment) => [
                'id' => $payment->id,
                'invoice_number' => $payment->invoice_number,
                'amount' => $payment->amount,
                'currency' => $payment->currency,
                'payment_status' => $payment->payment_status,
                'payment_method' => $payment->payment_method,
                'transaction_reference' => $payment->transaction_reference,
                'payment_date' => $payment->payment_date,
                'plan_name' => $payment->notes['plan_name'] ?? $payment->subscription?->plan?->name,
                'company_name' => $payment->subscription?->company?->name,
                'company_code' => $payment->subscription?->company?->code,
                'created_at' => $payment->created_at,
            ]);

        return response()->json(['payments' => $payments]);
    }

    protected function validatePlan(Request $request, ?int $planId = null): array
    {
        return $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'code' => ['nullable', 'string', 'max:50', Rule::unique('plans', 'code')->ignore($planId)],
            'description' => ['nullable', 'string'],
            'monthly_price' => ['required', 'numeric', 'min:0'],
            'yearly_price' => ['required', 'numeric', 'min:0'],
            'discount_percent' => ['required', 'integer', 'min:0', 'max:100'],
            'currency' => ['required', 'string', 'max:10'],
            'trial_days' => ['required', 'integer', 'min:0'],
            'status' => ['required', Rule::in([Plan::STATUS_ACTIVE, Plan::STATUS_INACTIVE])],
            'display_order' => ['required', 'integer', 'min:0'],
            'tax_enabled' => ['required', 'boolean'],
            'tax_mode' => ['required', Rule::in([TaxCalculator::MODE_CGST_SGST, TaxCalculator::MODE_IGST])],
            'tax_rate' => ['required', 'numeric', 'min:0', 'max:100'],
            'tax_inclusive' => ['required', 'boolean'],
            'features' => ['nullable', 'array'],
            'features.*' => ['integer', 'exists:features,id'],
            'limits' => ['nullable', 'array'],
            'limits.*' => ['nullable', 'integer', 'min:0'],
        ]);
    }

    protected function syncFeatures(Plan $plan, array $featureIds): void
    {
        $allFeatures = Feature::query()->pluck('id');
        $sync = [];

        foreach ($allFeatures as $featureId) {
            $sync[$featureId] = ['is_enabled' => in_array($featureId, $featureIds, true)];
        }

        $plan->features()->sync($sync);
    }

    protected function syncLimits(Plan $plan, array $limits): void
    {
        foreach (PlanLimit::KEYS as $key) {
            if (! array_key_exists($key, $limits)) {
                continue;
            }

            $value = $limits[$key];

            PlanLimit::updateOrCreate(
                ['plan_id' => $plan->id, 'limit_key' => $key],
                ['limit_value' => $value === '' || $value === null ? null : (int) $value]
            );
        }
    }

    protected function planPayload(Plan $plan): array
    {
        $plan->loadMissing(['limits', 'features']);

        return [
            'id' => $plan->id,
            'name' => $plan->name,
            'code' => $plan->code,
            'description' => $plan->description,
            'monthly_price' => $plan->monthly_price,
            'yearly_price' => $plan->yearly_price,
            'discount_percent' => $plan->discount_percent ?? 0,
            'monthly_price_final' => $plan->discountedAmount('monthly'),
            'yearly_price_final' => $plan->discountedAmount('yearly'),
            'currency' => $plan->currency,
            'tax_enabled' => (bool) $plan->tax_enabled,
            'tax_mode' => $plan->tax_mode,
            'tax_rate' => (float) $plan->tax_rate,
            'tax_inclusive' => (bool) $plan->tax_inclusive,
            'trial_days' => $plan->trial_days,
            'status' => $plan->status,
            'display_order' => $plan->display_order,
            'subscriptions_count' => $plan->subscriptions_count ?? $plan->subscriptions()->count(),
            'features' => $plan->features->where('pivot.is_enabled', true)->pluck('id')->values(),
            'feature_keys' => $plan->enabledFeatures->pluck('key')->values(),
            'limits' => $plan->limits->mapWithKeys(fn ($l) => [$l->limit_key => $l->limit_value]),
        ];
    }

    protected function featureIsLive(string $featureKey): bool
    {
        $mapped = config("subscription.feature_module_map.{$featureKey}", []);

        return is_array($mapped) && $mapped !== [];
    }
}
