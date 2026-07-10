<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Concerns\HandlesTenancy;
use App\Http\Controllers\Controller;
use App\Services\TaxSettingsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TaxController extends Controller
{
    use HandlesTenancy;

    /** Tax configuration for the active organisation (diagnostic billing preview). */
    public function settings(Request $request, TaxSettingsService $taxSettings): JsonResponse
    {
        $companyId = $this->resolveCompanyId($request);

        return response()->json($taxSettings->payloadForCompany($companyId));
    }
}
