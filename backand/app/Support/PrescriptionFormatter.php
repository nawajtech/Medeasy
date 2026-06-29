<?php

namespace App\Support;

class PrescriptionFormatter
{
    public static function findingsToHtml(?string $text): string
    {
        if (! filled($text)) {
            return '';
        }

        $html = '';
        foreach (preg_split('/\r\n|\r|\n/', $text) as $line) {
            $trimmed = trim($line);
            if ($trimmed === '') {
                $html .= '<br>';
                continue;
            }

            if (self::isSectionHeading($trimmed)) {
                $html .= '<p class="rx-section-title"><strong>'.e(rtrim($trimmed, ':')).':</strong></p>';
                continue;
            }

            $html .= '<p class="rx-line">'.self::emphasizeInlineBold($trimmed).'</p>';
        }

        return $html;
    }

    private static function isSectionHeading(string $line): bool
    {
        if (preg_match('/^[A-Z0-9][A-Z0-9\s\/\-\.&\(\)]{1,40}:?\s*$/u', $line)) {
            return true;
        }

        return (bool) preg_match('/^(LIVER|GALL\s*BLADDER|CBD|SPLEEN|PANCREAS|KIDNEY|PROSTATE|UTERUS|OVARY|IMPRESSION|ADVICE|FINDINGS)\b/i', $line);
    }

    private static function emphasizeInlineBold(string $line): string
    {
        return preg_replace('/\*\*(.+?)\*\*/', '<strong>$1</strong>', e($line));
    }
}
