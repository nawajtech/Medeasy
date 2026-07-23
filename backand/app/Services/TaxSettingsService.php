<?php

namespace App\Services;

use App\Models\Plan;
use App\Models\Setting;
use App\Models\SubscriptionTaxSetting;
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

    /** Platform default subscription tax (ApnaMedi → hospital). */
    public function platformSubscriptionTax(): array
    {
        $saved = SubscriptionTaxSetting::query()->first();

        if ($saved) {
            return [
                'enabled' => (bool) $saved->enabled,
                'mode' => $this->mode($saved->mode),
                'rate' => (float) $saved->rate,
                'inclusive' => (bool) $saved->inclusive,
            ];
        }

        $config = config('tax.subscription', []);

        return [
            'enabled' => (bool) ($config['enabled'] ?? false),
            'mode' => $this->mode($config['mode'] ?? TaxCalculator::MODE_IGST),
            'rate' => (float) ($config['rate'] ?? 0),
            'inclusive' => (bool) ($config['inclusive'] ?? false),
        ];
    }

    /** Subscription tax for checkout — uses the plan's own tax settings. */
    public function forSubscription(?Plan $plan = null): array
    {
        if (! $plan) {
            return $this->platformSubscriptionTax();
        }

        return [
            'enabled' => (bool) ($plan->tax_enabled ?? true),
            'mode' => $this->mode($plan->tax_mode),
            'rate' => (float) ($plan->tax_rate ?? 0),
            'inclusive' => (bool) ($plan->tax_inclusive ?? false),
        ];
    }

    public function subscriptionTaxPayload(): array
    {
        $config = $this->platformSubscriptionTax();

        return array_merge($config, [
            'modes' => $this->modeOptions(),
        ]);
    }

    public function payloadForCompany(int $companyId): array
    {
        $config = $this->forCompany($companyId);

        return array_merge($config, [
            'modes' => $this->modeOptions(),
        ]);
    }

    public function savePlatformSubscriptionTax(array $data, ?int $userId = null): array
    {
        $row = SubscriptionTaxSetting::query()->firstOrNew(['id' => 1]);
        $row->fill([
            'enabled' => (bool) ($data['enabled'] ?? false),
            'mode' => $this->mode($data['mode'] ?? TaxCalculator::MODE_IGST),
            'rate' => round(max(0, (float) ($data['rate'] ?? 0)), 2),
            'inclusive' => (bool) ($data['inclusive'] ?? false),
            'updated_by' => $userId,
        ]);
        $row->save();

        return $this->subscriptionTaxPayload();
    }

    /** Defaults applied when the super admin creates a new plan. */
    public function defaultPlanTax(): array
    {
        $platform = $this->platformSubscriptionTax();

        return [
            'tax_enabled' => $platform['enabled'],
            'tax_mode' => $platform['mode'],
            'tax_rate' => $platform['rate'],
            'tax_inclusive' => $platform['inclusive'],
        ];
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
