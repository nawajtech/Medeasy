<?php

namespace App\Support;

class UserAgentParser
{
    /**
     * @return array{device: string, browser: string}
     */
    public static function parse(?string $userAgent): array
    {
        $ua = $userAgent ?? '';

        $device = 'Desktop';
        if (preg_match('/Mobile|Android|iPhone|iPad/i', $ua)) {
            $device = preg_match('/iPad|Tablet/i', $ua) ? 'Tablet' : 'Mobile';
        }

        $browser = 'Unknown';
        if (preg_match('/Edg\/([\d.]+)/i', $ua)) {
            $browser = 'Edge';
        } elseif (preg_match('/Chrome\/([\d.]+)/i', $ua) && ! preg_match('/Edg/i', $ua)) {
            $browser = 'Chrome';
        } elseif (preg_match('/Firefox\/([\d.]+)/i', $ua)) {
            $browser = 'Firefox';
        } elseif (preg_match('/Safari\/([\d.]+)/i', $ua) && ! preg_match('/Chrome/i', $ua)) {
            $browser = 'Safari';
        } elseif (preg_match('/MSIE|Trident/i', $ua)) {
            $browser = 'Internet Explorer';
        }

        return ['device' => $device, 'browser' => $browser];
    }
}
