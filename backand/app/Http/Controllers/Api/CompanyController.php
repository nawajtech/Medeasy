<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Company;
use App\Models\Plan;
use App\Services\CompanyProvisioningService;
use App\Services\TenantRoleProvisioningService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
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
        $data = $request->validate($this->rules($company->id, isUpdate: true));
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

        // Remove logo from storage if present
        if ($company->logo_url) {
            $this->deleteLogo($company->logo_url);
        }

        $company->delete();

        return response()->json(['message' => 'Company deleted successfully']);
    }

    // ── Logo handling ──────────────────────────────────────────────────────────

    private function handleLogo(Request $request, array $data, ?Company $existing): array
    {
        if (! $request->filled('logo_base64')) {
            return $data;
        }

        $base64 = $request->logo_base64;

        // Validate it looks like a data URI
        if (! preg_match('/^data:image\/(jpeg|jpg|png|gif|webp|svg\+xml);base64,/i', $base64, $matches)) {
            return $data; // silently ignore bad input; validation catches required
        }

        // Delete old logo
        if ($existing?->logo_url) {
            $this->deleteLogo($existing->logo_url);
        }

        $ext      = strtolower(str_replace('svg+xml', 'svg', $matches[1]));
        $raw      = base64_decode(substr($base64, strpos($base64, ',') + 1));
        $filename = 'logos/'.Str::uuid().'.'.$ext;

        Storage::disk('public')->put($filename, $raw);

        $data['logo_url'] = Storage::disk('public')->url($filename);

        return $data;
    }

    private function deleteLogo(string $url): void
    {
        // Convert stored public URL back to relative path
        $relative = 'logos/'.basename($url);
        Storage::disk('public')->delete($relative);
    }

    private function normalizeModulesPayload(array $data): array
    {
        $modules = Company::normalizeModules($data['modules'] ?? []);
        $data['modules'] = $modules;
        $data['type'] = Company::deriveLegacyType($modules);

        return $data;
    }

    // ── Validation rules ───────────────────────────────────────────────────────

    private function rules(?int $companyId = null, bool $isUpdate = false): array
    {
        $logoRule = $isUpdate
            ? ['nullable', 'string']                   // base64 optional on update
            : ['required', 'string'];                  // required on create

        return [
            // ── Core identity ─────────────────────────────────────────
            'name' => [
                'required', 'string', 'max:255',
                Rule::unique('companies', 'name')->ignore($companyId)->whereNull('deleted_at'),
            ],
            'code' => [
                'nullable', 'string', 'max:50',
                Rule::unique('companies', 'code')->ignore($companyId)->whereNull('deleted_at'),
            ],
            'type' => ['nullable', 'string', 'max:50'],
            'modules' => ['required', 'array', 'min:1'],
            'modules.*' => ['string', Rule::in(array_keys(Company::MODULES))],

            // ── Logo ──────────────────────────────────────────────────
            'logo_base64' => $logoRule,

            // ── Contact ───────────────────────────────────────────────
            'phone'  => ['required', 'string', 'max:30'],
            'email'  => ['required', 'email', 'max:255'],
            'address'=> ['required', 'string', 'max:500'],
            'city'   => ['required', 'string', 'max:100'],
            'state'  => ['nullable', 'string', 'max:100'],
            'country'=> ['required', 'string', 'max:100'],
            'website'=> ['nullable', 'url', 'max:255'],

            // ── Business details ──────────────────────────────────────
            'gst_number'          => ['nullable', 'string', 'max:20'],
            'registration_number' => ['nullable', 'string', 'max:60'],
            'currency'            => ['required', Rule::in(['INR', 'USD', 'EUR', 'GBP'])],
            'description'         => ['nullable', 'string', 'max:2000'],
            'is_active'           => ['boolean'],
            'plan_id'             => ['nullable', 'integer', 'exists:plans,id'],
        ];
    }

    private function adminRules(): array
    {
        return [
            'admin_name' => ['required', 'string', 'max:255'],
            'admin_email' => ['required', 'email', 'max:255', Rule::unique('users', 'email')],
            'admin_password' => ['required', 'string', 'min:8'],
            'admin_phone' => ['nullable', 'string', 'max:20', Rule::unique('users', 'phone')],
        ];
    }
}
