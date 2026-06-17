<?php

namespace App\Services;

use App\Models\Company;
use App\Models\Setting;
use App\Support\PublicStorageUrl;

class ClinicBrandingService
{
    private const KEYS = [
        'clinic_name',
        'company_logo',
        'clinic_email',
        'clinic_phone',
        'clinic_address',
        'clinic_website',
        'footer_content',
        'invoice_footer',
        'currency',
    ];

    public function forCompany(int $companyId): array
    {
        $company = Company::find($companyId);

        $settings = Setting::where('company_id', $companyId)
            ->whereIn('key', self::KEYS)
            ->pluck('value', 'key');

        return [
            'name' => $settings->get('clinic_name') ?: $company?->name ?? 'MedEasy Clinic',
            'logo' => PublicStorageUrl::toUrl($settings->get('company_logo'))
                ?: PublicStorageUrl::toUrl($company?->logo_url),
            'email' => $settings->get('clinic_email') ?: $company?->email,
            'phone' => $settings->get('clinic_phone') ?: $company?->phone,
            'address' => $settings->get('clinic_address') ?: $company?->address,
            'website' => $settings->get('clinic_website') ?: $company?->website,
            'footer_content' => $settings->get('footer_content') ?? '',
            'invoice_footer' => $settings->get('invoice_footer') ?? '',
            'currency' => $settings->get('currency') ?: ($company?->currency ?? 'USD'),
        ];
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
