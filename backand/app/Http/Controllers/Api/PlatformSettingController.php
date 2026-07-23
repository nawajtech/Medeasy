<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PlatformSetting;
use App\Support\PlatformSettingDefinitions;
use App\Support\PublicStorageUrl;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class PlatformSettingController extends Controller
{
    /** Public — login screen and unauthenticated chrome. */
    public function show(): JsonResponse
    {
        return response()->json($this->chromePayload());
    }

    /** Super Admin — full settings form (same shape as company settings). */
    public function form(): JsonResponse
    {
        $values = PlatformSetting::current()->values ?? [];

        $groups = ['general' => []];

        foreach (PlatformSettingDefinitions::all() as $definition) {
            $rawValue = $values[$definition['key']] ?? ($definition['default'] ?? '');

            $groups[$definition['group']][] = [
                'key' => $definition['key'],
                'label' => $definition['label'],
                'type' => $definition['type'],
                'placeholder' => $definition['placeholder'] ?? null,
                'options' => $definition['options'] ?? null,
                'id' => null,
                'value' => $this->formatValueForResponse($definition['type'], $rawValue),
            ];
        }

        return response()->json([
            'scope' => 'platform',
            'groups' => $groups,
        ]);
    }

    public function uploadImage(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'key' => ['required', 'string', Rule::in(PlatformSettingDefinitions::imageKeys())],
            'image_base64' => ['required', 'string'],
        ]);

        $setting = PlatformSetting::current();
        $values = $setting->values ?? [];
        $existing = $values[$validated['key']] ?? null;

        $storedPath = $this->storeImage($validated['image_base64'], $existing);
        $values[$validated['key']] = $storedPath;

        $setting->values = $values;
        $setting->updated_by = $request->user()?->id;
        $setting->save();

        return response()->json([
            'message' => 'Image uploaded successfully',
            'key' => $validated['key'],
            'value' => $this->formatValueForResponse('image', $storedPath),
        ]);
    }

    public function update(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'settings' => ['required', 'array'],
            'settings.*.key' => ['required', 'string', Rule::in(PlatformSettingDefinitions::keys())],
            'settings.*.value' => ['nullable'],
            'settings.*.image_base64' => ['nullable', 'string'],
        ]);

        $definitions = collect(PlatformSettingDefinitions::all())->keyBy('key');
        $setting = PlatformSetting::current();
        $values = $setting->values ?? [];
        $updated = [];

        foreach ($validated['settings'] as $item) {
            $definition = $definitions->get($item['key']);
            $value = array_key_exists('value', $item) ? (string) ($item['value'] ?? '') : '';

            if ($definition['type'] === 'image') {
                $existing = $values[$item['key']] ?? null;

                if (! empty($item['image_base64'])) {
                    $value = $this->storeImage($item['image_base64'], $existing);
                } elseif ($value === '') {
                    if ($existing) {
                        $this->deleteImage($existing);
                    }
                    $value = '';
                } elseif ($existing) {
                    $value = PublicStorageUrl::repairStoredPath($existing);
                    $relative = PublicStorageUrl::toRelativePath($value);
                    $value = $relative ?? $existing;
                } else {
                    $value = PublicStorageUrl::toRelativePath($value) ?? $value;
                }
            }

            $values[$item['key']] = $value;
            $updated[] = [
                'key' => $item['key'],
                'value' => $this->formatValueForResponse($definition['type'], $value),
            ];
        }

        $setting->values = $values;
        $setting->updated_by = $request->user()?->id;
        $setting->save();

        return response()->json([
            'message' => 'Platform settings saved successfully',
            'settings' => $updated,
            'branding' => $this->chromePayload(),
        ]);
    }

    public function chromePayload(): array
    {
        $values = PlatformSetting::current()->values ?? [];
        $definitions = collect(PlatformSettingDefinitions::all())->keyBy('key');

        $name = filled($values['organisation_name'] ?? null)
            ? $values['organisation_name']
            : ($definitions->get('organisation_name')['default'] ?? 'ApnaMedi');

        $logo = PublicStorageUrl::toUrl($values['company_logo'] ?? null);
        $favicon = PublicStorageUrl::toUrl($values['favicon'] ?? null) ?: $logo;
        $tagline = filled($values['organisation_division'] ?? null)
            ? $values['organisation_division']
            : ($definitions->get('organisation_division')['default'] ?? 'Healthcare SaaS');

        return [
            'name' => $name,
            'logo' => $logo,
            'favicon' => $favicon,
            'tagline' => $tagline,
            'email' => $values['organisation_email'] ?? null,
            'phone' => $values['organisation_phone'] ?? null,
            'address' => $values['organisation_address'] ?? null,
            'website' => $values['organisation_website'] ?? null,
        ];
    }

    private function formatValueForResponse(string $type, mixed $value): string
    {
        $value = (string) ($value ?? '');

        if ($type === 'image' && $value !== '') {
            return PublicStorageUrl::toUrl($value) ?? $value;
        }

        return $value;
    }

    private function storeImage(string $base64, ?string $existingStored = null): string
    {
        if (! preg_match('/^data:image\/(jpeg|jpg|png|gif|webp|svg\+xml);base64,/i', $base64, $matches)) {
            abort(422, 'Invalid image upload.');
        }

        if ($existingStored) {
            $this->deleteImage($existingStored);
        }

        $ext = strtolower(str_replace('svg+xml', 'svg', $matches[1]));
        $raw = base64_decode(substr($base64, strpos($base64, ',') + 1));
        $filename = 'platform/'.Str::uuid().'.'.$ext;

        Storage::disk('public')->put($filename, $raw);

        return $filename;
    }

    private function deleteImage(string $stored): void
    {
        $relative = PublicStorageUrl::toRelativePath($stored);

        if ($relative) {
            Storage::disk('public')->delete($relative);
        }
    }
}
