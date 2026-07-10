<?php

namespace App\Support;

class TaxCalculator
{
    public const MODE_CGST_SGST = 'cgst_sgst';

    public const MODE_IGST = 'igst';

    /**
     * Apply tax to a taxable amount (after discounts).
     *
     * @param  array{enabled?: bool, mode?: string, rate?: float|int|string, inclusive?: bool}  $config
     * @return array{
     *     tax_enabled: bool,
     *     tax_mode: ?string,
     *     tax_rate: float,
     *     tax_inclusive: bool,
     *     taxable_amount: float,
     *     cgst_rate: float,
     *     sgst_rate: float,
     *     igst_rate: float,
     *     cgst_amount: float,
     *     sgst_amount: float,
     *     igst_amount: float,
     *     tax_amount: float,
     *     grand_total: float
     * }
     */
    public static function apply(float $amount, array $config): array
    {
        $enabled = (bool) ($config['enabled'] ?? false);
        $mode = (string) ($config['mode'] ?? self::MODE_CGST_SGST);
        $rate = round(max(0, (float) ($config['rate'] ?? 0)), 2);
        $inclusive = (bool) ($config['inclusive'] ?? false);

        $empty = [
            'tax_enabled' => false,
            'tax_mode' => null,
            'tax_rate' => 0.0,
            'tax_inclusive' => false,
            'taxable_amount' => round(max(0, $amount), 2),
            'cgst_rate' => 0.0,
            'sgst_rate' => 0.0,
            'igst_rate' => 0.0,
            'cgst_amount' => 0.0,
            'sgst_amount' => 0.0,
            'igst_amount' => 0.0,
            'tax_amount' => 0.0,
            'grand_total' => round(max(0, $amount), 2),
        ];

        if (! $enabled || $rate <= 0) {
            return $empty;
        }

        if ($inclusive) {
            $taxable = round($amount / (1 + ($rate / 100)), 2);
            $taxTotal = round($amount - $taxable, 2);
            $grand = round($amount, 2);
        } else {
            $taxable = round(max(0, $amount), 2);
            $taxTotal = round($taxable * ($rate / 100), 2);
            $grand = round($taxable + $taxTotal, 2);
        }

        $cgstRate = 0.0;
        $sgstRate = 0.0;
        $igstRate = 0.0;
        $cgstAmount = 0.0;
        $sgstAmount = 0.0;
        $igstAmount = 0.0;

        if ($mode === self::MODE_IGST) {
            $igstRate = $rate;
            $igstAmount = $taxTotal;
        } else {
            $halfRate = round($rate / 2, 2);
            $cgstRate = $halfRate;
            $sgstRate = $halfRate;
            $cgstAmount = round($taxTotal / 2, 2);
            $sgstAmount = round($taxTotal - $cgstAmount, 2);
        }

        return [
            'tax_enabled' => true,
            'tax_mode' => $mode,
            'tax_rate' => $rate,
            'tax_inclusive' => $inclusive,
            'taxable_amount' => $taxable,
            'cgst_rate' => $cgstRate,
            'sgst_rate' => $sgstRate,
            'igst_rate' => $igstRate,
            'cgst_amount' => $cgstAmount,
            'sgst_amount' => $sgstAmount,
            'igst_amount' => $igstAmount,
            'tax_amount' => $taxTotal,
            'grand_total' => $grand,
        ];
    }
}
