<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\PermissionRegistryService;
use Illuminate\Http\JsonResponse;

class PermissionController extends Controller
{
    public function index(PermissionRegistryService $registry): JsonResponse
    {
        $user = auth()->user();

        if ($user->isSuperAdmin()) {
            abort(403, 'Permissions are managed by each organization admin.');
        }

        $company = $user->company;
        if (! $company) {
            abort(403, 'No organization context.');
        }

        return response()->json($registry->groupedForCompany($company));
    }
}
