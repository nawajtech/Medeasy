<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Medicine;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\StreamedResponse;

class MedicineController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Medicine::query()->orderBy('name');

        if ($request->filled('search')) {
            $term = '%'.$request->search.'%';
            $query->where(function ($q) use ($term) {
                $q->where('name', 'like', $term)
                    ->orWhere('manufacturer_name', 'like', $term)
                    ->orWhere('composition', 'like', $term);
            });
        }

        $perPage = min(max((int) $request->input('per_page', 50), 1), 100);

        return response()->json($query->paginate($perPage));
    }

    public function store(Request $request): JsonResponse
    {
        $medicine = Medicine::create($request->validate($this->rules()));

        return response()->json($medicine, 201);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $medicine = Medicine::findOrFail($id);
        $medicine->update($request->validate($this->rules($medicine->id)));

        return response()->json($medicine->fresh());
    }

    public function destroy(string $id): JsonResponse
    {
        Medicine::findOrFail($id)->delete();

        return response()->json(['message' => 'Medicine deleted successfully']);
    }

    public function export(): StreamedResponse
    {
        $query = Medicine::query()->orderBy('name');
        $filename = 'medicines-'.now()->format('Y-m-d').'.csv';

        return response()->streamDownload(function () use ($query) {
            $handle = fopen('php://output', 'w');
            fprintf($handle, chr(0xEF).chr(0xBB).chr(0xBF));
            fputcsv($handle, ['name', 'manufacturer_name', 'composition']);

            $query->chunk(500, function ($rows) use ($handle) {
                foreach ($rows as $row) {
                    fputcsv($handle, [
                        $row->name,
                        $row->manufacturer_name,
                        $row->composition,
                    ]);
                }
            });

            fclose($handle);
        }, $filename, [
            'Content-Type' => 'text/csv; charset=UTF-8',
        ]);
    }

    public function import(Request $request): JsonResponse
    {
        $request->validate([
            'file' => ['required', 'file', 'mimes:csv,txt', 'max:51200'],
        ]);

        $path = $request->file('file')->getRealPath();
        $handle = fopen($path, 'r');

        if ($handle === false) {
            return response()->json(['message' => 'Could not read uploaded file.'], 422);
        }

        $headerRow = fgetcsv($handle);
        if (! $headerRow) {
            fclose($handle);

            return response()->json(['message' => 'CSV file is empty.'], 422);
        }

        $columnMap = $this->mapCsvHeaders($headerRow);
        if (! isset($columnMap['name'])) {
            fclose($handle);

            return response()->json(['message' => 'CSV must include a name column.'], 422);
        }

        $imported = 0;
        $skipped = 0;
        $duplicates = 0;
        $errors = [];
        $batch = [];
        $now = now();
        $line = 1;

        while (($row = fgetcsv($handle)) !== false) {
            $line++;

            if ($this->isEmptyRow($row)) {
                continue;
            }

            $name = trim($row[$columnMap['name']] ?? '');
            if ($name === '') {
                $skipped++;
                if (count($errors) < 20) {
                    $errors[] = "Line {$line}: name is required.";
                }
                continue;
            }

            if (isset($batch[$name])) {
                $duplicates++;
            }

            $manufacturer = isset($columnMap['manufacturer_name'])
                ? trim($row[$columnMap['manufacturer_name']] ?? '') ?: null
                : null;

            $composition = $this->resolveComposition($row, $columnMap);

            $batch[$name] = [
                'name' => $name,
                'manufacturer_name' => $manufacturer,
                'composition' => $composition,
                'created_at' => $now,
                'updated_at' => $now,
            ];

            if (count($batch) >= 500) {
                $imported += $this->upsertBatch($batch);
                $batch = [];
            }
        }

        fclose($handle);

        if (count($batch) > 0) {
            $imported += $this->upsertBatch($batch);
        }

        $message = "Import complete. {$imported} medicine(s) saved.";
        if ($duplicates > 0) {
            $message .= " {$duplicates} duplicate name(s) in file used the last row.";
        }

        return response()->json([
            'message' => $message,
            'imported' => $imported,
            'skipped' => $skipped,
            'duplicates' => $duplicates,
            'errors' => $errors,
        ]);
    }

    private function upsertBatch(array $batch): int
    {
        $rows = array_values($batch);

        if (count($rows) === 0) {
            return 0;
        }

        Medicine::upsert(
            $rows,
            ['name'],
            ['manufacturer_name', 'composition', 'updated_at']
        );

        return count($rows);
    }

    private function mapCsvHeaders(array $headers): array
    {
        $map = [];

        foreach ($headers as $index => $header) {
            $key = $this->normalizeHeader((string) $header);

            if (in_array($key, ['name', 'medicine', 'medicine_name', 'drug_name'], true)) {
                $map['name'] = $index;
            }
            if (in_array($key, ['manufacturer_name', 'manufacturer', 'manufacturername'], true)) {
                $map['manufacturer_name'] = $index;
            }
            if (in_array($key, ['composition', 'short_composition'], true)) {
                $map['composition'] = $index;
            }
            if ($key === 'short_composition1') {
                $map['short_composition1'] = $index;
            }
            if ($key === 'short_composition2') {
                $map['short_composition2'] = $index;
            }
        }

        return $map;
    }

    private function normalizeHeader(string $header): string
    {
        $header = preg_replace('/^\xEF\xBB\xBF/', '', $header) ?? $header;
        $header = strtolower(trim($header));
        $header = preg_replace('/[^\w]+/', '_', $header) ?? $header;

        return trim($header, '_');
    }

    private function resolveComposition(array $row, array $columnMap): ?string
    {
        if (isset($columnMap['composition'])) {
            $value = trim($row[$columnMap['composition']] ?? '');

            return $value !== '' ? $value : null;
        }

        $parts = [];

        if (isset($columnMap['short_composition1'])) {
            $part = trim($row[$columnMap['short_composition1']] ?? '');
            if ($part !== '') {
                $parts[] = $part;
            }
        }

        if (isset($columnMap['short_composition2'])) {
            $part = trim($row[$columnMap['short_composition2']] ?? '');
            if ($part !== '') {
                $parts[] = $part;
            }
        }

        if (count($parts) === 0) {
            return null;
        }

        return implode(' + ', $parts);
    }

    private function isEmptyRow(array $row): bool
    {
        foreach ($row as $cell) {
            if (trim((string) $cell) !== '') {
                return false;
            }
        }

        return true;
    }

    private function rules(?int $medicineId = null): array
    {
        return [
            'name' => [
                'required',
                'string',
                'max:255',
                Rule::unique('medicines', 'name')->ignore($medicineId),
            ],
            'manufacturer_name' => ['nullable', 'string', 'max:255'],
            'composition' => ['nullable', 'string'],
        ];
    }
}
