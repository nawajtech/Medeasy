<?php

namespace App\Support;

use App\Rules\PhoneNumber;

class ContactRules
{
    /** @return list<string|\Illuminate\Contracts\Validation\ValidationRule> */
    public static function email(bool $required = true): array
    {
        return [
            $required ? 'required' : 'nullable',
            'string',
            'max:255',
            'email:rfc,filter',
        ];
    }

    /** @return list<string|\Illuminate\Contracts\Validation\ValidationRule> */
    public static function phone(bool $required = true): array
    {
        return [
            $required ? 'required' : 'nullable',
            'string',
            'max:20',
            new PhoneNumber,
        ];
    }

    public static function isValidEmail(?string $email): bool
    {
        if ($email === null || trim($email) === '') {
            return false;
        }

        return (bool) filter_var(trim($email), FILTER_VALIDATE_EMAIL);
    }

    public static function isValidPhone(?string $phone): bool
    {
        if ($phone === null || trim($phone) === '') {
            return false;
        }

        $failed = false;
        (new PhoneNumber)->validate('phone', $phone, function () use (&$failed) {
            $failed = true;
        });

        return ! $failed;
    }
}
