<?php

namespace App\Services;

use App\Models\Company;
use App\Models\Permission;
use Illuminate\Support\Collection;

class PermissionRegistryService
{
    public function guardName(): string
    {
        return 'web';
    }

    public function allPermissionNames(): Collection
    {
        return collect(config('permissions.modules', []))
            ->flatMap(fn (array $module) => array_keys($module['permissions'] ?? []))
            ->values();
    }

    public function syncToDatabase(): void
    {
        $guard = $this->guardName();

        foreach (config('permissions.modules', []) as $moduleKey => $module) {
            foreach ($module['permissions'] ?? [] as $name => $label) {
                Permission::updateOrCreate(
                    ['name' => $name, 'guard_name' => $guard],
                    ['module' => $moduleKey, 'label' => $label]
                );
            }
        }

        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();
    }

    /**
     * Resolve wildcard patterns like patient.* or * to concrete permission names.
     *
     * @param  array<int, string>  $patterns
     * @return array<int, string>
     */
    public function resolvePatterns(array $patterns): array
    {
        $all = $this->allPermissionNames()->all();

        if (in_array('*', $patterns, true)) {
            return $all;
        }

        $resolved = [];

        foreach ($patterns as $pattern) {
            if (str_ends_with($pattern, '.*')) {
                $prefix = substr($pattern, 0, -1);
                foreach ($all as $name) {
                    if (str_starts_with($name, $prefix)) {
                        $resolved[] = $name;
                    }
                }
            } else {
                $resolved[] = $pattern;
            }
        }

        return array_values(array_unique($resolved));
    }

    /**
     * @param  array<int, string>  $patterns
     * @param  array<int, string>  $excludePatterns
     * @return array<int, string>
     */
    public function resolveRolePermissions(array $patterns, array $excludePatterns = []): array
    {
        $resolved = $this->resolvePatterns($patterns);

        if ($excludePatterns === []) {
            return $resolved;
        }

        $excluded = $this->resolvePatterns($excludePatterns);

        return array_values(array_diff($resolved, $excluded));
    }

    public function forgetCache(): void
    {
        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();
    }

    /** @return array<int, string> */
    public function permissionModuleKeysForCompany(Company $company): array
    {
        $modules = Company::normalizeModules($company->modules ?? [Company::MODULE_CLINIC]);
        $map = config('permissions.company_module_map', []);
        $core = config('permissions.tenant_core_modules', []);

        $keys = collect($core);
        foreach ($modules as $tenantModule) {
            $keys = $keys->merge($map[$tenantModule] ?? []);
        }

        return $keys->unique()->values()->all();
    }

    /** @return array<int, string> */
    public function permissionNamesForCompany(Company $company): array
    {
        $guard = $this->guardName();

        return Permission::query()
            ->where('guard_name', $guard)
            ->whereIn('module', $this->permissionModuleKeysForCompany($company))
            ->orderBy('name')
            ->pluck('name')
            ->all();
    }

    public function groupedForCompany(Company $company): array
    {
        $guard = $this->guardName();
        $moduleKeys = $this->permissionModuleKeysForCompany($company);

        return Permission::query()
            ->where('guard_name', $guard)
            ->whereIn('module', $moduleKeys)
            ->orderBy('module')
            ->orderBy('name')
            ->get()
            ->groupBy('module')
            ->map(function ($group, $moduleKey) {
                $moduleConfig = config("permissions.modules.{$moduleKey}", []);

                return [
                    'module' => $moduleKey,
                    'label' => $moduleConfig['label'] ?? ucfirst((string) $moduleKey),
                    'permissions' => $group->map(fn (Permission $p) => [
                        'id' => $p->id,
                        'name' => $p->name,
                        'label' => $p->label ?? $p->name,
                    ])->values()->all(),
                ];
            })
            ->values()
            ->all();
    }

    public function groupedForApi(): array
    {
        $guard = $this->guardName();

        return Permission::query()
            ->where('guard_name', $guard)
            ->orderBy('module')
            ->orderBy('name')
            ->get()
            ->groupBy('module')
            ->map(function ($group, $moduleKey) {
                $moduleConfig = config("permissions.modules.{$moduleKey}", []);

                return [
                    'module' => $moduleKey,
                    'label' => $moduleConfig['label'] ?? ucfirst((string) $moduleKey),
                    'permissions' => $group->map(fn (Permission $p) => [
                        'id' => $p->id,
                        'name' => $p->name,
                        'label' => $p->label ?? $p->name,
                    ])->values()->all(),
                ];
            })
            ->values()
            ->all();
    }
}
