<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Concerns\HandlesTenancy;
use App\Http\Controllers\Controller;
use App\Models\LabTestPackage;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LabTestPackageController extends Controller
{
    use HandlesTenancy;

    public function index(Request $request): JsonResponse
    {
        $companyId = $this->optionalCompanyId($request);

        return response()->json(
            LabTestPackage::with('tests')
                ->when($companyId, fn ($q) => $q->where('company_id', $companyId))
                ->orderBy('name')
                ->get()
        );
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'company_id'       => ['sometimes', 'exists:companies,id'],
            'name'             => ['required', 'string', 'max:150'],
            'code'             => ['nullable', 'string', 'max:30'],
            'description'      => ['nullable', 'string'],
            'price'            => ['required', 'numeric', 'min:0'],
            'turnaround_hours' => ['nullable', 'integer', 'min:1'],
            'is_active'        => ['boolean'],
            'test_ids'         => ['nullable', 'array'],
            'test_ids.*'       => ['exists:lab_tests,id'],
        ]);

        $data['company_id'] = $this->resolveCompanyId($request);
        $testIds = $data['test_ids'] ?? [];
        unset($data['test_ids']);

        $pkg = LabTestPackage::create($data);

        if ($testIds) {
            $pkg->tests()->sync($testIds);
        }

        return response()->json($pkg->load('tests'), 201);
    }

    public function update(Request $request, LabTestPackage $labTestPackage): JsonResponse
    {
        $this->assertTenantAccess($labTestPackage);

        $data = $request->validate([
            'name'             => ['sometimes', 'string', 'max:150'],
            'code'             => ['nullable', 'string', 'max:30'],
            'description'      => ['nullable', 'string'],
            'price'            => ['sometimes', 'numeric', 'min:0'],
            'turnaround_hours' => ['nullable', 'integer', 'min:1'],
            'is_active'        => ['boolean'],
            'test_ids'         => ['nullable', 'array'],
            'test_ids.*'       => ['exists:lab_tests,id'],
        ]);

        $testIds = $data['test_ids'] ?? null;
        unset($data['test_ids']);

        $labTestPackage->update($data);

        if ($testIds !== null) {
            $labTestPackage->tests()->sync($testIds);
        }

        return response()->json($labTestPackage->load('tests'));
    }

    public function destroy(LabTestPackage $labTestPackage): JsonResponse
    {
        $this->assertTenantAccess($labTestPackage);
        $labTestPackage->delete();

        return response()->json(null, 204);
    }
}
