<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Concerns\HandlesTenancy;
use App\Http\Controllers\Controller;
use App\Models\Report;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ReportController extends Controller
{
    use HandlesTenancy;

    private const TYPES = ['appointments', 'billing', 'patients', 'doctors', 'custom'];

    private const STATUSES = ['draft', 'published'];

    public function index(Request $request): JsonResponse
    {
        $query = Report::with('company')->orderByDesc('created_at');

        if (auth()->user()->isDoctor()) {
            abort(403, 'Doctors cannot access reports.');
        }

        if (auth()->user()->isSuperAdmin() && $request->filled('company_id')) {
            $query->where('company_id', (int) $request->company_id);
        }

        return response()->json($query->get());
    }

    public function store(Request $request): JsonResponse
    {
        if (auth()->user()->isDoctor()) {
            abort(403, 'Doctors cannot create reports.');
        }

        $companyId = $this->resolveCompanyId($request);
        $validated = $request->validate($this->rules(null, $companyId));

        if ($request->boolean('mark_generated')) {
            $validated['generated_at'] = now();
        }

        unset($validated['mark_generated']);

        $report = Report::create([
            ...$validated,
            'company_id' => $companyId,
        ]);

        return response()->json($report, 201);
    }

    public function show(string $id): JsonResponse
    {
        $report = Report::with('company')->findOrFail($id);
        $this->assertTenantAccess($report);

        return response()->json($report);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        if (auth()->user()->isDoctor()) {
            abort(403, 'Doctors cannot update reports.');
        }

        $report = Report::findOrFail($id);
        $this->assertTenantAccess($report);
        $validated = $request->validate($this->rules($report->id, $report->company_id));

        if ($request->boolean('mark_generated') && ! $report->generated_at) {
            $validated['generated_at'] = now();
        }

        unset($validated['mark_generated']);

        $report->update($validated);

        return response()->json($report->fresh(['company']));
    }

    public function destroy(string $id): JsonResponse
    {
        if (auth()->user()->isDoctor()) {
            abort(403, 'Doctors cannot delete reports.');
        }

        $report = Report::findOrFail($id);
        $this->assertTenantAccess($report);
        $report->delete();

        return response()->json(['message' => 'Report deleted successfully']);
    }

    private function rules(?int $reportId = null, ?int $companyId = null): array
    {
        $companyId ??= auth()->user()?->company_id;

        return [
            'company_id' => auth()->user()->isSuperAdmin()
                ? ['required', 'exists:companies,id']
                : ['prohibited'],
            'title' => ['required', 'string', 'max:255'],
            'report_type' => ['required', Rule::in(self::TYPES)],
            'period_start' => ['nullable', 'date'],
            'period_end' => ['nullable', 'date', 'after_or_equal:period_start'],
            'summary' => ['nullable', 'string'],
            'status' => ['required', Rule::in(self::STATUSES)],
            'generated_at' => ['nullable', 'date'],
            'mark_generated' => ['boolean'],
        ];
    }
}
