<?php

namespace App\Support;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Contracts\Filesystem\Filesystem;

class S3Storage
{
    /**
     * Disk used for public media (images, uploads).
     * Defaults to `s3`; set MEDIA_DISK=public for local development.
     */
    public static function diskName(): string
    {
        return (string) config('filesystems.media', 's3');
    }

    public static function disk(): Filesystem
    {
        return Storage::disk(self::diskName());
    }

    /**
     * Store an uploaded file and return the relative path.
     */
    public static function upload(UploadedFile $file, string $folder = 'images'): string
    {
        $path = self::disk()->putFile(trim($folder, '/'), $file, 'public');

        if (! is_string($path) || $path === '') {
            throw new \RuntimeException('Failed to upload file to storage.');
        }

        return $path;
    }

    /**
     * Store raw binary contents and return the relative path.
     */
    public static function put(string $contents, string $folder, string $extension, ?string $contentType = null): string
    {
        $folder = trim($folder, '/');
        $path = $folder.'/'.Str::uuid().'.'.strtolower(ltrim($extension, '.'));

        $options = ['visibility' => 'public'];
        if ($contentType) {
            $options['ContentType'] = $contentType;
        }

        self::disk()->put($path, $contents, $options);

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

        return self::put($raw, $folder, $ext, $mime);
    }

    /**
     * Public URL for a stored relative path (or absolute URL passthrough).
     */
    public static function url(?string $path): ?string
    {
        if ($path === null || $path === '') {
            return null;
        }

        if (preg_match('#^https?://#i', $path)) {
            return $path;
        }

        $relative = self::relativePath($path);

        if (! $relative) {
            return null;
        }

        return self::disk()->url($relative);
    }

    /**
     * Delete a file by relative path or full URL.
     */
    public static function delete(?string $path): bool
    {
        $relative = self::relativePath($path);

        if (! $relative) {
            return false;
        }

        return self::disk()->delete($relative);
    }

    public static function exists(?string $path): bool
    {
        $relative = self::relativePath($path);

        if (! $relative) {
            return false;
        }

        return self::disk()->exists($relative);
    }

    /**
     * Normalize stored value (relative path, /storage/..., or full URL) to a disk-relative path.
     */
    public static function relativePath(?string $stored): ?string
    {
        if ($stored === null || $stored === '') {
            return null;
        }

        $stored = PublicStorageUrl::repairStoredPath($stored);

        if (preg_match('#^https?://#i', $stored)) {
            $path = parse_url($stored, PHP_URL_PATH);

            if (! is_string($path) || $path === '') {
                return null;
            }

            // Strip optional /storage/ prefix from legacy local URLs
            if (str_starts_with($path, '/storage/')) {
                return ltrim(substr($path, strlen('/storage/')), '/');
            }

            return ltrim($path, '/');
        }

        if (str_starts_with($stored, '/storage/')) {
            return ltrim(substr($stored, strlen('/storage/')), '/');
        }

        return ltrim($stored, '/');
    }
}
