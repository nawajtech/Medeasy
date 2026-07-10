<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Concerns\HandlesTenancy;
use App\Http\Controllers\Controller;
use App\Models\DiagnosticPackage;
use App\Models\DiagnosticTestType;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Validation\Rule;

class DiagnosticPackageController extends Controller
{
    use HandlesTenancy;

    public function index(Request $request): JsonResponse
    {
        $companyId = $this->optionalCompanyId($request);

        $packages = DiagnosticPackage::query()
            ->when($companyId, fn ($q) => $q->where('company_id', $companyId))
            ->when($request->boolean('active_only'), fn ($q) => $q->where('is_active', true))
            ->orderBy('package_name')
            ->get();

        return response()->json($this->attachTests($packages));
    }

    public function store(Request $request): JsonResponse
    {
        $this->prepareCompanyScope($request);
        $companyId = $this->resolveCompanyId($request);

        $data = $request->validate($this->rules(null, $companyId));
        $data['company_id'] = $companyId;
        $data['package_name'] = trim($data['package_name']);
        $data['test_ids'] = array_values(array_unique(array_map('intval', $data['test_ids'])));

        $package = DiagnosticPackage::create($data);

        return response()->json($this->attachTests(collect([$package]))->first(), 201);
    }

    public function update(Request $request, DiagnosticPackage $diagnosticPackage): JsonResponse
    {
        $this->assertTenantAccess($diagnosticPackage);

        $data = $request->validate($this->rules($diagnosticPackage->id, $diagnosticPackage->company_id));

        if (array_key_exists('package_name', $data)) {
            $data['package_name'] = trim($data['package_name']);
        }

        if (array_key_exists('test_ids', $data)) {
            $data['test_ids'] = array_values(array_unique(array_map('intval', $data['test_ids'])));
        }

        $diagnosticPackage->update($data);

        return response()->json($this->attachTests(collect([$diagnosticPackage->fresh()]))->first());
    }

    public function destroy(DiagnosticPackage $diagnosticPackage): JsonResponse
    {
        $this->assertTenantAccess($diagnosticPackage);
        $diagnosticPackage->delete();

        return response()->json(null, 204);
    }

    private function rules(?int $packageId, int $companyId): array
    {
        return [
            'company_id' => $this->companyIdRules(),
            'package_name' => [
                'required',
                'string',
                'max:150',
                Rule::unique('diago_package', 'package_name')
                    ->where('company_id', $companyId)
                    ->ignore($packageId),
            ],
            'description' => ['nullable', 'string'],
            'offer_percentage' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'is_active' => ['boolean'],
            'test_ids' => [$packageId ? 'sometimes' : 'required', 'array', 'min:1'],
            'test_ids.*' => [
                Rule::exists('diagnostic_test_types', 'id')->where('company_id', $companyId),
            ],
        ];
    }

    private function attachTests(Collection $packages): Collection
    {
        $testIds = $packages
            ->pluck('test_ids')
            ->flatten()
            ->filter()
            ->map(fn ($id) => (int) $id)
            ->unique()
            ->values();

        $testsById = $testIds->isEmpty()
            ? collect()
            : DiagnosticTestType::with('category')->whereIn('id', $testIds)->get()->keyBy('id');

        return $packages->map(function (DiagnosticPackage $package) use ($testsById) {
            $tests = collect($package->test_ids ?? [])
                ->map(fn ($id) => $testsById->get((int) $id))
                ->filter()
                ->values();

            $package->setRelation('tests', $tests);

            return $package;
        });
    }
}
