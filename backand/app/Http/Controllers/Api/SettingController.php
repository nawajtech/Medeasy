<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Concerns\HandlesTenancy;
use App\Http\Controllers\Controller;
use App\Models\Company;
use App\Models\Setting;
use App\Services\CompanySetupService;
use App\Support\PublicStorageUrl;
use App\Support\SettingDefinitions;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class SettingController extends Controller
{
    use HandlesTenancy;

    public function form(Request $request): JsonResponse
    {
        $companyId = $this->resolveFormCompanyId($request);
        $company = Company::findOrFail($companyId);

        app(CompanySetupService::class)->ensureSettings($company);

        $existing = Setting::withoutGlobalScopes()
            ->where('company_id', $companyId)
            ->get()
            ->keyBy('key');

        $groups = [];
        foreach (SettingDefinitions::GROUPS as $group) {
            $groups[$group] = [];
        }

        foreach (SettingDefinitions::all() as $definition) {
            $row = $existing->get($definition['key']);
            $rawValue = $row?->value ?? ($definition['default'] ?? '');

            $groups[$definition['group']][] = [
                'key' => $definition['key'],
                'label' => $definition['label'],
                'type' => $definition['type'],
                'placeholder' => $definition['placeholder'] ?? null,
                'id' => $row?->id,
                'value' => $this->formatValueForResponse($definition['type'], $rawValue),
            ];
        }

        return response()->json([
            'company_id' => $companyId,
            'groups' => $groups,
        ]);
    }

    public function uploadImage(Request $request): JsonResponse
    {
        if (auth()->user()->isDoctor()) {
            abort(403, 'Doctors cannot manage settings.');
        }

        $companyId = $this->resolveCompanyId($request);

        $validated = $request->validate([
            'company_id' => auth()->user()->isSuperAdmin()
                ? ['required', 'exists:companies,id']
                : ['prohibited'],
            'key' => ['required', 'string', Rule::in(
                collect(SettingDefinitions::all())->where('type', 'image')->pluck('key')->all()
            )],
            'image_base64' => ['required', 'string'],
        ]);

        app(CompanySetupService::class)->ensureSettings(Company::findOrFail($companyId));

        $definition = collect(SettingDefinitions::all())->firstWhere('key', $validated['key']);

        $existing = Setting::withoutGlobalScopes()
            ->where('company_id', $companyId)
            ->where('key', $validated['key'])
            ->first();

        $storedPath = $this->storeSettingImage($validated['image_base64'], $existing?->value);

        $setting = Setting::withoutGlobalScopes()->updateOrCreate(
            ['company_id' => $companyId, 'key' => $validated['key']],
            [
                'label' => $definition['label'],
                'group' => $definition['group'],
                'value' => $storedPath,
            ]
        );

        return response()->json([
            'message' => 'Image uploaded successfully',
            'key' => $setting->key,
            'value' => $this->formatValueForResponse('image', $setting->value),
        ]);
    }

    public function bulkUpdate(Request $request): JsonResponse
    {
        if (auth()->user()->isDoctor()) {
            abort(403, 'Doctors cannot manage settings.');
        }

        $companyId = $this->resolveCompanyId($request);
        $company = Company::findOrFail($companyId);

        $validated = $request->validate([
            'company_id' => auth()->user()->isSuperAdmin()
                ? ['required', 'exists:companies,id']
                : ['prohibited'],
            'settings' => ['required', 'array'],
            'settings.*.key' => ['required', 'string', Rule::in(SettingDefinitions::keys())],
            'settings.*.value' => ['nullable'],
            'settings.*.image_base64' => ['nullable', 'string'],
        ]);

        app(CompanySetupService::class)->ensureSettings($company);

        $definitions = collect(SettingDefinitions::all())->keyBy('key');
        $updated = [];

        foreach ($validated['settings'] as $item) {
            $definition = $definitions->get($item['key']);
            $value = array_key_exists('value', $item) ? (string) ($item['value'] ?? '') : '';

            if ($definition['type'] === 'image') {
                $existing = Setting::withoutGlobalScopes()
                    ->where('company_id', $companyId)
                    ->where('key', $item['key'])
                    ->first();

                if (! empty($item['image_base64'])) {
                    $value = $this->storeSettingImage($item['image_base64'], $existing?->value);
                } elseif ($value === '') {
                    if ($existing?->value) {
                        $this->deleteSettingImage($existing->value);
                    }
                } elseif ($existing?->value) {
                    // Keep stored path — do not rewrite image value on text-only saves
                    $value = PublicStorageUrl::repairStoredPath($existing->value);
                    $relative = PublicStorageUrl::toRelativePath($value);
                    $value = $relative ?? $existing->value;
                } else {
                    $value = PublicStorageUrl::toRelativePath($value) ?? $value;
                }
            }

            $setting = Setting::withoutGlobalScopes()->updateOrCreate(
                ['company_id' => $companyId, 'key' => $item['key']],
                [
                    'label' => $definition['label'],
                    'group' => $definition['group'],
                    'value' => $value,
                ]
            );

            $updated[] = [
                'key' => $setting->key,
                'value' => $this->formatValueForResponse($definition['type'], $setting->value),
            ];
        }

        return response()->json([
            'message' => 'Settings saved successfully',
            'settings' => $updated,
        ]);
    }

    public function index(Request $request): JsonResponse
    {
        $query = Setting::withoutGlobalScopes()->orderBy('group')->orderBy('key');

        if (auth()->user()->isSuperAdmin() && $request->filled('company_id')) {
            $query->where('company_id', (int) $request->company_id);
        } elseif (! auth()->user()->isSuperAdmin()) {
            $query->where('company_id', auth()->user()->company_id);
        }

        return response()->json($query->get());
    }

    public function store(Request $request): JsonResponse
    {
        if (auth()->user()->isDoctor()) {
            abort(403, 'Doctors cannot manage settings.');
        }

        $companyId = $this->resolveCompanyId($request);
        $validated = $request->validate($this->rules(null, $companyId));

        $setting = Setting::create([
            ...$validated,
            'company_id' => $companyId,
        ]);

        return response()->json($setting, 201);
    }

    public function show(string $id): JsonResponse
    {
        $setting = Setting::withoutGlobalScopes()->findOrFail($id);
        $this->assertTenantAccess($setting);

        return response()->json($setting);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        if (auth()->user()->isDoctor()) {
            abort(403, 'Doctors cannot manage settings.');
        }

        $setting = Setting::withoutGlobalScopes()->findOrFail($id);
        $this->assertTenantAccess($setting);
        $setting->update($request->validate($this->rules($setting->id, $setting->company_id)));

        return response()->json($setting->fresh());
    }

    public function destroy(string $id): JsonResponse
    {
        if (auth()->user()->isDoctor()) {
            abort(403, 'Doctors cannot manage settings.');
        }

        $setting = Setting::withoutGlobalScopes()->findOrFail($id);
        $this->assertTenantAccess($setting);
        $setting->delete();

        return response()->json(['message' => 'Setting deleted successfully']);
    }

    private function resolveFormCompanyId(Request $request): int
    {
        $user = auth()->user();

        if ($user->isSuperAdmin()) {
            return (int) $request->validate([
                'company_id' => ['required', 'exists:companies,id'],
            ])['company_id'];
        }

        return (int) $user->company_id;
    }

    private function formatValueForResponse(string $type, mixed $value): string
    {
        $value = (string) ($value ?? '');

        if ($type === 'image' && $value !== '') {
            return PublicStorageUrl::toUrl($value) ?? $value;
        }

        return $value;
    }

    private function storeSettingImage(string $base64, ?string $existingStored = null): string
    {
        if (! preg_match('/^data:image\/(jpeg|jpg|png|gif|webp|svg\+xml);base64,/i', $base64, $matches)) {
            abort(422, 'Invalid image upload.');
        }

        if ($existingStored) {
            $this->deleteSettingImage($existingStored);
        }

        $ext = strtolower(str_replace('svg+xml', 'svg', $matches[1]));
        $raw = base64_decode(substr($base64, strpos($base64, ',') + 1));
        $filename = 'settings/'.Str::uuid().'.'.$ext;

        Storage::disk('public')->put($filename, $raw);

        return $filename;
    }

    private function deleteSettingImage(string $stored): void
    {
        $relative = PublicStorageUrl::toRelativePath($stored);

        if ($relative) {
            Storage::disk('public')->delete($relative);
        }
    }

    private function rules(?int $settingId = null, ?int $companyId = null): array
    {
        $companyId ??= auth()->user()?->company_id;

        return [
            'company_id' => auth()->user()->isSuperAdmin()
                ? ['required', 'exists:companies,id']
                : ['prohibited'],
            'key' => [
                'required',
                'string',
                'max:100',
                Rule::unique('settings', 'key')->where('company_id', $companyId)->ignore($settingId),
            ],
            'value' => ['nullable', 'string'],
            'label' => ['nullable', 'string', 'max:255'],
            'group' => ['required', Rule::in(SettingDefinitions::GROUPS)],
        ];
    }
}
