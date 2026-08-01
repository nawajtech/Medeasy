<?php

namespace App\Services;

use App\Models\Company;
use App\Models\Doctor;
use App\Models\Patient;
use App\Models\User;
use RuntimeException;

class UniqueCodeGenerator
{
    /**
     * Company: {NAME2}/{AUTO}
     * Patient / doctor / user: {COMPANY2}/{NAME2}/{AUTO}
     */
    public function forCompany(string $companyName): string
    {
        $prefix = $this->letters($companyName);

        return $this->unique(
            fn () => $prefix.'/'.$this->suffix(),
            fn (string $code) => Company::withTrashed()->where('code', $code)->exists()
        );
    }

    public function forPatient(string $patientName, string $companyName, int $companyId): string
    {
        return $this->unique(
            fn () => $this->personCode($companyName, $patientName),
            fn (string $code) => Patient::withTrashed()
                ->where('company_id', $companyId)
                ->where('patient_code', $code)
                ->exists()
        );
    }

    public function forDoctor(string $doctorName, string $companyName, int $companyId): string
    {
        return $this->unique(
            fn () => $this->personCode($companyName, $doctorName),
            fn (string $code) => Doctor::withTrashed()
                ->where('company_id', $companyId)
                ->where('doctor_code', $code)
                ->exists()
        );
    }

    public function forUser(string $userName, string $companyName, int $companyId): string
    {
        return $this->unique(
            fn () => $this->personCode($companyName, $userName),
            fn (string $code) => User::withTrashed()
                ->where('company_id', $companyId)
                ->where('user_code', $code)
                ->exists()
        );
    }

    private function personCode(string $companyName, string $personName): string
    {
        return $this->letters($companyName).'/'.$this->letters($personName).'/'.$this->suffix();
    }

    public function letters(string $value, int $length = 2): string
    {
        $clean = strtoupper((string) preg_replace('/[^A-Za-z]/', '', $value));

        if ($clean === '') {
            $clean = 'XX';
        }

        return str_pad(substr($clean, 0, $length), $length, 'X');
    }

    private function suffix(): string
    {
        return str_pad((string) random_int(1, 9999), 4, '0', STR_PAD_LEFT);
    }

    private function unique(callable $make, callable $exists): string
    {
        for ($i = 0; $i < 50; $i++) {
            $code = $make();
            if (! $exists($code)) {
                return $code;
            }
        }

        throw new RuntimeException('Unable to generate a unique code.');
    }
}
