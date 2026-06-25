<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Concerns\HandlesTenancy;
use App\Http\Controllers\Controller;
use App\Models\DiagnosticCategory;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DiagnosticCategoryController extends Controller
{
    use HandlesTenancy;

    public function index(Request $request): JsonResponse
    {
        $companyId = $this->optionalCompanyId($request);

        $query = DiagnosticCategory::with(['testTypes' => fn ($q) => $q->orderBy('name')])
            ->orderBy('sort_order')
            ->orderBy('name');

        if ($companyId) {
            $query->where('company_id', $companyId);
        }

        if ($request->boolean('active_only')) {
            $query->where('is_active', true);
        }

        return response()->json($query->get());
    }

    public function store(Request $request): JsonResponse
    {
        $this->prepareCompanyScope($request);

        $data = $request->validate([
            'company_id'  => $this->companyIdRules(),
            'name'        => ['required', 'string', 'max:120'],
            'description' => ['nullable', 'string'],
            'sort_order'  => ['nullable', 'integer'],
            'is_active'   => ['boolean'],
        ]);

        $data['company_id'] = $this->resolveCompanyId($request);

        $category = DiagnosticCategory::create($data);

        return response()->json($category, 201);
    }

    public function update(Request $request, DiagnosticCategory $diagnosticCategory): JsonResponse
    {
        $this->assertTenantAccess($diagnosticCategory);

        $data = $request->validate([
            'name'        => ['sometimes', 'string', 'max:120'],
            'description' => ['nullable', 'string'],
            'sort_order'  => ['nullable', 'integer'],
            'is_active'   => ['boolean'],
        ]);

        $diagnosticCategory->update($data);

        return response()->json($diagnosticCategory);
    }

    public function destroy(DiagnosticCategory $diagnosticCategory): JsonResponse
    {
        $this->assertTenantAccess($diagnosticCategory);

        if ($diagnosticCategory->testTypes()->exists()) {
            return response()->json([
                'message' => 'Cannot delete a category that has tests. Remove or reassign tests first.',
            ], 422);
        }

        $diagnosticCategory->delete();

        return response()->json(null, 204);
    }
}
