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
     * Referral/package discounts first, then GST (CGST+SGST or IGST).
     *
     * @return array<string, float|bool|string|null>
     */
    public function calculate(
        float $grossAmount,
        float $testCommission,
        ?ReferralPartner $partner,
        bool $deductCommission,
        int $companyId,
    ): array {
        $referral = $this->referralBilling->calculate(
            $grossAmount,
            $testCommission,
            $partner,
            $deductCommission
        );

        $tax = TaxCalculator::apply(
            (float) $referral['net_amount'],
            $this->taxSettings->forCompany($companyId)
        );

        return array_merge($referral, $tax, [
            'net_amount' => $tax['taxable_amount'],
            'amount' => $tax['grand_total'],
        ]);
    }
}
