<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Concerns\HandlesTenancy;
use App\Http\Controllers\Controller;
use App\Models\DiagnosticTestType;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class DiagnosticTestTypeController extends Controller
{
    use HandlesTenancy;

    public function index(Request $request): JsonResponse
    {
        $companyId = $this->optionalCompanyId($request);

        return response()->json(
            DiagnosticTestType::with('category')
                ->when($companyId, fn ($q) => $q->where('company_id', $companyId))
                ->when($request->filled('category_id'), fn ($q) => $q->where('category_id', $request->category_id))
                ->when($request->filled('modality'), fn ($q) => $q->where('modality', $request->modality))
                ->when($request->boolean('active_only'), fn ($q) => $q->where('is_active', true))
                ->orderBy('category_id')
                ->orderBy('name')
                ->get()
        );
    }

    public function store(Request $request): JsonResponse
    {
        $this->prepareCompanyScope($request);
        $companyId = $this->resolveCompanyId($request);

        $data = $request->validate([
            'company_id'               => $this->companyIdRules(),
            'category_id'              => [
                'required',
                Rule::exists('diagnostic_categories', 'id')->where('company_id', $companyId),
            ],
            'name'                     => ['required', 'string', 'max:150'],
            'code'                     => ['nullable', 'string', 'max:30'],
            'modality'                 => ['nullable', 'in:xray,ct,mri,ultrasound,ecg,echo,other'],
            'description'              => ['nullable', 'string'],
            'preparation_instructions' => ['nullable', 'string'],
            'price'                    => ['required', 'numeric', 'min:0'],
            'is_active'                => ['boolean'],
        ]);

        $data['company_id'] = $companyId;
        $data['modality'] = $data['modality'] ?? 'other';

        return response()->json(DiagnosticTestType::create($data)->load('category'), 201);
    }

    public function update(Request $request, DiagnosticTestType $type): JsonResponse
    {
        $this->assertTenantAccess($type);

        $data = $request->validate([
            'category_id'              => [
                'sometimes',
                Rule::exists('diagnostic_categories', 'id')->where('company_id', $type->company_id),
            ],
            'name'                     => ['sometimes', 'string', 'max:150'],
            'code'                     => ['nullable', 'string', 'max:30'],
            'modality'                 => ['nullable', 'in:xray,ct,mri,ultrasound,ecg,echo,other'],
            'description'              => ['nullable', 'string'],
            'preparation_instructions' => ['nullable', 'string'],
            'price'                    => ['sometimes', 'numeric', 'min:0'],
            'is_active'                => ['boolean'],
        ]);

        $type->update($data);

        return response()->json($type->fresh('category'));
    }

    public function destroy(DiagnosticTestType $type): JsonResponse
    {
        $this->assertTenantAccess($type);
        $type->delete();

        return response()->json(null, 204);
    }
}
