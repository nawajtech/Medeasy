<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Concerns\HandlesTenancy;
use App\Http\Controllers\Controller;
use App\Models\Company;
use App\Models\Department;
use App\Models\DiagnosticOrder;
use App\Models\Doctor;
use App\Models\LabOrder;
use App\Models\Patient;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    use HandlesTenancy;

    public function index(Request $request): JsonResponse
    {
        $user = auth()->user();

        if (! $user->isSuperAdmin() && ! $user->isCompanyAdmin() && ! $user->can('dashboard.view')) {
            abort(403, 'You are not allowed to view the dashboard.');
        }

        $companyId = $this->resolveDashboardCompanyId($request);
        $doctorId = $this->doctorIdForUser();
        [$dateFrom, $dateTo] = $this->resolveDateRange($request);

        $scopeLabel = $this->scopeLabel($companyId);
        $company = $companyId ? Company::find($companyId) : null;

        $canPatients = $user->can('patient.view');
        $canDoctors = $user->can('doctor.view');
        $canDepartments = $user->can('department.view');
        $canCompanies = $user->can('company.view');
        $canDiagnostics = $user->can('diagnostic.view');
        $canLab = $user->can('lab.view');

        if ($company) {
            $modules = Company::normalizeModules($company->modules ?? []);
            $canDiagnostics = $canDiagnostics && in_array(Company::MODULE_DIAGNOSTICS, $modules, true);
            $canLab = $canLab && in_array(Company::MODULE_LABORATORY, $modules, true);
            $canDepartments = $canDepartments && (
                in_array(Company::MODULE_DIAGNOSTICS, $modules, true)
                || in_array(Company::MODULE_LABORATORY, $modules, true)
            );
        }

        $accessFlags = compact(
            'canPatients',
            'canDoctors',
            'canDepartments',
            'canCompanies',
            'canDiagnostics',
            'canLab',
        );

        return response()->json([
            'scope_label' => $scopeLabel,
            'company' => $company ? [
                'id' => $company->id,
                'name' => $company->name,
                'code' => $company->code,
            ] : null,
            'date_range' => [
                'from' => $dateFrom->format('Y-m-d'),
                'to' => $dateTo->format('Y-m-d'),
            ],
            'payment_overview' => ($canDiagnostics || $canLab) && ! $doctorId
                ? $this->paymentOverview($companyId, $dateFrom, $dateTo, $accessFlags)
                : null,
            'patient_collections' => (($canDiagnostics && ! $doctorId) || ($canLab && ! $doctorId))
                ? $this->patientCollectionsOverview($companyId, $doctorId, $dateFrom, $dateTo, $accessFlags)
                : null,
            'companies_payment' => ($canDiagnostics || $canLab) && $user->isSuperAdmin() && ! $companyId && ! $doctorId
                ? $this->companiesPaymentOverview($dateFrom, $dateTo)
                : [],
            'summary' => $this->summary(
                $companyId,
                $doctorId,
                $canCompanies && $user->isSuperAdmin() && ! $companyId,
                $dateFrom,
                $dateTo,
                $accessFlags
            ),
            'doctor_performance' => $canDoctors
                ? $this->doctorPerformance($companyId, $doctorId, $dateFrom, $dateTo)
                : [],
            'companies_overview' => $canCompanies && $user->isSuperAdmin() && ! $companyId && ! $doctorId
                ? $this->companiesOverview($dateFrom, $dateTo)
                : [],
        ]);
    }

    private function resolveDateRange(Request $request): array
    {
        $to = $request->filled('date_to')
            ? Carbon::parse($request->date_to)->endOfDay()
            : Carbon::today()->endOfDay();

        $from = $request->filled('date_from')
            ? Carbon::parse($request->date_from)->startOfDay()
            : Carbon::today()->subDays(29)->startOfDay();

        if ($from->gt($to)) {
            [$from, $to] = [$to->copy()->startOfDay(), $from->copy()->endOfDay()];
        }

        return [$from, $to];
    }

    private function resolveDashboardCompanyId(Request $request): ?int
    {
        $user = auth()->user();

        if ($user->isSuperAdmin()) {
            return $request->filled('company_id') ? (int) $request->company_id : null;
        }

        return $user->company_id ? (int) $user->company_id : null;
    }

    private function scopeLabel(?int $companyId): string
    {
        if ($this->doctorIdForUser()) {
            return auth()->user()->company?->name
                ? auth()->user()->company->name.' — your schedule'
                : 'Your schedule';
        }

        if (auth()->user()->isSuperAdmin() && ! $companyId) {
            return 'All companies';
        }

        return Company::find($companyId)?->name ?? 'Centre overview';
    }

    private function patientQuery(?int $companyId, ?int $doctorId)
    {
        if ($doctorId) {
            return Patient::where(function ($q) use ($doctorId) {
                $q->whereHas('diagnosticOrders', fn ($dq) => $dq->where('doctor_id', $doctorId))
                    ->orWhereHas('labOrders', fn ($lq) => $lq->where('doctor_id', $doctorId));
            });
        }

        $query = Patient::query();
        if ($companyId) {
            $query->where('company_id', $companyId);
        }

        return $query;
    }

    private function doctorQuery(?int $companyId, ?int $doctorId)
    {
        if ($doctorId) {
            return Doctor::where('id', $doctorId);
        }

        $query = Doctor::query()->whereHas(
            'user',
            fn ($q) => $q->where('status', true)
        );
        if ($companyId) {
            $query->where('company_id', $companyId);
        }

        return $query;
    }

    private function paymentOverview(?int $companyId, Carbon $from, Carbon $to, array $flags = []): array
    {
        $canDiagnostics = $flags['canDiagnostics'] ?? true;
        $canLab = $flags['canLab'] ?? true;

        $today = Carbon::today();
        $fromDate = $from->toDateString();
        $toDate = $to->toDateString();

        $todayRevenue = 0.0;
        $periodCollected = 0.0;
        $periodTotal = 0.0;
        $outstandingDue = 0.0;

        if ($canDiagnostics) {
            $diagBase = DiagnosticOrder::query()
                ->where('status', '!=', 'cancelled')
                ->when($companyId, fn ($q) => $q->where('company_id', $companyId));

            $todayRevenue += (float) (clone $diagBase)
                ->whereDate('created_at', $today)
                ->sum('paid_amount');

            $periodDiag = (clone $diagBase)
                ->whereDate('created_at', '>=', $fromDate)
                ->whereDate('created_at', '<=', $toDate);

            $periodCollected += (float) (clone $periodDiag)->sum('paid_amount');
            $periodTotal += (float) (clone $periodDiag)->sum('grand_total');
            $outstandingDue += (float) (clone $periodDiag)->sum('due_amount');
        }

        if ($canLab) {
            $labBase = LabOrder::query()
                ->where('status', '!=', 'cancelled')
                ->when($companyId, fn ($q) => $q->where('company_id', $companyId));

            $todayRevenue += (float) (clone $labBase)
                ->whereDate('ordered_at', $today)
                ->sum('net_amount');

            $periodLab = (clone $labBase)
                ->whereDate('ordered_at', '>=', $fromDate)
                ->whereDate('ordered_at', '<=', $toDate);

            $labAmount = (float) (clone $periodLab)->sum('net_amount');
            $periodCollected += $labAmount;
            $periodTotal += $labAmount;
        }

        $collectionRate = $periodTotal > 0
            ? round(($periodCollected / $periodTotal) * 100, 1)
            : 0;

        return [
            'today_revenue' => round($todayRevenue, 2),
            'period_revenue' => round($periodCollected, 2),
            'outstanding_due' => round($outstandingDue, 2),
            'collection_rate' => $collectionRate,
            'period_total_billed' => round($periodTotal, 2),
        ];
    }

    private function companyModuleFlags(Company $company): array
    {
        $modules = Company::normalizeModules($company->modules ?? []);

        return [
            'canDiagnostics' => in_array(Company::MODULE_DIAGNOSTICS, $modules, true),
            'canLab' => in_array(Company::MODULE_LABORATORY, $modules, true),
        ];
    }

    private function companiesPaymentOverview(Carbon $from, Carbon $to): array
    {
        return Company::query()
            ->where('is_active', true)
            ->orderBy('name')
            ->get()
            ->map(function (Company $company) use ($from, $to) {
                $overview = $this->paymentOverview($company->id, $from, $to, $this->companyModuleFlags($company));

                return [
                    'id' => $company->id,
                    'name' => $company->name,
                    ...$overview,
                ];
            })
            ->values()
            ->all();
    }

    private function summary(
        ?int $companyId,
        ?int $doctorId,
        bool $allCompanies,
        Carbon $from,
        Carbon $to,
        array $flags = [],
    ): array {
        $canPatients = $flags['canPatients'] ?? true;
        $canDoctors = $flags['canDoctors'] ?? true;
        $canDepartments = $flags['canDepartments'] ?? true;
        $canCompanies = $flags['canCompanies'] ?? true;
        $canDiagnostics = $flags['canDiagnostics'] ?? true;
        $canLab = $flags['canLab'] ?? true;

        $diagToday = 0;
        $labToday = 0;
        $today = Carbon::today();

        if ($canDiagnostics) {
            $diagToday = DiagnosticOrder::query()
                ->when($companyId, fn ($q) => $q->where('company_id', $companyId))
                ->when($doctorId, fn ($q) => $q->where('doctor_id', $doctorId))
                ->whereDate('created_at', $today)
                ->where('status', '!=', 'cancelled')
                ->count();
        }

        if ($canLab) {
            $labToday = LabOrder::query()
                ->when($companyId, fn ($q) => $q->where('company_id', $companyId))
                ->when($doctorId, fn ($q) => $q->where('doctor_id', $doctorId))
                ->whereDate('ordered_at', $today)
                ->where('status', '!=', 'cancelled')
                ->count();
        }

        return [
            'patients' => $canPatients ? $this->patientQuery($companyId, $doctorId)->count() : 0,
            'doctors' => $canDoctors ? ($doctorId ? 1 : $this->doctorQuery($companyId, $doctorId)->count()) : 0,
            'departments' => $canDepartments && ! $doctorId
                ? ($companyId
                    ? Department::where('company_id', $companyId)->count()
                    : Department::count())
                : 0,
            'diagnostic_orders_today' => $diagToday,
            'lab_orders_today' => $labToday,
            'companies' => $canCompanies && $allCompanies ? Company::where('is_active', true)->count() : null,
        ];
    }

    private function companiesOverview(Carbon $from, Carbon $to): array
    {
        $fromDate = $from->toDateString();
        $toDate = $to->toDateString();

        return Company::query()
            ->where('is_active', true)
            ->orderBy('name')
            ->get()
            ->map(function (Company $company) use ($from, $to, $fromDate, $toDate) {
                $payments = $this->paymentOverview($company->id, $from, $to, $this->companyModuleFlags($company));
                $modules = Company::normalizeModules($company->modules ?? []);

                $diagCount = in_array(Company::MODULE_DIAGNOSTICS, $modules, true)
                    ? DiagnosticOrder::where('company_id', $company->id)
                        ->where('status', '!=', 'cancelled')
                        ->whereDate('created_at', '>=', $fromDate)
                        ->whereDate('created_at', '<=', $toDate)
                        ->count()
                    : 0;

                return [
                    'id' => $company->id,
                    'name' => $company->name,
                    'patients' => Patient::where('company_id', $company->id)->count(),
                    'doctors' => Doctor::where('company_id', $company->id)
                        ->whereHas('user', fn ($q) => $q->where('status', true))
                        ->count(),
                    'diagnostic_orders' => $diagCount,
                    'period_revenue' => $payments['period_revenue'],
                    'outstanding_due' => $payments['outstanding_due'],
                    'collection_rate' => $payments['collection_rate'],
                ];
            })
            ->values()
            ->all();
    }

    private function doctorPerformance(?int $companyId, ?int $doctorId, Carbon $from, Carbon $to): array
    {
        $showCompany = auth()->user()->isSuperAdmin() && ! $companyId && ! $doctorId;
        $fromDate = $from->toDateString();
        $toDate = $to->toDateString();

        $patientPairs = collect();
        $completedByDoctor = [];
        $revenueByDoctor = [];

        $diagBase = DiagnosticOrder::query()
            ->whereRaw('DATE(COALESCE(scheduled_at, created_at)) BETWEEN ? AND ?', [$fromDate, $toDate])
            ->where('status', '!=', 'cancelled')
            ->whereNotNull('doctor_id')
            ->when($doctorId, fn ($q) => $q->where('doctor_id', $doctorId))
            ->when($companyId && ! $doctorId, fn ($q) => $q->where('company_id', $companyId));

        $patientPairs = $patientPairs->concat(
            (clone $diagBase)->select('doctor_id', 'patient_id')->distinct()->get()
        );

        $diagCompleted = (clone $diagBase)
            ->where('status', 'completed')
            ->select('doctor_id')
            ->selectRaw('COUNT(*) as completed')
            ->groupBy('doctor_id')
            ->pluck('completed', 'doctor_id');

        foreach ($diagCompleted as $id => $count) {
            $completedByDoctor[(int) $id] = ($completedByDoctor[(int) $id] ?? 0) + (int) $count;
        }

        $diagRevenue = (clone $diagBase)
            ->groupBy('doctor_id')
            ->selectRaw('doctor_id, COALESCE(SUM(paid_amount), 0) as revenue')
            ->pluck('revenue', 'doctor_id');

        foreach ($diagRevenue as $id => $amount) {
            $revenueByDoctor[(int) $id] = ($revenueByDoctor[(int) $id] ?? 0) + (float) $amount;
        }

        $labBase = LabOrder::query()
            ->whereDate('ordered_at', '>=', $fromDate)
            ->whereDate('ordered_at', '<=', $toDate)
            ->where('status', '!=', 'cancelled')
            ->whereNotNull('doctor_id')
            ->when($doctorId, fn ($q) => $q->where('doctor_id', $doctorId))
            ->when($companyId && ! $doctorId, fn ($q) => $q->where('company_id', $companyId));

        $patientPairs = $patientPairs->concat(
            (clone $labBase)->select('doctor_id', 'patient_id')->distinct()->get()
        );

        $labCompleted = (clone $labBase)
            ->whereIn('status', ['verified', 'approved'])
            ->select('doctor_id')
            ->selectRaw('COUNT(*) as completed')
            ->groupBy('doctor_id')
            ->pluck('completed', 'doctor_id');

        foreach ($labCompleted as $id => $count) {
            $completedByDoctor[(int) $id] = ($completedByDoctor[(int) $id] ?? 0) + (int) $count;
        }

        $labRevenue = (clone $labBase)
            ->groupBy('doctor_id')
            ->selectRaw('doctor_id, COALESCE(SUM(net_amount), 0) as revenue')
            ->pluck('revenue', 'doctor_id');

        foreach ($labRevenue as $id => $amount) {
            $revenueByDoctor[(int) $id] = ($revenueByDoctor[(int) $id] ?? 0) + (float) $amount;
        }

        $patientCounts = $patientPairs
            ->unique(fn ($row) => ((int) $row->doctor_id).'-'.((int) $row->patient_id))
            ->groupBy(fn ($row) => (int) $row->doctor_id)
            ->map->count();

        return $this->doctorQuery($companyId, $doctorId)
            ->with(['user', 'company'])
            ->get()
            ->map(function (Doctor $doctor) use ($patientCounts, $revenueByDoctor, $completedByDoctor, $showCompany) {
                $id = (int) $doctor->id;

                return [
                    'doctor_id' => $id,
                    'doctor_name' => $doctor->user?->name ?? 'Doctor #'.$id,
                    'company_name' => $showCompany ? $doctor->company?->name : null,
                    'patients' => (int) ($patientCounts->get($id) ?? 0),
                    'completed' => (int) ($completedByDoctor[$id] ?? 0),
                    'revenue' => round((float) ($revenueByDoctor[$id] ?? 0), 2),
                ];
            })
            ->filter(fn (array $row) => $row['patients'] > 0 || $row['completed'] > 0 || $row['revenue'] > 0)
            ->sortByDesc('revenue')
            ->values()
            ->all();
    }

    private function patientCollectionsOverview(
        ?int $companyId,
        ?int $doctorId,
        Carbon $from,
        Carbon $to,
        array $flags,
    ): array {
        $canDiagnostics = ($flags['canDiagnostics'] ?? false) && ! $doctorId;
        $canLab = ($flags['canLab'] ?? false) && ! $doctorId;

        $diagnostics = $canDiagnostics
            ? $this->diagnosticCollectionStats($companyId, $from, $to)
            : null;

        $lab = $canLab
            ? $this->labCollectionStats($companyId, $from, $to)
            : null;

        $totals = $this->mergeCollectionTotals($diagnostics, $lab);

        [$prevFrom, $prevTo] = $this->previousPeriod($from, $to);

        $prevDiagnostics = $canDiagnostics
            ? $this->diagnosticCollectionStats($companyId, $prevFrom, $prevTo)
            : null;

        $prevLab = $canLab
            ? $this->labCollectionStats($companyId, $prevFrom, $prevTo)
            : null;

        $prevTotals = $this->mergeCollectionTotals($prevDiagnostics, $prevLab);

        $showMoney = $canDiagnostics || $canLab;

        return [
            'diagnostics' => $diagnostics,
            'lab' => $lab,
            'totals' => $totals,
            'growth' => [
                'previous_period' => [
                    'from' => $prevFrom->format('Y-m-d'),
                    'to' => $prevTo->format('Y-m-d'),
                ],
                'collected_percent' => $showMoney
                    ? $this->growthPercent($totals['collected'] ?? 0, $prevTotals['collected'] ?? 0)
                    : null,
                'outstanding_percent' => $showMoney
                    ? $this->growthPercent($totals['outstanding'] ?? 0, $prevTotals['outstanding'] ?? 0)
                    : null,
                'completed_percent' => $this->growthPercent(
                    $totals['completed_count'] ?? 0,
                    $prevTotals['completed_count'] ?? 0
                ),
                'pending_percent' => $this->growthPercent(
                    $totals['pending_count'] ?? 0,
                    $prevTotals['pending_count'] ?? 0
                ),
                'collection_rate_change' => $showMoney
                    ? round(($totals['collection_rate'] ?? 0) - ($prevTotals['collection_rate'] ?? 0), 1)
                    : null,
            ],
        ];
    }

    private function diagnosticCollectionStats(?int $companyId, Carbon $from, Carbon $to): array
    {
        $pendingStatuses = ['booked', 'scheduled', 'in_progress', 'not_present'];
        $fromDate = $from->toDateString();
        $toDate = $to->toDateString();

        $base = DiagnosticOrder::query()
            ->when($companyId, fn ($q) => $q->where('company_id', $companyId))
            ->whereDate('created_at', '>=', $fromDate)
            ->whereDate('created_at', '<=', $toDate);

        $completedCount = (clone $base)->where('status', 'completed')->count();
        $pendingCount = (clone $base)->whereIn('status', $pendingStatuses)->count();
        $cancelledCount = (clone $base)->where('status', 'cancelled')->count();

        $moneyQuery = (clone $base)->where('status', '!=', 'cancelled');
        $collected = round((float) (clone $moneyQuery)->sum('paid_amount'), 2);
        $outstanding = round((float) (clone $moneyQuery)->sum('due_amount'), 2);
        $totalBilled = round((float) (clone $moneyQuery)->sum('grand_total'), 2);

        return [
            'completed_count' => $completedCount,
            'pending_count' => $pendingCount,
            'cancelled_count' => $cancelledCount,
            'collected' => $collected,
            'outstanding' => $outstanding,
            'total_billed' => $totalBilled,
            'collection_rate' => $totalBilled > 0
                ? round(($collected / $totalBilled) * 100, 1)
                : 0,
        ];
    }

    private function labCollectionStats(?int $companyId, Carbon $from, Carbon $to): array
    {
        $pendingStatuses = ['pending', 'collected', 'processing', 'resulted'];
        $completedStatuses = ['verified', 'approved'];
        $fromDate = $from->toDateString();
        $toDate = $to->toDateString();

        $base = LabOrder::query()
            ->when($companyId, fn ($q) => $q->where('company_id', $companyId))
            ->whereDate('ordered_at', '>=', $fromDate)
            ->whereDate('ordered_at', '<=', $toDate);

        $completedCount = (clone $base)->whereIn('status', $completedStatuses)->count();
        $pendingCount = (clone $base)->whereIn('status', $pendingStatuses)->count();
        $cancelledCount = (clone $base)->where('status', 'cancelled')->count();

        $moneyQuery = (clone $base)->where('status', '!=', 'cancelled');
        $collected = round((float) (clone $moneyQuery)->sum('net_amount'), 2);

        return [
            'completed_count' => $completedCount,
            'pending_count' => $pendingCount,
            'cancelled_count' => $cancelledCount,
            'collected' => $collected,
            'outstanding' => 0,
            'total_billed' => $collected,
            'collection_rate' => $collected > 0 ? 100 : 0,
        ];
    }

    /** @param  array<string, mixed>|null  ...$sources */
    private function mergeCollectionTotals(?array ...$sources): array
    {
        $totals = [
            'completed_count' => 0,
            'pending_count' => 0,
            'cancelled_count' => 0,
            'collected' => 0,
            'outstanding' => 0,
            'total_billed' => 0,
            'collection_rate' => 0,
        ];

        foreach ($sources as $source) {
            if (! $source) {
                continue;
            }

            $totals['completed_count'] += (int) ($source['completed_count'] ?? 0);
            $totals['pending_count'] += (int) ($source['pending_count'] ?? 0);
            $totals['cancelled_count'] += (int) ($source['cancelled_count'] ?? 0);
            $totals['collected'] += (float) ($source['collected'] ?? 0);
            $totals['outstanding'] += (float) ($source['outstanding'] ?? 0);
            $totals['total_billed'] += (float) ($source['total_billed'] ?? 0);
        }

        $totals['collected'] = round($totals['collected'], 2);
        $totals['outstanding'] = round($totals['outstanding'], 2);
        $totals['total_billed'] = round($totals['total_billed'], 2);
        $totals['collection_rate'] = $totals['total_billed'] > 0
            ? round(($totals['collected'] / $totals['total_billed']) * 100, 1)
            : 0;

        return $totals;
    }

    private function previousPeriod(Carbon $from, Carbon $to): array
    {
        $days = $from->diffInDays($to) + 1;
        $prevTo = $from->copy()->subDay()->endOfDay();
        $prevFrom = $prevTo->copy()->subDays($days - 1)->startOfDay();

        return [$prevFrom, $prevTo];
    }

    private function growthPercent(float $current, float $previous): float
    {
        if ($previous == 0) {
            return $current > 0 ? 100.0 : 0.0;
        }

        return round((($current - $previous) / $previous) * 100, 1);
    }
}