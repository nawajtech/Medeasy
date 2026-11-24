<?php

namespace App\Services;

use App\Models\Setting;
use App\Support\TaxCalculator;

class TaxSettingsService
{
    private const KEYS = [
        'tax_enabled',
        'tax_mode',
        'tax_rate',
        'tax_inclusive',
    ];

    /** Resolve tax config for a clinic (diagnostic / patient billing). */
    public function forCompany(int $companyId): array
    {
        $values = Setting::withoutGlobalScopes()
            ->where('company_id', $companyId)
            ->whereIn('key', self::KEYS)
            ->pluck('value', 'key');

        return [
            'enabled' => $this->bool($values->get('tax_enabled'), false),
            'mode' => $this->mode($values->get('tax_mode')),
            'rate' => (float) ($values->get('tax_rate') ?: 0),
            'inclusive' => $this->bool($values->get('tax_inclusive'), false),
        ];
    }

    public function payloadForCompany(int $companyId): array
    {
        $config = $this->forCompany($companyId);

        return array_merge($config, [
            'modes' => $this->modeOptions(),
        ]);
    }

    private function modeOptions(): array
    {
        return [
            ['value' => TaxCalculator::MODE_CGST_SGST, 'label' => 'CGST + SGST (intra-state)'],
            ['value' => TaxCalculator::MODE_IGST, 'label' => 'IGST (inter-state)'],
        ];
    }

    private function bool(mixed $value, bool $default): bool
    {
        if ($value === null || $value === '') {
            return $default;
        }

        return in_array(strtolower((string) $value), ['1', 'true', 'yes', 'on'], true);
    }

    private function mode(mixed $value): string
    {
        $mode = strtolower(trim((string) ($value ?: TaxCalculator::MODE_CGST_SGST)));

        return $mode === TaxCalculator::MODE_IGST
            ? TaxCalculator::MODE_IGST
            : TaxCalculator::MODE_CGST_SGST;
    }
}
