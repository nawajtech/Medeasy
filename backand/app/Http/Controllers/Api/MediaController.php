<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class MediaController extends Controller
{
    /**
     * Public file serving under /api/media/{path}.
     * SPA deploys often proxy only /api to Laravel, so /storage/* 404s in the browser.
     */
    public function show(string $path): StreamedResponse
    {
        $relative = str_replace('\\', '/', $path);
        $relative = ltrim($relative, '/');

        if ($relative === '' || str_contains($relative, '..')) {
            abort(404);
        }

        $disk = Storage::disk('public');

        if (! $disk->exists($relative)) {
            abort(404);
        }

        return $disk->response($relative);
    }
}
