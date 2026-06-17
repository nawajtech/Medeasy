<?php

namespace App\Support;

class SettingDefinitions
{
    public const GROUPS = ['general', 'billing', 'appointments', 'notifications', 'content'];

    public static function all(): array
    {
        return [
            [
                'key' => 'clinic_name',
                'label' => 'Clinic / organization name',
                'group' => 'general',
                'type' => 'text',
                'placeholder' => 'e.g. Apollo Clinic',
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
                'key' => 'clinic_email',
                'label' => 'Contact email',
                'group' => 'general',
                'type' => 'email',
                'placeholder' => 'contact@clinic.com',
            ],
            [
                'key' => 'clinic_phone',
                'label' => 'Contact phone',
                'group' => 'general',
                'type' => 'tel',
                'placeholder' => '+1 234 567 8900',
            ],
            [
                'key' => 'clinic_address',
                'label' => 'Clinic address',
                'group' => 'general',
                'type' => 'textarea',
                'placeholder' => 'Street, city, state',
            ],
            [
                'key' => 'clinic_website',
                'label' => 'Website',
                'group' => 'general',
                'type' => 'url',
                'placeholder' => 'https://www.clinic.com',
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
                'key' => 'invoice_footer',
                'label' => 'Invoice footer note',
                'group' => 'billing',
                'type' => 'textarea',
                'placeholder' => 'Thank you for choosing our clinic.',
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
