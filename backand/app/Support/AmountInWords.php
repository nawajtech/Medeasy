<?php

namespace App\Support;

class AmountInWords
{
    private const ONES = [
        '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
        'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
        'Seventeen', 'Eighteen', 'Nineteen',
    ];

    private const TENS = [
        '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety',
    ];

    public static function rupees(float $amount): string
    {
        $amount = round(max(0, $amount), 2);
        $rupees = (int) floor($amount);
        $paise = (int) round(($amount - $rupees) * 100);

        $words = strtoupper(self::convert($rupees).' RUPEES');

        if ($paise > 0) {
            $words .= ' AND '.strtoupper(self::convert($paise).' PAISE');
        }

        return $words.' ONLY';
    }

    private static function convert(int $number): string
    {
        if ($number === 0) {
            return 'Zero';
        }

        $parts = [];

        if ($number >= 10000000) {
            $parts[] = self::convert(floor($number / 10000000)).' Crore';
            $number %= 10000000;
        }
        if ($number >= 100000) {
            $parts[] = self::convert(floor($number / 100000)).' Lakh';
            $number %= 100000;
        }
        if ($number >= 1000) {
            $parts[] = self::convert(floor($number / 1000)).' Thousand';
            $number %= 1000;
        }
        if ($number >= 100) {
            $parts[] = self::convert(floor($number / 100)).' Hundred';
            $number %= 100;
        }
        if ($number >= 20) {
            $parts[] = self::TENS[floor($number / 10)];
            $number %= 10;
        }
        if ($number > 0) {
            $parts[] = self::ONES[$number];
        }

        return trim(implode(' ', array_filter($parts)));
    }
}
