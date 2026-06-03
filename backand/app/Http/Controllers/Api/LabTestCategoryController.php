<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Concerns\HandlesTenancy;
use App\Http\Controllers\Controller;
use App\Models\LabTestCategory;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LabTestCategoryController extends Controller
{
    use HandlesTenancy;

    public function index(Request $request): JsonResponse
    {
        $companyId = $this->optionalCompanyId($request);

        $query = LabTestCategory::with('tests')
            ->orderBy('sort_order')
            ->orderBy('name');

        if ($companyId) {
            $query->where('company_id', $companyId);
        }

        return response()->json($query->get());
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'company_id'  => ['sometimes', 'exists:companies,id'],
            'name'        => ['required', 'string', 'max:120'],
            'description' => ['nullable', 'string'],
            'sort_order'  => ['nullable', 'integer'],
            'is_active'   => ['boolean'],
        ]);

        $data['company_id'] = $this->resolveCompanyId($request);
        $cat = LabTestCategory::create($data);

        return response()->json($cat, 201);
    }

    public function update(Request $request, LabTestCategory $labTestCategory): JsonResponse
    {
        $this->assertTenantAccess($labTestCategory);

        $data = $request->validate([
            'name'        => ['sometimes', 'string', 'max:120'],
            'description' => ['nullable', 'string'],
            'sort_order'  => ['nullable', 'integer'],
            'is_active'   => ['boolean'],
        ]);

        $labTestCategory->update($data);

        return response()->json($labTestCategory);
    }

    public function destroy(LabTestCategory $labTestCategory): JsonResponse
    {
        $this->assertTenantAccess($labTestCategory);
        $labTestCategory->delete();

        return response()->json(null, 204);
    }
}
