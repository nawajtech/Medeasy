<?php

namespace App\Support;

class PublicStorageUrl
{
    public static function toUrl(?string $stored): ?string
    {
        if ($stored === null || $stored === '') {
            return null;
        }

        $relative = self::toRelativePath($stored);

        if (! $relative) {
            return null;
        }

        $request = request();
        $base = ($request && $request->getHttpHost())
            ? $request->getSchemeAndHttpHost()
            : rtrim((string) config('app.url'), '/');

        // Use /api/media/... so images work when only /api is proxied to Laravel.
        $segments = array_map('rawurlencode', explode('/', $relative));

        return $base.'/api/media/'.implode('/', $segments);
    }

    public static function toStoragePath(?string $stored): ?string
    {
        if ($stored === null || $stored === '') {
            return null;
        }

        $stored = self::repairStoredPath($stored);

        if (preg_match('#^https?://[^/]+(/api/media/.+)$#i', $stored, $matches)) {
            return '/storage/'.ltrim(rawurldecode(substr($matches[1], strlen('/api/media/'))), '/');
        }

        if (preg_match('#^https?://[^/]+(/storage/.+)$#i', $stored, $matches)) {
            return self::repairStoragePath($matches[1]);
        }

        if (str_starts_with($stored, '/api/media/')) {
            return '/storage/'.ltrim(rawurldecode(substr($stored, strlen('/api/media/'))), '/');
        }

        if (str_starts_with($stored, '/storage/')) {
            return self::repairStoragePath($stored);
        }

        return '/storage/'.ltrim($stored, '/');
    }

    public static function toRelativePath(?string $stored): ?string
    {
        $path = self::toStoragePath($stored);

        if (! $path) {
            return null;
        }

        $prefix = '/storage/';
        if (str_starts_with($path, $prefix)) {
            return substr($path, strlen($prefix));
        }

        return ltrim($path, '/');
    }

    public static function repairStoredPath(string $stored): string
    {
        if (str_starts_with($stored, 'ings/')) {
            return 'settings/'.substr($stored, 5);
        }

        if (preg_match('#/storage/ings/(.+)$#', $stored, $matches)) {
            return preg_replace('#/storage/ings/#', '/storage/settings/', $stored);
        }

        return $stored;
    }

    private static function repairStoragePath(string $path): string
    {
        return str_replace('/storage/ings/', '/storage/settings/', $path);
    }
}
