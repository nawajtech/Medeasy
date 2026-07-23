<?php

namespace App\Services;

use App\Models\PlatformSetting;
use App\Support\PlatformSettingDefinitions;
use App\Support\PublicStorageUrl;

class PlatformBrandingService
{
    public function chrome(): array
    {
        $values = PlatformSetting::current()->values ?? [];
        $definitions = collect(PlatformSettingDefinitions::all())->keyBy('key');

        $name = filled($values['organisation_name'] ?? null)
            ? $values['organisation_name']
            : ($definitions->get('organisation_name')['default'] ?? 'ApnaMedi');

        $logo = PublicStorageUrl::toUrl($values['company_logo'] ?? null);
        $favicon = PublicStorageUrl::toUrl($values['favicon'] ?? null) ?: $logo;
        $tagline = filled($values['organisation_division'] ?? null)
            ? $values['organisation_division']
            : ($definitions->get('organisation_division')['default'] ?? 'Healthcare SaaS');

        return [
            'name' => $name,
            'logo' => $logo,
            'favicon' => $favicon,
            'tagline' => $tagline,
            'email' => $values['organisation_email'] ?? null,
            'phone' => $values['organisation_phone'] ?? null,
            'address' => $values['organisation_address'] ?? null,
            'website' => $values['organisation_website'] ?? null,
        ];
    }

    public function rawValues(): array
    {
        return PlatformSetting::current()->values ?? [];
    }
}
