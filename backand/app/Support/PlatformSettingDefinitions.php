<?php

namespace App\Support;

class PlatformSettingDefinitions
{
    /** Platform branding fields (mirrors company general settings). */
    public static function all(): array
    {
        return [
            [
                'key' => 'organisation_name',
                'label' => 'Platform name',
                'group' => 'general',
                'type' => 'text',
                'default' => 'ApnaMedi',
                'placeholder' => 'e.g. ApnaMedi',
            ],
            [
                'key' => 'company_logo',
                'label' => 'Platform logo',
                'group' => 'general',
                'type' => 'image',
                'placeholder' => 'Upload platform logo',
            ],
            [
                'key' => 'favicon',
                'label' => 'Favicon',
                'group' => 'general',
                'type' => 'image',
                'placeholder' => 'Upload favicon',
            ],
            [
                'key' => 'organisation_email',
                'label' => 'Contact email',
                'group' => 'general',
                'type' => 'email',
                'placeholder' => 'support@apnamedi.com',
            ],
            [
                'key' => 'organisation_phone',
                'label' => 'Contact phone',
                'group' => 'general',
                'type' => 'tel',
                'placeholder' => '+91 98765 43210',
            ],
            [
                'key' => 'organisation_address',
                'label' => 'Platform address',
                'group' => 'general',
                'type' => 'textarea',
                'placeholder' => 'Street, city, state',
            ],
            [
                'key' => 'organisation_country',
                'label' => 'Country',
                'group' => 'general',
                'type' => 'text',
                'default' => 'India',
                'placeholder' => 'e.g. India',
            ],
            [
                'key' => 'organisation_pincode',
                'label' => 'Pincode / ZIP',
                'group' => 'general',
                'type' => 'text',
                'placeholder' => 'e.g. 700001',
            ],
            [
                'key' => 'organisation_website',
                'label' => 'Website',
                'group' => 'general',
                'type' => 'url',
                'placeholder' => 'https://www.apnamedi.com',
            ],
            [
                'key' => 'organisation_division',
                'label' => 'Tagline',
                'group' => 'general',
                'type' => 'text',
                'default' => 'Healthcare SaaS',
                'placeholder' => 'e.g. Healthcare Management, Made Easy',
            ],
        ];
    }

    public static function keys(): array
    {
        return array_column(self::all(), 'key');
    }

    public static function imageKeys(): array
    {
        return collect(self::all())->where('type', 'image')->pluck('key')->all();
    }
}
