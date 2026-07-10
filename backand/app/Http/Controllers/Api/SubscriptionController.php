<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Plan;
use App\Models\SubscriptionPayment;
use App\Services\SubscriptionService;
use App\Services\TaxSettingsService;
use App\Support\TaxCalculator;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use InvalidArgumentException;

class SubscriptionController extends Controller
{
    public function plans(TaxSettingsService $taxSettings): JsonResponse
    {
        $plans = Plan::query()
            ->where('status', Plan::STATUS_ACTIVE)
            ->with(['enabledFeatures:id,key,name', 'limits:id,plan_id,limit_key,limit_value'])
            ->orderBy('display_order')
            ->get()
            ->map(function (Plan $plan) use ($taxSettings) {
                $monthlySubtotal = $plan->discountedAmount('monthly');
                $yearlySubtotal = $plan->discountedAmount('yearly');
                $taxConfig = $taxSettings->forSubscription($plan);
                $monthlyTax = TaxCalculator::apply($monthlySubtotal, $taxConfig);
                $yearlyTax = TaxCalculator::apply($yearlySubtotal, $taxConfig);

                return [
                    'id' => $plan->id,
                    'code' => $plan->code,
                    'name' => $plan->name,
                    'description' => $plan->description,
                    'monthly_price' => $plan->monthly_price,
                    'yearly_price' => $plan->yearly_price,
                    'discount_percent' => $plan->discount_percent ?? 0,
                    'monthly_price_final' => $monthlySubtotal,
                    'yearly_price_final' => $yearlySubtotal,
                    'monthly_total' => $monthlyTax['grand_total'],
                    'yearly_total' => $yearlyTax['grand_total'],
                    'currency' => $plan->currency,
                    'tax_enabled' => (bool) $plan->tax_enabled,
                    'tax_mode' => $plan->tax_mode,
                    'tax_rate' => (float) $plan->tax_rate,
                    'tax_inclusive' => (bool) $plan->tax_inclusive,
                    'trial_days' => $plan->trial_days,
                    'features' => $plan->enabledFeatures->pluck('key')->values(),
                    'limits' => $plan->limits->mapWithKeys(
                        fn ($limit) => [$limit->limit_key => $limit->limit_value]
                    ),
                ];
            });

        return response()->json([
            'plans' => $plans,
            'payment_methods' => config('subscription.payment_methods', []),
        ]);
    }

    public function payments(Request $request, SubscriptionService $subscriptions): JsonResponse
    {
        $company = $request->user()->company;

        if (! $company) {
            return response()->json(['message' => 'No organization linked to this account.'], 404);
        }

        return response()->json([
            'payments' => $subscriptions->paymentHistory($company),
        ]);
    }

    /** Step 1: create a pending invoice for the selected plan. */
    public function checkout(Request $request, SubscriptionService $subscriptions): JsonResponse
    {
        $validated = $request->validate([
            'plan_id' => ['required', 'integer', 'exists:plans,id'],
            'billing_cycle' => ['required', 'in:monthly,yearly'],
        ]);

        $company = $request->user()->company;

        if (! $company) {
            return response()->json(['message' => 'No organization linked to this account.'], 404);
        }

        $plan = Plan::query()
            ->where('id', $validated['plan_id'])
            ->where('status', Plan::STATUS_ACTIVE)
            ->firstOrFail();

        try {
            $payment = $subscriptions->createCheckout(
                $company,
                $plan,
                $validated['billing_cycle']
            );
        } catch (InvalidArgumentException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return response()->json([
            'message' => 'Invoice created. Complete payment to activate your plan.',
            'payment' => [
                'id' => $payment->id,
                'invoice_number' => $payment->invoice_number,
                'amount' => $payment->amount,
                'subtotal' => $payment->subtotal,
                'base_amount' => $payment->notes['base_amount'] ?? $payment->subtotal,
                'discount_percent' => $payment->notes['discount_percent'] ?? 0,
                'currency' => $payment->currency,
                'payment_status' => $payment->payment_status,
                'plan_name' => $plan->name,
                'billing_cycle' => $validated['billing_cycle'],
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
            ],
        ], 201);
    }

    /** Step 2: confirm payment — only then is the plan activated. */
    public function confirmPayment(Request $request, SubscriptionService $subscriptions, int $paymentId): JsonResponse
    {
        $validated = $request->validate([
            'payment_method' => ['required', 'string', Rule::in(array_keys(config('subscription.payment_methods', [])))],
            'transaction_reference' => ['required', 'string', 'max:120'],
        ]);

        $company = $request->user()->company;

        if (! $company) {
            return response()->json(['message' => 'No organization linked to this account.'], 404);
        }

        $payment = SubscriptionPayment::query()
            ->where('id', $paymentId)
            ->whereHas('subscription', fn ($q) => $q->where('company_id', $company->id))
            ->firstOrFail();

        try {
            $subscriptions->confirmPayment(
                $payment,
                $validated['payment_method'],
                $validated['transaction_reference']
            );
        } catch (InvalidArgumentException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return response()->json([
            'message' => 'Payment confirmed. Your subscription plan is now active.',
            'subscription' => $subscriptions->subscriptionSummary($company),
        ]);
    }
}
