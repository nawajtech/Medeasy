<?php

namespace App\Support;

class SettingDefinitions
{
    public const GROUPS = ['general', 'billing', 'appointments', 'notifications', 'content'];

    public static function all(): array
    {
        return [
            [
                'key' => 'organisation_name',
                'label' => 'Organisation name',
                'group' => 'general',
                'type' => 'text',
                'placeholder' => 'e.g. Apollo Diagnostics',
            ],
            [
                'key' => 'company_logo',
                'label' => 'Company logo',
                'group' => 'general',
                'type' => 'image',
                'placeholder' => 'Upload or paste logo URL',
            ],
            [
                'key' => 'favicon',
                'label' => 'Favicon',
                'group' => 'general',
                'type' => 'image',
                'placeholder' => 'Upload or paste favicon URL',
            ],
            [
                'key' => 'organisation_email',
                'label' => 'Contact email',
                'group' => 'general',
                'type' => 'email',
                'placeholder' => 'contact@organisation.com',
            ],
            [
                'key' => 'organisation_phone',
                'label' => 'Contact phone',
                'group' => 'general',
                'type' => 'tel',
                'placeholder' => '+1 234 567 8900',
            ],
            [
                'key' => 'organisation_address',
                'label' => 'Organisation address',
                'group' => 'general',
                'type' => 'textarea',
                'placeholder' => 'Street, city, state',
            ],
            [
                'key' => 'organisation_website',
                'label' => 'Website',
                'group' => 'general',
                'type' => 'url',
                'placeholder' => 'https://www.organisation.com',
            ],
            [
                'key' => 'organisation_division',
                'label' => 'Division / tagline (shown on bills)',
                'group' => 'general',
                'type' => 'text',
                'placeholder' => 'e.g. MOLECULAR IMAGING DIVISION',
            ],
            [
                'key' => 'currency',
                'label' => 'Default currency',
                'group' => 'billing',
                'type' => 'text',
                'default' => 'USD',
                'placeholder' => 'USD',
            ],
            [
                'key' => 'gst_number',
                'label' => 'GST number (shown on bills)',
                'group' => 'billing',
                'type' => 'text',
                'placeholder' => 'e.g. 19AAECS5237Q1ZN',
            ],
            [
                'key' => 'invoice_footer',
                'label' => 'Invoice footer note',
                'group' => 'billing',
                'type' => 'textarea',
                'placeholder' => 'Thank you for choosing our organisation.',
            ],
            [
                'key' => 'appointment_slot_minutes',
                'label' => 'Default appointment duration (minutes)',
                'group' => 'appointments',
                'type' => 'number',
                'default' => '30',
            ],
            [
                'key' => 'appointment_reminder_hours',
                'label' => 'Appointment reminder (hours before)',
                'group' => 'notifications',
                'type' => 'number',
                'default' => '24',
            ],
            [
                'key' => 'footer_content',
                'label' => 'Footer content',
                'group' => 'content',
                'type' => 'editor',
                'placeholder' => 'Add address, links, copyright, or other footer text…',
            ],
        ];
    }

    public static function keys(): array
    {
        return array_column(self::all(), 'key');
    }

    public static function find(string $key): ?array
    {
        foreach (self::all() as $definition) {
            if ($definition['key'] === $key) {
                return $definition;
            }
        }

        return null;
    }
}
