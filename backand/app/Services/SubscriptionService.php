<?php

namespace App\Services;

use App\Models\Company;
use App\Models\Plan;
use App\Models\Subscription;
use App\Models\SubscriptionPayment;
use App\Services\TaxSettingsService;
use App\Support\TaxCalculator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use InvalidArgumentException;

class SubscriptionService
{
    public function create(
        Company $company,
        Plan $plan,
        string $billingCycle = Subscription::BILLING_MONTHLY,
        bool $startTrial = true,
        bool $autoRenewal = true
    ): Subscription {
        return DB::transaction(function () use ($company, $plan, $billingCycle, $startTrial, $autoRenewal) {
            $this->closeOpenSubscriptions($company, Subscription::STATUS_CANCELLED);

            $startsAt = now();
            $trialEndsAt = $startTrial && $plan->trial_days > 0
                ? $startsAt->copy()->addDays($plan->trial_days)
                : null;

            $status = $trialEndsAt ? Subscription::STATUS_TRIAL : Subscription::STATUS_ACTIVE;
            $expiresAt = $trialEndsAt
                ?? $this->calculateExpiry($startsAt, $billingCycle);
            $renewalDate = $expiresAt->copy();

            return Subscription::create([
                'company_id' => $company->id,
                'plan_id' => $plan->id,
                'status' => $status,
                'starts_at' => $startsAt,
                'expires_at' => $expiresAt,
                'trial_ends_at' => $trialEndsAt,
                'renewal_date' => $renewalDate,
                'auto_renewal' => $autoRenewal,
                'billing_cycle' => $billingCycle,
                'meta' => [
                    'created_via' => 'create',
                    'plan_code' => $plan->code,
                ],
            ]);
        });
    }

    public function hasActiveSubscription(Company $company): bool
    {
        $subscription = $this->getCurrentSubscription($company);

        return $subscription !== null && $subscription->isUsable();
    }

    /**
     * @return array<int, string>
     */
    public function allowedPermissionModuleKeys(Company $company): array
    {
        $subscription = $this->getCurrentSubscription($company);

        if (! $subscription || ! $subscription->isUsable()) {
            return config('subscription.fallback_modules', ['settings']);
        }

        $keys = collect(config('subscription.core_modules', []));

        foreach ($subscription->plan->enabledFeatures as $feature) {
            $mapped = config("subscription.feature_module_map.{$feature->key}", []);
            $keys = $keys->merge($mapped);
        }

        return $keys->unique()->values()->all();
    }

    public function getLimit(Company $company, string $limitKey): ?int
    {
        $subscription = $this->getCurrentSubscription($company);

        if (! $subscription) {
            return null;
        }

        $limit = $subscription->plan->limits->firstWhere('limit_key', $limitKey);

        return $limit?->limit_value;
    }

    public function assertUnderLimit(Company $company, string $limitKey, int $currentCount): void
    {
        $limit = $this->getLimit($company, $limitKey);

        if ($limit === null || $currentCount < $limit) {
            return;
        }

        $label = config("subscription.limit_labels.{$limitKey}", str_replace('_', ' ', $limitKey));

        abort(403, "Plan limit reached: {$label} ({$limit}). Please upgrade your subscription.");
    }

    public function subscriptionSummary(Company $company): ?array
    {
        $subscription = $this->getCurrentSubscription($company);

        if (! $subscription) {
            return null;
        }

        return [
            'id' => $subscription->id,
            'status' => $subscription->status,
            'is_usable' => $subscription->isUsable(),
            'starts_at' => $subscription->starts_at,
            'expires_at' => $subscription->expires_at,
            'trial_ends_at' => $subscription->trial_ends_at,
            'renewal_date' => $subscription->renewal_date,
            'auto_renewal' => $subscription->auto_renewal,
            'billing_cycle' => $subscription->billing_cycle,
            'plan' => [
                'id' => $subscription->plan->id,
                'code' => $subscription->plan->code,
                'name' => $subscription->plan->name,
                'description' => $subscription->plan->description,
                'monthly_price' => $subscription->plan->monthly_price,
                'yearly_price' => $subscription->plan->yearly_price,
                'discount_percent' => $subscription->plan->discount_percent ?? 0,
                'currency' => $subscription->plan->currency,
            ],
            'features' => $subscription->plan->enabledFeatures
                ->pluck('key')
                ->values()
                ->all(),
            'limits' => $subscription->plan->limits
                ->mapWithKeys(fn ($limit) => [$limit->limit_key => $limit->limit_value])
                ->all(),
        ];
    }

    /** @return array<int, array<string, mixed>> */
    public function paymentHistory(Company $company): array
    {
        $subscriptionIds = $company->subscriptions()->pluck('id');

        return SubscriptionPayment::query()
            ->whereIn('subscription_id', $subscriptionIds)
            ->orderByDesc('created_at')
            ->limit(20)
            ->get()
            ->map(fn (SubscriptionPayment $payment) => $this->paymentPayload($payment))
            ->all();
    }

    public function getCurrentSubscription(Company $company): ?Subscription
    {
        return $company->subscriptions()
            ->whereIn('status', Subscription::USABLE_STATUSES)
            ->with(['plan.limits', 'plan.features'])
            ->latest()
            ->first();
    }

    /** Assign a default trial subscription when a company has none. */
    public function ensureForCompany(Company $company, ?Plan $plan = null): Subscription
    {
        $existing = $this->getCurrentSubscription($company);

        if ($existing) {
            return $existing;
        }

        $plan ??= Plan::query()
            ->where('code', config('subscription.default_plan_code', Plan::CODE_BASIC))
            ->where('status', Plan::STATUS_ACTIVE)
            ->first();

        if (! $plan) {
            abort(422, 'No active Basic plan is set up. Add an active plan before creating an organization.');
        }

        return $this->create($company, $plan);
    }

    /** Platform admin assigns a plan directly (trial or active, no payment required). */
    public function assignPlanByAdmin(
        Company $company,
        Plan $plan,
        bool $startTrial = true,
        string $billingCycle = Subscription::BILLING_MONTHLY
    ): Subscription {
        $this->closeOpenSubscriptions($company, Subscription::STATUS_CANCELLED);

        $subscription = $this->create($company, $plan, $billingCycle, $startTrial);
        $this->refreshTenantModuleAccess($company);

        return $subscription;
    }

    /** Create a pending invoice — plan changes only after payment is confirmed. */
    public function createCheckout(Company $company, Plan $plan, string $billingCycle): SubscriptionPayment
    {
        if (! $plan->isPurchasable()) {
            throw new InvalidArgumentException(
                $plan->availability_note
                    ?: ($plan->name.' is '.$plan->availabilityLabel().' and cannot be purchased yet.')
            );
        }

        $subscription = $this->getCurrentSubscription($company)
            ?? $this->ensureForCompany($company);

        if ($subscription->plan_id === $plan->id && $subscription->billing_cycle === $billingCycle) {
            throw new InvalidArgumentException('You are already on this plan and billing cycle.');
        }

        $subtotal = $plan->discountedAmount($billingCycle);
        $baseAmount = $plan->baseAmount($billingCycle);

        if ($subtotal <= 0) {
            throw new InvalidArgumentException('This plan requires a paid amount before activation.');
        }

        $tax = TaxCalculator::apply($subtotal, app(TaxSettingsService::class)->forSubscription($plan));

        return SubscriptionPayment::create([
            'subscription_id' => $subscription->id,
            'invoice_number' => $this->generateInvoiceNumber(),
            'amount' => $tax['grand_total'],
            'subtotal' => $subtotal,
            'currency' => $plan->currency,
            'payment_status' => SubscriptionPayment::STATUS_PENDING,
            'tax_enabled' => $tax['tax_enabled'],
            'tax_mode' => $tax['tax_mode'],
            'tax_rate' => $tax['tax_rate'],
            'cgst_rate' => $tax['cgst_rate'],
            'sgst_rate' => $tax['sgst_rate'],
            'igst_rate' => $tax['igst_rate'],
            'cgst_amount' => $tax['cgst_amount'],
            'sgst_amount' => $tax['sgst_amount'],
            'igst_amount' => $tax['igst_amount'],
            'tax_amount' => $tax['tax_amount'],
            'notes' => [
                'type' => 'plan_change',
                'plan_id' => $plan->id,
                'plan_code' => $plan->code,
                'plan_name' => $plan->name,
                'billing_cycle' => $billingCycle,
                'base_amount' => $baseAmount,
                'discount_percent' => $plan->discount_percent ?? 0,
                'subtotal' => $subtotal,
                'tax' => $tax,
            ],
        ]);
    }

    /**
     * Customer submits payment proof. Plan stays inactive until Super Admin verifies.
     */
    public function submitPaymentProof(
        SubscriptionPayment $payment,
        string $paymentMethod,
        string $transactionReference
    ): SubscriptionPayment {
        if (! in_array($payment->payment_status, [
            SubscriptionPayment::STATUS_PENDING,
            SubscriptionPayment::STATUS_REJECTED,
        ], true)) {
            throw new InvalidArgumentException('This invoice cannot accept payment proof right now.');
        }

        $plan = $this->planFromPayment($payment);
        if (! $plan) {
            throw new InvalidArgumentException('Invalid payment record — no plan attached.');
        }

        if (! $plan->isPurchasable()) {
            throw new InvalidArgumentException(
                $plan->availability_note
                    ?: ($plan->name.' is '.$plan->availabilityLabel().' and cannot be purchased yet.')
            );
        }

        $payment->update([
            'payment_status' => SubscriptionPayment::STATUS_AWAITING_VERIFICATION,
            'payment_method' => $paymentMethod,
            'transaction_reference' => $transactionReference,
            'payment_date' => now(),
            'notes' => array_merge($payment->notes ?? [], [
                'submitted_at' => now()->toIso8601String(),
                'rejection_reason' => null,
                'verified_at' => null,
                'verified_by' => null,
                'rejected_at' => null,
                'rejected_by' => null,
            ]),
        ]);

        return $payment->fresh();
    }

    /** Super Admin approves a submitted payment and activates the plan. */
    public function verifyPayment(SubscriptionPayment $payment, ?int $adminId = null): Subscription
    {
        if ($payment->payment_status !== SubscriptionPayment::STATUS_AWAITING_VERIFICATION) {
            throw new InvalidArgumentException('Only payments awaiting verification can be approved.');
        }

        if (! filled($payment->transaction_reference)) {
            throw new InvalidArgumentException('This payment has no transaction reference to verify.');
        }

        $plan = $this->planFromPayment($payment);
        if (! $plan) {
            throw new InvalidArgumentException('Invalid payment record — no plan attached.');
        }

        $billingCycle = $payment->notes['billing_cycle'] ?? Subscription::BILLING_MONTHLY;

        return DB::transaction(function () use ($payment, $plan, $billingCycle, $adminId) {
            $payment->update([
                'payment_status' => SubscriptionPayment::STATUS_PAID,
                'payment_date' => $payment->payment_date ?? now(),
                'notes' => array_merge($payment->notes ?? [], [
                    'verified_at' => now()->toIso8601String(),
                    'verified_by' => $adminId,
                    'rejection_reason' => null,
                ]),
            ]);

            $subscription = $payment->subscription()->lockForUpdate()->firstOrFail();
            $startsAt = now();
            $expiresAt = $this->calculateExpiry($startsAt, $billingCycle);

            $subscription->update([
                'plan_id' => $plan->id,
                'status' => Subscription::STATUS_ACTIVE,
                'billing_cycle' => $billingCycle,
                'starts_at' => $startsAt,
                'expires_at' => $expiresAt,
                'trial_ends_at' => null,
                'renewal_date' => $expiresAt,
                'cancelled_at' => null,
                'suspended_at' => null,
                'meta' => array_merge($subscription->meta ?? [], [
                    'last_payment_id' => $payment->id,
                    'last_invoice' => $payment->invoice_number,
                    'activated_via' => 'admin_verified_payment',
                ]),
            ]);

            $this->refreshTenantModuleAccess($subscription->company);

            return $subscription->fresh(['plan.limits', 'plan.features']);
        });
    }

    /** Super Admin rejects a submitted payment (customer can resubmit proof). */
    public function rejectPayment(
        SubscriptionPayment $payment,
        string $reason,
        ?int $adminId = null
    ): SubscriptionPayment {
        if ($payment->payment_status !== SubscriptionPayment::STATUS_AWAITING_VERIFICATION) {
            throw new InvalidArgumentException('Only payments awaiting verification can be rejected.');
        }

        $payment->update([
            'payment_status' => SubscriptionPayment::STATUS_REJECTED,
            'notes' => array_merge($payment->notes ?? [], [
                'rejection_reason' => $reason,
                'rejected_at' => now()->toIso8601String(),
                'rejected_by' => $adminId,
                'verified_at' => null,
                'verified_by' => null,
            ]),
        ]);

        return $payment->fresh();
    }

    protected function planFromPayment(SubscriptionPayment $payment): ?Plan
    {
        $planId = $payment->notes['plan_id'] ?? null;
        if (! $planId) {
            return null;
        }

        return Plan::query()
            ->where('id', $planId)
            ->where('status', Plan::STATUS_ACTIVE)
            ->first();
    }

    protected function paymentPayload(SubscriptionPayment $payment): array
    {
        return [
            'id' => $payment->id,
            'invoice_number' => $payment->invoice_number,
            'amount' => $payment->amount,
            'subtotal' => $payment->subtotal ?? ($payment->notes['subtotal'] ?? null),
            'currency' => $payment->currency,
            'payment_status' => $payment->payment_status,
            'payment_method' => $payment->payment_method,
            'transaction_reference' => $payment->transaction_reference,
            'payment_date' => $payment->payment_date,
            'plan_name' => $payment->notes['plan_name'] ?? null,
            'billing_cycle' => $payment->notes['billing_cycle'] ?? null,
            'discount_percent' => $payment->notes['discount_percent'] ?? 0,
            'base_amount' => $payment->notes['base_amount'] ?? null,
            'tax_enabled' => (bool) $payment->tax_enabled,
            'tax_mode' => $payment->tax_mode,
            'tax_rate' => (float) $payment->tax_rate,
            'cgst_rate' => (float) $payment->cgst_rate,
            'sgst_rate' => (float) $payment->sgst_rate,
            'igst_rate' => (float) $payment->igst_rate,
            'cgst_amount' => (float) $payment->cgst_amount,
            'sgst_amount' => (float) $payment->sgst_amount,
            'igst_amount' => (float) $payment->igst_amount,
            'tax_amount' => (float) $payment->tax_amount,
            'created_at' => $payment->created_at,
        ];
    }

    protected function closeOpenSubscriptions(Company $company, string $closingStatus, ?int $exceptId = null): void
    {
        $query = $company->subscriptions()
            ->whereIn('status', Subscription::USABLE_STATUSES);

        if ($exceptId) {
            $query->where('id', '!=', $exceptId);
        }

        $query->update([
            'status' => $closingStatus,
            'cancelled_at' => $closingStatus === Subscription::STATUS_CANCELLED ? now() : null,
        ]);
    }

    protected function calculateExpiry(\Carbon\Carbon $startsAt, string $billingCycle): \Carbon\Carbon
    {
        return $billingCycle === Subscription::BILLING_YEARLY
            ? $startsAt->copy()->addYear()
            : $startsAt->copy()->addMonth();
    }

    protected function generateInvoiceNumber(): string
    {
        return 'SUB-INV-'.now()->format('Ymd').'-'.strtoupper(Str::random(6));
    }

    protected function refreshTenantModuleAccess(Company $company): void
    {
        app(TenantRoleProvisioningService::class)->syncModuleAccess($company);
    }
}
