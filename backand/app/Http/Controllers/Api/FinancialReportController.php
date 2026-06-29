<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Concerns\HandlesTenancy;
use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Models\Doctor;
use App\Models\Expense;
use App\Services\FinancialSummaryService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class FinancialReportController extends Controller
{
    use HandlesTenancy;

    public function __construct(private FinancialSummaryService $financials) {}

    public function summary(Request $request): JsonResponse
    {
        [$from, $to] = $this->resolveDateRange($request);
        [$companyId, $branchId, $doctorId] = $this->resolveFilters($request);

        return response()->json(
            $this->financials->summary(
                [
                    'company_id' => $companyId,
                    'branch_id' => $branchId,
                    'doctor_id' => $doctorId,
                ],
                $from,
                $to,
                $this->scopeLabels($companyId, $branchId, $doctorId)
            )
        );
    }

    public function expenses(Request $request): JsonResponse
    {
        [$from, $to] = $this->resolveDateRange($request);
        [$companyId, $branchId] = array_slice($this->resolveFilters($request), 0, 2);

        $query = Expense::with(['recorder:id,name', 'branch:id,name'])
            ->where('company_id', $companyId)
            ->when($branchId, fn ($q) => $q->where('branch_id', $branchId))
            ->whereDate('expense_date', '>=', $from->toDateString())
            ->whereDate('expense_date', '<=', $to->toDateString())
            ->orderByDesc('expense_date')
            ->orderByDesc('id');

        return response()->json($query->paginate($request->input('per_page', 50)));
    }

    public function storeExpense(Request $request): JsonResponse
    {
        $this->prepareCompanyScope($request);

        $companyId = auth()->user()->isSuperAdmin()
            ? (int) $request->input('company_id')
            : (int) auth()->user()->company_id;

        $data = $request->validate([
            'company_id' => $this->companyIdRules(),
            'branch_id' => [
                'nullable',
                Rule::exists('branches', 'id')->where(fn ($q) => $q->where('company_id', $companyId)),
            ],
            'category' => ['required', Rule::in(Expense::CATEGORIES)],
            'description' => ['nullable', 'string', 'max:255'],
            'amount' => ['required', 'numeric', 'min:0.01'],
            'expense_date' => ['required', 'date'],
            'payment_method' => ['nullable', 'string', 'max:40'],
            'notes' => ['nullable', 'string'],
        ]);

        $data['company_id'] = $companyId;
        $data['recorded_by'] = auth()->id();

        $expense = Expense::create($data);

        return response()->json($expense->load(['recorder:id,name', 'branch:id,name']), 201);
    }

    public function destroyExpense(Expense $expense): JsonResponse
    {
        $this->assertTenantAccess($expense);
        $expense->delete();

        return response()->json(['deleted' => true]);
    }

    private function resolveDateRange(Request $request): array
    {
        $to = $request->filled('date_to')
            ? Carbon::parse($request->date_to)->endOfDay()
            : Carbon::today()->endOfDay();

        $from = $request->filled('date_from')
            ? Carbon::parse($request->date_from)->startOfDay()
            : Carbon::today()->startOfDay();

        if ($from->gt($to)) {
            [$from, $to] = [$to->copy()->startOfDay(), $from->copy()->endOfDay()];
        }

        return [$from, $to];
    }

    /** @return array{0: int, 1: ?int, 2: ?int} */
    private function resolveFilters(Request $request): array
    {
        $companyId = auth()->user()->isSuperAdmin()
            ? ($request->filled('company_id') ? (int) $request->company_id : null)
            : (auth()->user()->company_id ? (int) auth()->user()->company_id : null);

        abort_unless($companyId, 422, 'Select an organisation to view the financial report.');

        $request->validate([
            'branch_id' => [
                'nullable',
                'integer',
                Rule::exists('branches', 'id')->where(fn ($q) => $q->where('company_id', $companyId)),
            ],
            'doctor_id' => [
                'nullable',
                'integer',
                Rule::exists('doctors', 'id')->where(fn ($q) => $q->where('company_id', $companyId)),
            ],
        ]);

        $branchId = $request->filled('branch_id') ? (int) $request->branch_id : null;
        $doctorId = $request->filled('doctor_id') ? (int) $request->doctor_id : null;

        return [$companyId, $branchId, $doctorId];
    }

    private function scopeLabels(int $companyId, ?int $branchId, ?int $doctorId): array
    {
        $company = auth()->user()->company?->id === $companyId
            ? auth()->user()->company
            : \App\Models\Company::find($companyId);

        $branch = $branchId ? Branch::where('company_id', $companyId)->find($branchId) : null;
        $doctor = $doctorId ? Doctor::with('user')->where('company_id', $companyId)->find($doctorId) : null;

        return [
            'company_id' => $companyId,
            'company_name' => $company?->name,
            'branch_id' => $branchId,
            'branch_name' => $branch?->name,
            'doctor_id' => $doctorId,
            'doctor_name' => $doctor?->user?->name,
        ];
    }
}
