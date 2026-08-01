<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Company;
use App\Models\Plan;
use App\Services\CompanyProvisioningService;
use App\Services\TenantRoleProvisioningService;
use App\Support\ContactRules;
use App\Support\MediaStorage;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class CompanyController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(
            Company::with('primaryAdmin:id,name,email,phone,status')
                ->orderBy('name')
                ->get()
        );
    }

    public function store(Request $request, CompanyProvisioningService $provisioning): JsonResponse
    {
        $this->nullEmptyStrings($request, [
            'code', 'website', 'state', 'gst_number', 'registration_number',
            'description', 'admin_phone', 'logo_base64', 'plan_id',
        ]);
        // Code is always auto-generated — never accept client value on create.
        $request->request->remove('code');

        $data = $request->validate($this->rules());
        $adminData = $request->validate($this->adminRules());
        $data = $this->normalizeModulesPayload($data);
        $data = $this->handleLogo($request, $data, null);

        $plan = null;
        if ($request->filled('plan_id')) {
            $plan = Plan::query()
                ->where('id', $request->integer('plan_id'))
                ->where('status', Plan::STATUS_ACTIVE)
                ->firstOrFail();
        }

        $company = $provisioning->provision($data, [
            'name' => $adminData['admin_name'],
            'email' => $adminData['admin_email'],
            'password' => $adminData['admin_password'],
            'phone' => $adminData['admin_phone'] ?? null,
        ], $plan);

        return response()->json([
            'message' => 'Organization and primary administrator created successfully.',
            'company' => $company,
            'primary_admin' => $company->primaryAdmin,
        ], 201);
    }

    public function show(string $id): JsonResponse
    {
        return response()->json(Company::findOrFail($id));
    }

    public function update(Request $request, string $id, TenantRoleProvisioningService $tenantRoles): JsonResponse
    {
        $company = Company::findOrFail($id);
        $previousModules = $company->modules ?? [];
        $this->nullEmptyStrings($request, [
            'website', 'state', 'gst_number', 'registration_number',
            'description', 'logo_base64', 'plan_id',
        ]);
        $request->request->remove('code');

        $data = $request->validate($this->rules($company->id, isUpdate: true));
        unset($data['code']);
        $data = $this->normalizeModulesPayload($data);
        $data = $this->handleLogo($request, $data, $company);

        $company->update($data);

        if (($data['modules'] ?? []) !== $previousModules) {
            $tenantRoles->syncModuleAccess($company->fresh());
        }

        return response()->json($company->fresh());
    }

    public function destroy(string $id): JsonResponse
    {
        $company = Company::findOrFail($id);

        if ($company->logo_url) {
            $this->deleteLogo($company->logo_url);
        }

        $company->delete();

        return response()->json(['message' => 'Company deleted successfully']);
    }

    private function handleLogo(Request $request, array $data, ?Company $existing): array
    {
        if (! $request->filled('logo_base64')) {
            return $data;
        }

        try {
            if ($existing?->logo_url) {
                $this->deleteLogo($existing->logo_url);
            }

            // Store the relative disk key; API responses resolve it to /api/media/...
            $data['logo_url'] = MediaStorage::putBase64Image($request->logo_base64, 'logos');
        } catch (\InvalidArgumentException) {
            // Silently ignore bad input; validation catches required cases
        }

        return $data;
    }

    private function deleteLogo(string $url): void
    {
        MediaStorage::delete($url);
    }

    private function normalizeModulesPayload(array $data): array
    {
        $modules = Company::normalizeModules($data['modules'] ?? []);
        $data['modules'] = $modules;
        $data['type'] = Company::deriveLegacyType($modules);

        return $data;
    }

    private function rules(?int $companyId = null, bool $isUpdate = false): array
    {
        $logoRule = $isUpdate
            ? ['nullable', 'string']
            : ['required', 'string'];

        return [
            'name' => [
                'required', 'string', 'max:255',
                Rule::unique('companies', 'name')->ignore($companyId)->whereNull('deleted_at'),
            ],
            'type' => ['nullable', 'string', 'max:50'],
            'modules' => ['required', 'array', 'min:1'],
            'modules.*' => ['string', Rule::in(array_keys(Company::MODULES))],
            'logo_base64' => $logoRule,
            'phone' => ContactRules::phone(),
            'email' => ContactRules::email(),
            'address' => ['required', 'string', 'max:500'],
            'city' => ['required', 'string', 'max:100'],
            'state' => ['nullable', 'string', 'max:100'],
            'country' => ['required', 'string', 'max:100'],
            'website' => ['nullable', 'url', 'max:255'],
            'gst_number' => ['nullable', 'string', 'max:20'],
            'registration_number' => ['nullable', 'string', 'max:60'],
            'currency' => ['required', Rule::in(['INR', 'USD', 'EUR', 'GBP'])],
            'description' => ['nullable', 'string', 'max:2000'],
            'is_active' => ['boolean'],
            'plan_id' => ['nullable', 'integer', 'exists:plans,id'],
        ];
    }

    private function adminRules(): array
    {
        return [
            'admin_name' => ['required', 'string', 'max:255'],
            'admin_email' => [...ContactRules::email(), Rule::unique('users', 'email')],
            'admin_password' => ['required', 'string', 'min:8'],
            'admin_phone' => [...ContactRules::phone(required: false), Rule::unique('users', 'phone')],
        ];
    }

    /** Convert "" to null so nullable|url / unique rules do not 422. */
    private function nullEmptyStrings(Request $request, array $keys): void
    {
        foreach ($keys as $key) {
            if ($request->exists($key) && $request->input($key) === '') {
                $request->merge([$key => null]);
            }
        }
    }
}
