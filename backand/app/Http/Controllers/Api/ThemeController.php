<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ThemeSetting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ThemeController extends Controller
{
    /** Public — every user (and the login screen) loads the active theme. */
    public function show(): JsonResponse
    {
        return response()->json([
            'colors' => $this->current(),
            'defaults' => config('theme.defaults'),
        ]);
    }

    /** Platform Admin only — persist the global theme. */
    public function update(Request $request): JsonResponse
    {
        $keys = array_keys(config('theme.defaults'));

        $rules = [];
        foreach ($keys as $key) {
            $rules[$key] = ['required', 'string', 'regex:/^#([0-9A-Fa-f]{6})$/'];
        }

        $validated = $request->validate($rules);
        $colors = array_map(fn (string $hex) => strtoupper($hex), $validated);

        $theme = ThemeSetting::query()->firstOrNew(['id' => 1]);
        $theme->colors = $colors;
        $theme->updated_by = $request->user()?->id;
        $theme->save();

        return response()->json([
            'colors' => $colors,
            'defaults' => config('theme.defaults'),
        ]);
    }

    /** Merge saved overrides on top of the shipped defaults. */
    private function current(): array
    {
        $defaults = config('theme.defaults');
        $saved = ThemeSetting::query()->first()?->colors;

        return array_merge($defaults, is_array($saved) ? $saved : []);
    }
}
