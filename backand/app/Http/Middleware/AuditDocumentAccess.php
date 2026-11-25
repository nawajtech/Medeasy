<?php

namespace App\Http\Middleware;

use App\Services\AuditService;
use Closure;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class AuditDocumentAccess
{
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        if (! auth()->check() || ! $request->isMethod('GET')) {
            return $response;
        }

        $path = $request->path();
        $action = null;
        $module = 'documents';

        if (str_contains($path, '/invoice') || str_contains($path, '/prescription')) {
            $action = 'print';
            $module = 'diagnostics';
        }

        if (! $action) {
            return $response;
        }

        $record = $this->resolveRecordFromRoute($request);
        if ($record) {
            app(AuditService::class)->logDocumentAccess($action, $module, $record, [
                'document' => basename($path),
            ]);
        }

        return $response;
    }

    protected function resolveRecordFromRoute(Request $request): ?Model
    {
        $route = $request->route();
        if (! $route) {
            return null;
        }

        foreach ($route->parameters() as $param) {
            if ($param instanceof Model) {
                return $param;
            }
        }

        return null;
    }
}
