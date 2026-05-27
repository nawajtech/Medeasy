<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Concerns\HandlesTenancy;
use App\Http\Controllers\Controller;
use App\Models\Department;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class DepartmentController extends Controller
{
    use HandlesTenancy;

    public function index(Request $request): JsonResponse
    {
        $query = Department::with('company')->withCount('doctors')->orderBy('name');

        if (auth()->user()->isSuperAdmin() && $request->filled('company_id')) {
            $query->where('company_id', (int) $request->company_id);
        }

        return response()->json($query->get());
    }

    public function store(Request $request): JsonResponse
    {
        if ($this->doctorIdForUser()) {
            abort(403, 'Doctors cannot manage departments.');
        }

        $companyId = $this->resolveCompanyId($request);
        $validated = $request->validate($this->rules(null, $companyId));

        $department = Department::create([
            ...$validated,
            'company_id' => $companyId,
        ]);

        return response()->json($department->load('company'), 201);
    }

    public function show(string $id): JsonResponse
    {
        $department = Department::with('company')->withCount('doctors')->findOrFail($id);
        $this->assertTenantAccess($department);

        return response()->json($department);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        if ($this->doctorIdForUser()) {
            abort(403, 'Doctors cannot manage departments.');
        }

        $department = Department::findOrFail($id);
        $this->assertTenantAccess($department);
        $department->update($request->validate($this->rules($department->id, $department->company_id)));

        return response()->json($department->fresh(['company']));
    }

    public function destroy(string $id): JsonResponse
    {
        if ($this->doctorIdForUser()) {
            abort(403, 'Doctors cannot manage departments.');
        }

        $department = Department::findOrFail($id);
        $this->assertTenantAccess($department);

        if ($department->doctors()->exists()) {
            return response()->json([
                'message' => 'Cannot delete department while doctors are assigned to it.',
            ], 422);
        }

        $department->delete();

        return response()->json(['message' => 'Department deleted successfully']);
    }

    private function rules(?int $departmentId = null, ?int $companyId = null): array
    {
        $companyId ??= auth()->user()?->company_id;

        return [
            'company_id' => auth()->user()->isSuperAdmin()
                ? ['required', 'exists:companies,id']
                : ['prohibited'],
            'name' => [
                'required',
                'string',
                'max:255',
                Rule::unique('departments', 'name')->where('company_id', $companyId)->ignore($departmentId),
            ],
            'code' => [
                'nullable',
                'string',
                'max:50',
                Rule::unique('departments', 'code')->where('company_id', $companyId)->ignore($departmentId),
            ],
            'description' => ['nullable', 'string'],
            'is_active' => ['boolean'],
        ];
    }
}
