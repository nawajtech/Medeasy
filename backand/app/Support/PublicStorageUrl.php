<?php

namespace App\Support;

class PublicStorageUrl
{
    public static function toUrl(?string $stored): ?string
    {
        if ($stored === null || $stored === '') {
            return null;
        }

        // Already an absolute app/media or S3 URL — normalize to app media URL when possible.
        if (preg_match('#^https?://#i', $stored)) {
            $relative = self::toRelativePath($stored);
            if ($relative && preg_match('#^(platform|settings|logos|prescriptions)/#', $relative)) {
                return self::appMediaUrl($relative);
            }

            return self::repairStoredPath($stored);
        }

        $relative = self::toRelativePath($stored);
        if (! $relative) {
            return null;
        }

        // Always expose via /api/media so the browser can load private S3 objects.
        return self::appMediaUrl($relative);
    }

    public static function appMediaUrl(string $relative): string
    {
        $request = request();
        $base = ($request && $request->getHttpHost())
            ? $request->getSchemeAndHttpHost()
            : rtrim((string) config('app.url'), '/');

        $segments = array_map('rawurlencode', explode('/', ltrim($relative, '/')));

        return $base.'/api/media/'.implode('/', $segments);
    }

    public static function toStoragePath(?string $stored): ?string
    {
        if ($stored === null || $stored === '') {
            return null;
        }

        $stored = self::repairStoredPath($stored);

        if (preg_match('#^https?://[^/]+/api/media/(.+)$#i', $stored, $matches)) {
            return '/storage/'.ltrim(rawurldecode($matches[1]), '/');
        }

        if (preg_match('#^https?://[^/]+/storage/(.+)$#i', $stored, $matches)) {
            return '/storage/'.ltrim($matches[1], '/');
        }

        // Virtual-hosted–style S3: https://bucket.s3.region.amazonaws.com/key
        if (preg_match('#^https?://[^.]+\.s3[.-][^/]+/(.+)$#i', $stored, $matches)) {
            return '/storage/'.ltrim(rawurldecode($matches[1]), '/');
        }

        // Path-style S3: https://s3.region.amazonaws.com/bucket/key
        if (preg_match('#^https?://s3[.-][^/]+/[^/]+/(.+)$#i', $stored, $matches)) {
            return '/storage/'.ltrim(rawurldecode($matches[1]), '/');
        }

        // Custom AWS_URL base + key
        $awsUrl = rtrim((string) config('filesystems.disks.s3.url'), '/');
        if ($awsUrl !== '' && str_starts_with($stored, $awsUrl.'/')) {
            return '/storage/'.ltrim(substr($stored, strlen($awsUrl) + 1), '/');
        }

        if (preg_match('#^https?://[^/]+/(.+)$#i', $stored, $matches)) {
            $path = ltrim($matches[1], '/');
            if (preg_match('#^(platform|settings|logos|prescriptions)/#', $path)) {
                return '/storage/'.$path;
            }
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
        if ($stored === null || $stored === '') {
            return null;
        }

        if (preg_match('#^(platform|settings|logos|prescriptions)/#', $stored)) {
            return $stored;
        }

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
