<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Company;
use App\Services\CompanySetupService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class CompanyController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(
            Company::orderBy('name')->get()
        );
    }

    public function store(Request $request): JsonResponse
    {
        $company = Company::create($request->validate($this->rules()));
        app(CompanySetupService::class)->bootstrap($company);

        return response()->json($company, 201);
    }

    public function show(string $id): JsonResponse
    {
        return response()->json(Company::findOrFail($id));
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $company = Company::findOrFail($id);
        $company->update($request->validate($this->rules($company->id)));

        return response()->json($company->fresh());
    }

    public function destroy(string $id): JsonResponse
    {
        Company::findOrFail($id)->delete();

        return response()->json(['message' => 'Company deleted successfully']);
    }

    private function rules(?int $companyId = null): array
    {
        return [
            'name' => ['required', 'string', 'max:255', Rule::unique('companies', 'name')->ignore($companyId)],
            'code' => ['nullable', 'string', 'max:50', Rule::unique('companies', 'code')->ignore($companyId)],
            'phone' => ['nullable', 'string', 'max:30'],
            'email' => ['nullable', 'email', 'max:255'],
            'address' => ['nullable', 'string', 'max:500'],
            'city' => ['nullable', 'string', 'max:100'],
            'state' => ['nullable', 'string', 'max:100'],
            'country' => ['nullable', 'string', 'max:100'],
            'website' => ['nullable', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'is_active' => ['boolean'],
        ];
    }
}
