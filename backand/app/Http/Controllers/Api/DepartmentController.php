<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Concerns\HandlesTenancy;
use App\Http\Controllers\Controller;
use App\Models\Department;
use App\Support\SpreadsheetIO;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\StreamedResponse;

class DepartmentController extends Controller
{
    use HandlesTenancy;

    public function index(Request $request): JsonResponse
    {
        $query = Department::with('company')->withCount('doctors')->orderBy('name');

        if (auth()->user()->isSuperAdmin() && $request->filled('company_id')) {
            $query->where('company_id', (int) $request->company_id);
        }

        return response()->json($query->get());
    }

    public function store(Request $request): JsonResponse
    {
        if ($this->doctorIdForUser()) {
            abort(403, 'Doctors cannot manage departments.');
        }

        $companyId = $this->resolveCompanyId($request);
        $validated = $request->validate($this->rules(null, $companyId));

        $department = Department::create([
            ...$validated,
            'company_id' => $companyId,
        ]);

        return response()->json($department->load('company'), 201);
    }

    public function show(string $id): JsonResponse
    {
        $department = Department::with('company')->withCount('doctors')->findOrFail($id);
        $this->assertTenantAccess($department);

        return response()->json($department);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        if ($this->doctorIdForUser()) {
            abort(403, 'Doctors cannot manage departments.');
        }

        $department = Department::findOrFail($id);
        $this->assertTenantAccess($department);
        $department->update($request->validate($this->rules($department->id, $department->company_id)));

        return response()->json($department->fresh(['company']));
    }

    public function destroy(string $id): JsonResponse
    {
        if ($this->doctorIdForUser()) {
            abort(403, 'Doctors cannot manage departments.');
        }

        $department = Department::findOrFail($id);
        $this->assertTenantAccess($department);

        if ($department->doctors()->exists()) {
            return response()->json([
                'message' => 'Cannot delete department while doctors are assigned to it.',
            ], 422);
        }

        $department->delete();

        return response()->json(['message' => 'Department deleted successfully']);
    }

    public function export(Request $request): StreamedResponse
    {
        if ($this->doctorIdForUser()) {
            abort(403, 'Doctors cannot export departments.');
        }

        $companyId = $this->optionalCompanyId($request);
        $query = Department::query()->orderBy('name');
        if ($companyId) {
            $query->where('company_id', $companyId);
        }

        $headers = ['name', 'code', 'description', 'status'];

        return SpreadsheetIO::exportExcel('departments-'.now()->format('Y-m-d'), $headers, function () use ($query) {
            foreach ($query->cursor() as $department) {
                yield [
                    $department->name,
                    $department->code,
                    $department->description,
                    $department->is_active ? 'active' : 'inactive',
                ];
            }
        });
    }

    public function importTemplate(): StreamedResponse
    {
        if ($this->doctorIdForUser()) {
            abort(403, 'Doctors cannot download department import templates.');
        }

        $headers = ['name', 'code', 'description', 'status'];
        $sampleRows = [
            ['Cardiology', 'CARD', 'Heart and cardiovascular care', 'active'],
            ['General Medicine', 'GEN', 'Primary care and general medicine', 'active'],
            ['Orthopedics', 'ORTH', 'Bones and joints', 'active'],
        ];

        return SpreadsheetIO::exportTemplate('department-import-sample', $headers, $sampleRows);
    }

    public function import(Request $request): JsonResponse
    {
        if ($this->doctorIdForUser()) {
            abort(403, 'Doctors cannot import departments.');
        }

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
            'name' => ['name', 'department', 'department_name', 'speciality'],
            'code' => ['code', 'dept_code', 'short_code'],
            'description' => ['description', 'desc', 'details'],
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

            $code = trim(SpreadsheetIO::cell($row, $columnMap, 'code'));
            $description = SpreadsheetIO::cell($row, $columnMap, 'description');
            $statusRaw = SpreadsheetIO::cell($row, $columnMap, 'status');

            $payload = [
                'name' => $name,
                'code' => $code !== '' ? $code : null,
                'description' => $description !== '' ? $description : null,
                'is_active' => $this->parseActiveStatus($statusRaw, true),
            ];

            try {
                if ($payload['code']) {
                    $codeTaken = Department::query()
                        ->where('company_id', $companyId)
                        ->whereRaw('LOWER(code) = ?', [mb_strtolower($payload['code'])])
                        ->whereRaw('LOWER(name) != ?', [mb_strtolower($name)])
                        ->exists();
                    if ($codeTaken) {
                        $skipped++;
                        if (count($errors) < 20) {
                            $errors[] = "Line {$line}: code \"{$payload['code']}\" is already used.";
                        }
                        continue;
                    }
                }

                $existing = Department::query()
                    ->where('company_id', $companyId)
                    ->whereRaw('LOWER(name) = ?', [mb_strtolower($name)])
                    ->first();

                if ($existing) {
                    $existing->update($payload);
                    $updated++;
                } else {
                    Department::create([
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

        $message = "Import complete. {$imported} department(s) created";
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

    private function rules(?int $departmentId = null, ?int $companyId = null): array
    {
        $companyId ??= auth()->user()?->company_id;

        return [
            'company_id' => auth()->user()->isSuperAdmin()
                ? ['required', 'exists:companies,id']
                : ['prohibited'],
            'name' => [
                'required',
                'string',
                'max:255',
                Rule::unique('departments', 'name')->where('company_id', $companyId)->ignore($departmentId),
            ],
            'code' => [
                'nullable',
                'string',
                'max:50',
                Rule::unique('departments', 'code')->where('company_id', $companyId)->ignore($departmentId),
            ],
            'description' => ['nullable', 'string'],
            'is_active' => ['boolean'],
        ];
    }
}
