<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Concerns\HandlesTenancy;
use App\Http\Controllers\Controller;
use App\Models\DiagnosticTestType;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DiagnosticTestTypeController extends Controller
{
    use HandlesTenancy;

    public function index(Request $request): JsonResponse
    {
        $companyId = $this->optionalCompanyId($request);

        return response()->json(
            DiagnosticTestType::when($companyId, fn ($q) => $q->where('company_id', $companyId))
                ->when($request->filled('modality'), fn ($q) => $q->where('modality', $request->modality))
                ->when($request->boolean('active_only'), fn ($q) => $q->where('is_active', true))
                ->orderBy('modality')
                ->orderBy('name')
                ->get()
        );
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'company_id'                => ['sometimes', 'exists:companies,id'],
            'name'                      => ['required', 'string', 'max:150'],
            'code'                      => ['nullable', 'string', 'max:30'],
            'modality'                  => ['required', 'in:xray,ct,mri,ultrasound,ecg,echo,other'],
            'description'               => ['nullable', 'string'],
            'preparation_instructions'  => ['nullable', 'string'],
            'price'                     => ['required', 'numeric', 'min:0'],
            'is_active'                 => ['boolean'],
        ]);

        $data['company_id'] = $this->resolveCompanyId($request);

        return response()->json(DiagnosticTestType::create($data), 201);
    }

    public function update(Request $request, DiagnosticTestType $diagnosticTestType): JsonResponse
    {
        $this->assertTenantAccess($diagnosticTestType);

        $data = $request->validate([
            'name'                      => ['sometimes', 'string', 'max:150'],
            'code'                      => ['nullable', 'string', 'max:30'],
            'modality'                  => ['sometimes', 'in:xray,ct,mri,ultrasound,ecg,echo,other'],
            'description'               => ['nullable', 'string'],
            'preparation_instructions'  => ['nullable', 'string'],
            'price'                     => ['sometimes', 'numeric', 'min:0'],
            'is_active'                 => ['boolean'],
        ]);

        $diagnosticTestType->update($data);

        return response()->json($diagnosticTestType);
    }

    public function destroy(DiagnosticTestType $diagnosticTestType): JsonResponse
    {
        $this->assertTenantAccess($diagnosticTestType);
        $diagnosticTestType->delete();

        return response()->json(null, 204);
    }
}
