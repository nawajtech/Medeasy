<?php

namespace App\Services;

use App\Models\ReferralPartner;
use App\Support\TaxCalculator;

class DiagnosticOrderBillingService
{
    public function __construct(
        private ReferralBillingService $referralBilling,
        private TaxSettingsService $taxSettings,
    ) {}

    /**
     * Referral/package discounts first, then optional extra discount, then GST (CGST+SGST or IGST).
     *
     * @return array<string, float|bool|string|null>
     */
    public function calculate(
        float $grossAmount,
        float $testCommission,
        ?ReferralPartner $partner,
        bool $deductCommission,
        int $companyId,
        float $extraDiscount = 0,
    ): array {
        $referral = $this->referralBilling->calculate(
            $grossAmount,
            $testCommission,
            $partner,
            $deductCommission
        );

        $preExtraNet = (float) $referral['net_amount'];
        $extra = round(min(max(0, $extraDiscount), $preExtraNet), 2);
        $afterExtra = round(max(0, $preExtraNet - $extra), 2);

        $tax = TaxCalculator::apply(
            $afterExtra,
            $this->taxSettings->forCompany($companyId)
        );

        return array_merge($referral, $tax, [
            'extra_discount' => $extra,
            'net_amount' => $tax['taxable_amount'],
            'amount' => $tax['grand_total'],
        ]);
    }
}
