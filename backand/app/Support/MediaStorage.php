<?php

namespace App\Support;

use Illuminate\Contracts\Filesystem\Filesystem;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

/**
 * Central media disk for public uploads (logos, favicons, prescriptions).
 * Uses S3 when FILESYSTEM_DISK=s3 (or MEDIA_DISK=s3), otherwise local "public".
 */
class MediaStorage
{
    public static function diskName(): string
    {
        $disk = config('filesystems.media', env('MEDIA_DISK', env('FILESYSTEM_DISK', 'public')));

        if ($disk === 'local') {
            return 'public';
        }

        return $disk ?: 'public';
    }

    public static function disk(): Filesystem
    {
        return Storage::disk(self::diskName());
    }

    public static function usesS3(): bool
    {
        return self::diskName() === 's3';
    }

    public static function assertReady(): void
    {
        if (! self::usesS3()) {
            return;
        }

        $key = (string) config('filesystems.disks.s3.key');
        $secret = (string) config('filesystems.disks.s3.secret');
        $bucket = (string) config('filesystems.disks.s3.bucket');

        if ($key === '' || $secret === '' || $bucket === '') {
            abort(500, 'S3 is enabled (MEDIA_DISK=s3) but AWS credentials are missing. Set AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, and AWS_BUCKET in backand/.env, then run: php artisan config:clear');
        }
    }

    public static function put(string $path, string $contents, array $options = []): string
    {
        self::assertReady();

        // Avoid ACL "public" on S3 buckets with ACLs disabled; use a bucket policy instead.
        if (! self::usesS3() && ! array_key_exists('visibility', $options)) {
            $options['visibility'] = 'public';
        }

        self::disk()->put($path, $contents, $options);

        return $path;
    }

    public static function putFile(string $directory, $file, array $options = []): string|false
    {
        self::assertReady();

        if (! self::usesS3() && ! array_key_exists('visibility', $options)) {
            $options['visibility'] = 'public';
        }

        return self::disk()->putFile($directory, $file, $options);
    }

    public static function delete(?string $path): void
    {
        $relative = PublicStorageUrl::toRelativePath($path);
        if (! $relative) {
            return;
        }

        try {
            $disk = self::disk();
            if ($disk->exists($relative)) {
                $disk->delete($relative);
            }
        } catch (\Throwable $e) {
            // Don't block replace/upload if the old object is already gone
            // or the IAM user lacks s3:DeleteObject.
            Log::warning('Media delete skipped', [
                'disk' => self::diskName(),
                'path' => $relative,
                'error' => $e->getMessage(),
            ]);
        }
    }

    public static function url(?string $path): ?string
    {
        return PublicStorageUrl::toUrl($path);
    }

    public static function exists(?string $path): bool
    {
        $relative = PublicStorageUrl::toRelativePath($path);

        return $relative ? self::disk()->exists($relative) : false;
    }
}
