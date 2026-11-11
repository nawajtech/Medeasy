<?php

namespace App\Http\Middleware;

use App\Models\Partner;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsurePartner
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user instanceof Partner) {
            abort(403, 'Partner access only.');
        }

        if (! $user->status) {
            abort(403, 'This account is disabled.');
        }

        return $next($request);
    }
}
