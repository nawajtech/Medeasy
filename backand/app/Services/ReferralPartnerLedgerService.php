<?php

namespace App\Services;

use App\Models\DiagnosticOrder;
use App\Models\ReferralCommissionPayout;
use App\Models\ReferralPartner;
use Illuminate\Support\Collection;

class ReferralPartnerLedgerService
{
    public function attachSummary(Collection $partners): Collection
    {
        if ($partners->isEmpty()) {
            return $partners;
        }

        $ids = $partners->pluck('id');
        $earned = DiagnosticOrder::query()
            ->selectRaw('referral_partner_id, COALESCE(SUM(referral_commission_amount), 0) as total')
            ->whereIn('referral_partner_id', $ids)
            ->where('status', '!=', 'cancelled')
            ->where('referral_commission_amount', '>', 0)
            ->groupBy('referral_partner_id')
            ->pluck('total', 'referral_partner_id');

        $paid = ReferralCommissionPayout::query()
            ->selectRaw('referral_partner_id, COALESCE(SUM(amount), 0) as total')
            ->whereIn('referral_partner_id', $ids)
            ->groupBy('referral_partner_id')
            ->pluck('total', 'referral_partner_id');

        return $partners->map(function (ReferralPartner $partner) use ($earned, $paid) {
            $totalEarned = round((float) ($earned[$partner->id] ?? 0), 2);
            $totalPaid = round((float) ($paid[$partner->id] ?? 0), 2);
            $partner->setAttribute('total_earned', $totalEarned);
            $partner->setAttribute('total_paid', $totalPaid);
            $partner->setAttribute('balance_pending', round(max(0, $totalEarned - $totalPaid), 2));

            return $partner;
        });
    }

    public function ledger(ReferralPartner $partner): array
    {
        $commissions = DiagnosticOrder::query()
            ->with(['patient:id,name', 'testType:id,name'])
            ->where('referral_partner_id', $partner->id)
            ->where('status', '!=', 'cancelled')
            ->where('referral_commission_amount', '>', 0)
            ->orderByDesc('created_at')
            ->get()
            ->map(fn (DiagnosticOrder $order) => [
                'id' => $order->id,
                'order_number' => $order->order_number,
                'date' => $order->created_at?->toIso8601String(),
                'patient_name' => $order->patient?->name,
                'test_name' => $order->testType?->name,
                'commission' => (float) $order->referral_commission_amount,
                'status' => $order->status,
            ]);

        $payouts = ReferralCommissionPayout::query()
            ->with('recorder:id,name')
            ->where('referral_partner_id', $partner->id)
            ->orderByDesc('paid_at')
            ->get()
            ->map(fn (ReferralCommissionPayout $payout) => [
                'id' => $payout->id,
                'amount' => (float) $payout->amount,
                'paid_at' => $payout->paid_at?->toIso8601String(),
                'method' => $payout->method,
                'reference' => $payout->reference,
                'notes' => $payout->notes,
                'recorded_by' => $payout->recorder?->name,
            ]);

        $totalEarned = round((float) $commissions->sum('commission'), 2);
        $totalPaid = round((float) $payouts->sum('amount'), 2);

        return [
            'partner' => $partner,
            'summary' => [
                'total_earned' => $totalEarned,
                'total_paid' => $totalPaid,
                'balance_pending' => round(max(0, $totalEarned - $totalPaid), 2),
                'order_count' => $commissions->count(),
                'payout_count' => $payouts->count(),
            ],
            'commissions' => $commissions->values(),
            'payouts' => $payouts->values(),
        ];
    }

    public function recordPayout(ReferralPartner $partner, array $data): ReferralCommissionPayout
    {
        return ReferralCommissionPayout::create([
            'company_id' => $partner->company_id,
            'referral_partner_id' => $partner->id,
            'amount' => $data['amount'],
            'paid_at' => $data['paid_at'],
            'method' => $data['method'] ?? 'cash',
            'reference' => $data['reference'] ?? null,
            'notes' => $data['notes'] ?? null,
            'recorded_by' => auth()->id(),
        ]);
    }
}
