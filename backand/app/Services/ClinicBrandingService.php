<?php

namespace App\Services;

use App\Models\Company;
use App\Models\Setting;
use App\Support\PublicStorageUrl;

class ClinicBrandingService
{
    private const KEYS = [
        'organisation_name',
        'company_logo',
        'organisation_email',
        'organisation_phone',
        'organisation_address',
        'organisation_website',
        'organisation_division',
        'footer_content',
        'invoice_footer',
        'currency',
        'gst_number',
    ];

    /** @deprecated Legacy keys kept for backward compatibility */
    private const LEGACY_KEY_MAP = [
        'organisation_name' => 'clinic_name',
        'organisation_email' => 'clinic_email',
        'organisation_phone' => 'clinic_phone',
        'organisation_address' => 'clinic_address',
        'organisation_website' => 'clinic_website',
        'organisation_division' => 'clinic_division',
    ];

    public function forCompany(int $companyId): array
    {
        $company = Company::find($companyId);

        $lookupKeys = array_merge(self::KEYS, array_values(self::LEGACY_KEY_MAP));

        $settings = Setting::where('company_id', $companyId)
            ->whereIn('key', $lookupKeys)
            ->pluck('value', 'key');

        return [
            'name' => $this->setting($settings, 'organisation_name') ?: $company?->name ?? 'ApnaMedi Organisation',
            'division' => $this->setting($settings, 'organisation_division') ?? '',
            'logo' => PublicStorageUrl::toUrl($settings->get('company_logo'))
                ?: PublicStorageUrl::toUrl($company?->logo_url),
            'email' => $this->setting($settings, 'organisation_email') ?: $company?->email,
            'phone' => $this->setting($settings, 'organisation_phone') ?: $company?->phone,
            'address' => $this->setting($settings, 'organisation_address') ?: $company?->address,
            'website' => $this->setting($settings, 'organisation_website') ?: $company?->website,
            'gst_number' => $settings->get('gst_number') ?: $company?->gst_number,
            'footer_content' => $settings->get('footer_content') ?? '',
            'invoice_footer' => $settings->get('invoice_footer') ?? '',
            'currency' => $settings->get('currency') ?: ($company?->currency ?? 'INR'),
        ];
    }

    private function setting($settings, string $key): ?string
    {
        $value = $settings->get($key);
        if (filled($value)) {
            return $value;
        }

        $legacy = self::LEGACY_KEY_MAP[$key] ?? null;

        return $legacy ? $settings->get($legacy) : null;
    }

    public function currencySymbol(string $currency): string
    {
        return match (strtoupper(trim($currency))) {
            'USD' => '$',
            'EUR' => '€',
            'GBP' => '£',
            'INR' => '₹',
            'PKR' => 'Rs ',
            'AED' => 'AED ',
            'SAR' => 'SAR ',
            default => strtoupper($currency).' ',
        };
    }
}
