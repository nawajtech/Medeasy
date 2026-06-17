<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Concerns\HandlesTenancy;
use App\Http\Controllers\Controller;
use App\Models\LabTest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LabTestController extends Controller
{
    use HandlesTenancy;

    public function index(Request $request): JsonResponse
    {
        $companyId = $this->optionalCompanyId($request);

        $query = LabTest::with('category')
            ->when($companyId, fn ($q) => $q->where('company_id', $companyId))
            ->when($request->filled('category_id'), fn ($q) => $q->where('category_id', $request->category_id))
            ->when($request->filled('sample_type'), fn ($q) => $q->where('sample_type', $request->sample_type))
            ->when($request->boolean('active_only'), fn ($q) => $q->where('is_active', true))
            ->orderBy('name');

        return response()->json($query->get());
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'company_id'        => ['sometimes', 'exists:companies,id'],
            'category_id'       => ['required', 'exists:lab_test_categories,id'],
            'name'              => ['required', 'string', 'max:150'],
            'code'              => ['nullable', 'string', 'max:30'],
            'sample_type'       => ['required', 'in:blood,urine,stool,swab,sputum,other'],
            'price'             => ['required', 'numeric', 'min:0'],
            'turnaround_hours'  => ['nullable', 'integer', 'min:1'],
            'unit'              => ['nullable', 'string', 'max:30'],
            'ref_range_male'    => ['nullable', 'string', 'max:100'],
            'ref_range_female'  => ['nullable', 'string', 'max:100'],
            'ref_range_child'   => ['nullable', 'string', 'max:100'],
            'method'            => ['nullable', 'string', 'max:80'],
            'description'       => ['nullable', 'string'],
            'is_active'         => ['boolean'],
        ]);

        $data['company_id'] = $this->resolveCompanyId($request);
        $test = LabTest::create($data);

        return response()->json($test->load('category'), 201);
    }

    public function update(Request $request, LabTest $labTest): JsonResponse
    {
        $this->assertTenantAccess($labTest);

        $data = $request->validate([
            'category_id'       => ['sometimes', 'exists:lab_test_categories,id'],
            'name'              => ['sometimes', 'string', 'max:150'],
            'code'              => ['nullable', 'string', 'max:30'],
            'sample_type'       => ['sometimes', 'in:blood,urine,stool,swab,sputum,other'],
            'price'             => ['sometimes', 'numeric', 'min:0'],
            'turnaround_hours'  => ['nullable', 'integer', 'min:1'],
            'unit'              => ['nullable', 'string', 'max:30'],
            'ref_range_male'    => ['nullable', 'string', 'max:100'],
            'ref_range_female'  => ['nullable', 'string', 'max:100'],
            'ref_range_child'   => ['nullable', 'string', 'max:100'],
            'method'            => ['nullable', 'string', 'max:80'],
            'description'       => ['nullable', 'string'],
            'is_active'         => ['boolean'],
        ]);

        $labTest->update($data);

        return response()->json($labTest->load('category'));
    }

    public function destroy(LabTest $labTest): JsonResponse
    {
        $this->assertTenantAccess($labTest);
        $labTest->delete();

        return response()->json(null, 204);
    }
}
