<?php

namespace App\Support;

use Illuminate\Contracts\Filesystem\Filesystem;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * Central media disk for public uploads (logos, favicons, prescriptions).
 * Uses S3 when MEDIA_DISK=s3, otherwise local "public".
 */
class MediaStorage
{
    public static function diskName(): string
    {
        $disk = (string) config('filesystems.media', env('MEDIA_DISK', 'public'));

        if ($disk === 'local' || $disk === '') {
            return 'public';
        }

        return $disk;
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

    public static function upload(UploadedFile $file, string $folder = 'images'): string
    {
        $path = self::putFile(trim($folder, '/'), $file);

        if (! is_string($path) || $path === '') {
            throw new \RuntimeException('Failed to upload file to storage.');
        }

        return $path;
    }

    /**
     * Decode a data-URI image and store it. Returns the relative path.
     *
     * @throws \InvalidArgumentException
     */
    public static function putBase64Image(string $base64, string $folder = 'images'): string
    {
        if (! preg_match('/^data:image\/(jpeg|jpg|png|gif|webp|svg\+xml);base64,/i', $base64, $matches)) {
            throw new \InvalidArgumentException('Invalid image upload.');
        }

        $ext = strtolower(str_replace('svg+xml', 'svg', $matches[1]));
        $raw = base64_decode(substr($base64, strpos($base64, ',') + 1), true);

        if ($raw === false) {
            throw new \InvalidArgumentException('Invalid image upload.');
        }

        $mime = match ($ext) {
            'jpg', 'jpeg' => 'image/jpeg',
            'png' => 'image/png',
            'gif' => 'image/gif',
            'webp' => 'image/webp',
            'svg' => 'image/svg+xml',
            default => 'application/octet-stream',
        };

        $path = trim($folder, '/').'/'.Str::uuid().'.'.$ext;

        return self::put($path, $raw, ['ContentType' => $mime]);
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
