<?php

namespace App\Services;

use App\Models\ReferralPartner;

class ReferralBillingService
{
    /**
     * Commission is earned by the referral partner (normal + extra).
     * When deduct is enabled, total commission is subtracted from the bill — never added.
     * Total commission is capped at the original test price.
     *
     * @return array{
     *     gross_amount: float,
     *     referral_commission_amount: float,
     *     referral_discount: float,
     *     surcharge_amount: float,
     *     net_amount: float
     * }
     */
    public function calculate(float $grossAmount, float $testCommission, ?ReferralPartner $partner, bool $deductCommission): array
    {
        $gross = round(max(0, $grossAmount), 2);
        $normal = $partner ? round(max(0, $testCommission), 2) : 0.0;
        $extra = $partner ? $this->extraCommissionAmount($gross, $partner) : 0.0;
        $totalCommission = round(min($gross, $normal + $extra), 2);
        $discount = ($partner && $deductCommission) ? $totalCommission : 0.0;
        $net = round(max(0, $gross - $discount), 2);

        return [
            'gross_amount' => $gross,
            'referral_commission_amount' => $totalCommission,
            'referral_discount' => $discount,
            'surcharge_amount' => $extra,
            'net_amount' => $net,
        ];
    }

    /** Partner-specific extra commission (stored as surcharge_type/value on partner). */
    public function extraCommissionAmount(float $grossAmount, ReferralPartner $partner): float
    {
        if (! $partner->surcharge_type || (float) $partner->surcharge_value <= 0) {
            return 0.0;
        }

        if ($partner->surcharge_type === 'percentage') {
            return round($grossAmount * ((float) $partner->surcharge_value / 100), 2);
        }

        return round((float) $partner->surcharge_value, 2);
    }
}
