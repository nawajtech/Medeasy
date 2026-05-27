<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Concerns\HandlesTenancy;
use App\Http\Controllers\Controller;
use App\Models\Setting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class SettingController extends Controller
{
    use HandlesTenancy;

    private const GROUPS = ['general', 'billing', 'appointments', 'notifications'];

    public function index(Request $request): JsonResponse
    {
        $query = Setting::orderBy('group')->orderBy('key');

        if (auth()->user()->isSuperAdmin() && $request->filled('company_id')) {
            $query->where('company_id', (int) $request->company_id);
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
        $setting = Setting::findOrFail($id);
        $this->assertTenantAccess($setting);

        return response()->json($setting);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        if (auth()->user()->isDoctor()) {
            abort(403, 'Doctors cannot manage settings.');
        }

        $setting = Setting::findOrFail($id);
        $this->assertTenantAccess($setting);
        $setting->update($request->validate($this->rules($setting->id, $setting->company_id)));

        return response()->json($setting->fresh());
    }

    public function destroy(string $id): JsonResponse
    {
        if (auth()->user()->isDoctor()) {
            abort(403, 'Doctors cannot manage settings.');
        }

        $setting = Setting::findOrFail($id);
        $this->assertTenantAccess($setting);
        $setting->delete();

        return response()->json(['message' => 'Setting deleted successfully']);
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
            'group' => ['required', Rule::in(self::GROUPS)],
        ];
    }
}
