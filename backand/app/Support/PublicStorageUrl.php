<?php

namespace App\Support;

class PublicStorageUrl
{
    public static function toUrl(?string $stored): ?string
    {
        if ($stored === null || $stored === '') {
            return null;
        }

        // Absolute URLs (S3 / CDN / legacy full public URLs)
        if (preg_match('#^https?://#i', $stored)) {
            return self::repairStoredPath($stored);
        }

        // Media disk (S3 by default) for relative paths
        if (config('filesystems.media', 's3') !== 'public') {
            return S3Storage::url($stored);
        }

        $path = self::toStoragePath($stored);

        $request = request();
        $base = ($request && $request->getHttpHost())
            ? $request->getSchemeAndHttpHost()
            : rtrim((string) config('app.url'), '/');

        return $base.$path;
    }

    public static function toStoragePath(?string $stored): ?string
    {
        if ($stored === null || $stored === '') {
            return null;
        }

        $stored = self::repairStoredPath($stored);

        if (preg_match('#^https?://[^/]+(/storage/.+)$#i', $stored, $matches)) {
            return self::repairStoragePath($matches[1]);
        }

        if (str_starts_with($stored, '/storage/')) {
            return self::repairStoragePath($stored);
        }

        return '/storage/'.ltrim($stored, '/');
    }

    public static function toRelativePath(?string $stored): ?string
    {
        return S3Storage::relativePath($stored);
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
