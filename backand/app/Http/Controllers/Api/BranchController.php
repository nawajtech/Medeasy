<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Concerns\HandlesTenancy;
use App\Http\Controllers\Controller;
use App\Models\Branch;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BranchController extends Controller
{
    use HandlesTenancy;

    public function index(Request $request): JsonResponse
    {
        $companyId = $this->optionalCompanyId($request);

        return response()->json(
            Branch::withCount(['doctors', 'appointments'])
                ->when($companyId, fn ($q) => $q->where('company_id', $companyId))
                ->when($request->boolean('active_only'), fn ($q) => $q->where('is_active', true))
                ->orderByDesc('is_main')
                ->orderBy('name')
                ->get()
        );
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'company_id' => ['sometimes', 'exists:companies,id'],
            'name'       => ['required', 'string', 'max:120'],
            'code'       => ['nullable', 'string', 'max:20'],
            'address'    => ['nullable', 'string'],
            'city'       => ['nullable', 'string', 'max:80'],
            'phone'      => ['nullable', 'string', 'max:30'],
            'email'      => ['nullable', 'email'],
            'is_main'    => ['boolean'],
            'is_active'  => ['boolean'],
        ]);

        $data['company_id'] = $this->resolveCompanyId($request);
        $branch = Branch::create($data);

        return response()->json($branch, 201);
    }

    public function update(Request $request, Branch $branch): JsonResponse
    {
        $this->assertTenantAccess($branch);

        $data = $request->validate([
            'name'      => ['sometimes', 'string', 'max:120'],
            'code'      => ['nullable', 'string', 'max:20'],
            'address'   => ['nullable', 'string'],
            'city'      => ['nullable', 'string', 'max:80'],
            'phone'     => ['nullable', 'string', 'max:30'],
            'email'     => ['nullable', 'email'],
            'is_main'   => ['boolean'],
            'is_active' => ['boolean'],
        ]);

        $branch->update($data);

        return response()->json($branch);
    }

    public function destroy(Branch $branch): JsonResponse
    {
        $this->assertTenantAccess($branch);
        $branch->delete();

        return response()->json(null, 204);
    }
}
