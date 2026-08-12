<?php

namespace App\Http\Middleware;

use App\Models\Patient;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsurePatient
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user instanceof Patient) {
            abort(403, 'Patient access only.');
        }

        if (! $user->status) {
            abort(403, 'This account is disabled.');
        }

        return $next($request);
    }
}
