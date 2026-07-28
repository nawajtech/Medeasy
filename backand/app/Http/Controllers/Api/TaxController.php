<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Concerns\HandlesTenancy;
use App\Http\Controllers\Controller;
use App\Services\TaxSettingsService;
use App\Support\TaxCalculator;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TaxController extends Controller
{
    use HandlesTenancy;

    /** Tax configuration for the active organisation (diagnostic billing preview). */
    public function settings(Request $request, TaxSettingsService $taxSettings): JsonResponse
    {
        $companyId = $this->optionalCompanyId($request);

        if (! $companyId) {
            return response()->json([
                'enabled' => false,
                'mode' => TaxCalculator::MODE_CGST_SGST,
                'rate' => 0,
                'inclusive' => false,
                'modes' => [
                    ['value' => TaxCalculator::MODE_CGST_SGST, 'label' => 'CGST + SGST (intra-state)'],
                    ['value' => TaxCalculator::MODE_IGST, 'label' => 'IGST (inter-state)'],
                ],
            ]);
        }

        return response()->json($taxSettings->payloadForCompany($companyId));
    }
}
