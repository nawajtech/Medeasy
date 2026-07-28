<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Concerns\HandlesTenancy;
use App\Http\Controllers\Controller;
use App\Models\DiagnosticCategory;
use App\Support\SpreadsheetIO;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

class DiagnosticCategoryController extends Controller
{
    use HandlesTenancy;

    public function index(Request $request): JsonResponse
    {
        $companyId = $this->optionalCompanyId($request);

        $query = DiagnosticCategory::with(['testTypes' => fn ($q) => $q->orderBy('name')])
            ->orderBy('sort_order')
            ->orderBy('name');

        if ($companyId) {
            $query->where('company_id', $companyId);
        }

        if ($request->boolean('active_only')) {
            $query->where('is_active', true);
        }

        return response()->json($query->get());
    }

    public function store(Request $request): JsonResponse
    {
        $this->prepareCompanyScope($request);

        $data = $request->validate([
            'company_id'  => $this->companyIdRules(),
            'name'        => ['required', 'string', 'max:120'],
            'description' => ['nullable', 'string'],
            'sort_order'  => ['nullable', 'integer'],
            'is_active'   => ['boolean'],
        ]);

        $data['company_id'] = $this->resolveCompanyId($request);

        $category = DiagnosticCategory::create($data);

        return response()->json($category, 201);
    }

    public function update(Request $request, DiagnosticCategory $diagnosticCategory): JsonResponse
    {
        $this->assertTenantAccess($diagnosticCategory);

        $data = $request->validate([
            'name'        => ['sometimes', 'string', 'max:120'],
            'description' => ['nullable', 'string'],
            'sort_order'  => ['nullable', 'integer'],
            'is_active'   => ['boolean'],
        ]);

        $diagnosticCategory->update($data);

        return response()->json($diagnosticCategory);
    }

    public function destroy(DiagnosticCategory $diagnosticCategory): JsonResponse
    {
        $this->assertTenantAccess($diagnosticCategory);

        if ($diagnosticCategory->testTypes()->exists()) {
            return response()->json([
                'message' => 'Cannot delete a category that has tests. Remove or reassign tests first.',
            ], 422);
        }

        $diagnosticCategory->delete();

        return response()->json(null, 204);
    }

    public function export(Request $request): StreamedResponse
    {
        $companyId = $this->optionalCompanyId($request);

        $query = DiagnosticCategory::query()->orderBy('sort_order')->orderBy('name');
        if ($companyId) {
            $query->where('company_id', $companyId);
        }

        $headers = ['name', 'description', 'sort_order', 'status'];

        return SpreadsheetIO::exportExcel('diagnostic-categories-'.now()->format('Y-m-d'), $headers, function () use ($query) {
            foreach ($query->cursor() as $category) {
                yield [
                    $category->name,
                    $category->description,
                    $category->sort_order,
                    $category->is_active ? 'active' : 'inactive',
                ];
            }
        });
    }

    public function importTemplate(): StreamedResponse
    {
        $headers = ['name', 'description', 'sort_order', 'status'];
        $sampleRows = [
            ['Pathology', 'Lab pathology tests', '0', 'active'],
            ['Radiology', 'X-ray, CT, MRI', '1', 'active'],
            ['Homeopathy', '', '2', 'active'],
        ];

        return SpreadsheetIO::exportTemplate('diagnostic-category-import-sample', $headers, $sampleRows);
    }

    public function import(Request $request): JsonResponse
    {
        $this->prepareCompanyScope($request);

        $request->validate([
            'file' => ['required', 'file', 'max:5120'],
            'company_id' => $this->companyIdRules(),
        ]);

        $extension = strtolower((string) $request->file('file')->getClientOriginalExtension());
        if (! in_array($extension, ['csv', 'txt', 'xls'], true)) {
            return response()->json([
                'message' => 'The file must be a .csv or .xls file (use Sample template or Export Excel).',
            ], 422);
        }

        $companyId = $this->resolveCompanyId($request);

        try {
            $sheet = SpreadsheetIO::readUploadedFile($request->file('file'));
        } catch (\Throwable $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        $columnMap = SpreadsheetIO::mapHeaders($sheet['headers'], [
            'name' => ['name', 'category', 'category_name'],
            'description' => ['description', 'desc', 'details'],
            'sort_order' => ['sort_order', 'sort', 'order'],
            'status' => ['status', 'is_active', 'active'],
        ]);

        if (! isset($columnMap['name'])) {
            return response()->json(['message' => 'Spreadsheet must include a name column.'], 422);
        }

        $imported = 0;
        $updated = 0;
        $skipped = 0;
        $errors = [];
        $line = 1;

        foreach ($sheet['rows'] as $row) {
            $line++;

            if (SpreadsheetIO::isEmptyRow($row)) {
                continue;
            }

            $name = trim(SpreadsheetIO::cell($row, $columnMap, 'name'));
            if ($name === '') {
                $skipped++;
                if (count($errors) < 20) {
                    $errors[] = "Line {$line}: name is required.";
                }
                continue;
            }

            $description = SpreadsheetIO::cell($row, $columnMap, 'description');
            $sortRaw = SpreadsheetIO::cell($row, $columnMap, 'sort_order');
            $statusRaw = SpreadsheetIO::cell($row, $columnMap, 'status');

            $payload = [
                'name' => $name,
                'description' => $description !== '' ? $description : null,
                'sort_order' => is_numeric($sortRaw) ? (int) $sortRaw : 0,
                'is_active' => $this->parseActiveStatus($statusRaw, true),
            ];

            try {
                $existing = DiagnosticCategory::query()
                    ->where('company_id', $companyId)
                    ->whereRaw('LOWER(name) = ?', [mb_strtolower($name)])
                    ->first();

                if ($existing) {
                    $existing->update($payload);
                    $updated++;
                } else {
                    DiagnosticCategory::create([
                        ...$payload,
                        'company_id' => $companyId,
                    ]);
                    $imported++;
                }
            } catch (\Throwable $e) {
                $skipped++;
                if (count($errors) < 20) {
                    $errors[] = "Line {$line}: ".$e->getMessage();
                }
            }
        }

        $message = "Import complete. {$imported} categor".($imported === 1 ? 'y' : 'ies').' created';
        if ($updated > 0) {
            $message .= ", {$updated} updated";
        }
        $message .= '.';

        return response()->json([
            'message' => $message,
            'imported' => $imported,
            'updated' => $updated,
            'skipped' => $skipped,
            'errors' => $errors,
        ]);
    }

    private function parseActiveStatus(string $value, bool $default): bool
    {
        $value = strtolower(trim($value));
        if ($value === '') {
            return $default;
        }

        if (in_array($value, ['1', 'true', 'yes', 'on', 'active'], true)) {
            return true;
        }

        if (in_array($value, ['0', 'false', 'no', 'off', 'inactive'], true)) {
            return false;
        }

        return $default;
    }
}
