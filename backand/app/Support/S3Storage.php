<?php

namespace App\Support;

use Illuminate\Contracts\Filesystem\Filesystem;
use Illuminate\Http\UploadedFile;

/**
 * Backward-compatible alias around MediaStorage (remote branch API).
 */
class S3Storage
{
    public static function diskName(): string
    {
        return MediaStorage::diskName();
    }

    public static function disk(): Filesystem
    {
        return MediaStorage::disk();
    }

    public static function upload(UploadedFile $file, string $folder = 'images'): string
    {
        return MediaStorage::upload($file, $folder);
    }

    public static function put(string $contents, string $folder, string $extension, ?string $contentType = null): string
    {
        $folder = trim($folder, '/');
        $path = $folder.'/'.\Illuminate\Support\Str::uuid().'.'.strtolower(ltrim($extension, '.'));
        $options = [];
        if ($contentType) {
            $options['ContentType'] = $contentType;
        }

        return MediaStorage::put($path, $contents, $options);
    }

    public static function putBase64Image(string $base64, string $folder = 'images'): string
    {
        return MediaStorage::putBase64Image($base64, $folder);
    }

    public static function url(?string $path): ?string
    {
        return PublicStorageUrl::toUrl($path);
    }

    public static function delete(?string $path): bool
    {
        MediaStorage::delete($path);

        return true;
    }

    public static function exists(?string $path): bool
    {
        return MediaStorage::exists($path);
    }

    public static function relativePath(?string $stored): ?string
    {
        return PublicStorageUrl::toRelativePath($stored);
    }
}
