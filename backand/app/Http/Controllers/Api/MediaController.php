<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Support\MediaStorage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class MediaController extends Controller
{
    /**
     * Public file serving under /api/media/{path}.
     * Works for local disk and S3 (streams via app credentials so the bucket can stay private).
     */
    public function show(string $path): StreamedResponse
    {
        $relative = str_replace('\\', '/', $path);
        $relative = ltrim($relative, '/');

        if ($relative === '' || str_contains($relative, '..')) {
            abort(404);
        }

        // Only serve known media prefixes.
        if (! preg_match('#^(platform|settings|logos|prescriptions)/#', $relative)) {
            abort(404);
        }

        $disk = MediaStorage::disk();

        if (! $disk->exists($relative)) {
            abort(404);
        }

        return $disk->response($relative, null, [
            'Cache-Control' => 'public, max-age=86400',
        ]);
    }
}
