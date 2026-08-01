<?php

namespace App\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

class PhoneNumber implements ValidationRule
{
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if ($value === null || $value === '') {
            return;
        }

        $phone = trim((string) $value);

        if (! preg_match('/^\+?[0-9][0-9\s\-()]*[0-9]$/', $phone) && ! preg_match('/^\+?[0-9]{10,15}$/', $phone)) {
            $fail('The :attribute must be a valid phone number.');

            return;
        }

        $digits = preg_replace('/\D+/', '', $phone) ?? '';

        if (strlen($digits) < 10 || strlen($digits) > 15) {
            $fail('The :attribute must contain 10 to 15 digits (optional +country code).');
        }
    }
}
