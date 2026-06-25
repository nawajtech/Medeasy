<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Concerns\HandlesTenancy;
use App\Http\Controllers\Controller;
use App\Models\Appointment;
use App\Models\Billing;
use App\Models\Company;
use App\Models\Department;
use App\Models\Doctor;
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
        $companyId = $this->resolveDashboardCompanyId($request);
        $doctorId = $this->doctorIdForUser();
        [$dateFrom, $dateTo] = $this->resolveDateRange($request);

        $scopeLabel = $this->scopeLabel($companyId);
        $company = $companyId ? Company::find($companyId) : null;

        $canBilling = $user->can('billing.view');
        $canPatients = $user->can('patient.view');
        $canDoctors = $user->can('doctor.view');
        $canAppointments = $user->can('appointment.view');
        $canDepartments = $user->can('department.view');
        $canCompanies = $user->can('company.view');

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
            'payment_overview' => $canBilling && ! $doctorId
                ? $this->paymentOverview($companyId, $dateFrom, $dateTo)
                : null,
            'companies_payment' => $canBilling && $user->isSuperAdmin() && ! $companyId && ! $doctorId
                ? $this->companiesPaymentOverview($dateFrom, $dateTo)
                : [],
            'summary' => $this->summary(
                $companyId,
                $doctorId,
                $canCompanies && $user->isSuperAdmin() && ! $companyId,
                $dateFrom,
                $dateTo,
                compact('canPatients', 'canDoctors', 'canAppointments', 'canDepartments', 'canBilling', 'canCompanies')
            ),
            'appointments_by_status' => $canAppointments
                ? $this->appointmentsByStatus($companyId, $doctorId, $dateFrom, $dateTo)
                : [],
            'appointments_by_month' => $canAppointments
                ? $this->appointmentsByMonth($companyId, $doctorId, $dateFrom, $dateTo)
                : [],
            'billing_by_month' => $canBilling && ! $doctorId
                ? $this->billingByMonth($companyId, $dateFrom, $dateTo)
                : [],
            'doctor_performance' => $canDoctors
                ? $this->doctorPerformance($companyId, $doctorId, $dateFrom, $dateTo)
                : [],
            'companies_overview' => $canCompanies && $user->isSuperAdmin() && ! $companyId && ! $doctorId
                ? $this->companiesOverview($dateFrom, $dateTo)
                : [],
            'recent_appointments' => $canAppointments
                ? $this->recentAppointments($companyId, $doctorId, $dateFrom, $dateTo)
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

        return Company::find($companyId)?->name ?? 'Clinic overview';
    }

    private function appointmentQuery(?int $companyId, ?int $doctorId, ?Carbon $from = null, ?Carbon $to = null)
    {
        $query = Appointment::query();

        if ($doctorId) {
            $query->where('doctor_id', $doctorId);
        } elseif ($companyId) {
            $query->where('company_id', $companyId);
        }

        if ($from && $to) {
            $query->whereBetween('appointment_date', [$from, $to]);
        }

        return $query;
    }

    private function patientQuery(?int $companyId, ?int $doctorId)
    {
        if ($doctorId) {
            return Patient::whereHas(
                'appointments',
                fn ($q) => $q->where('doctor_id', $doctorId)
            );
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

        $query = Doctor::query();
        if ($companyId) {
            $query->where('company_id', $companyId);
        }

        return $query;
    }

    private function billingQuery(?int $companyId, ?Carbon $from = null, ?Carbon $to = null)
    {
        $query = Billing::query();
        if ($companyId) {
            $query->where('company_id', $companyId);
        }

        if ($from && $to) {
            $query->whereBetween('billed_at', [$from->toDateString(), $to->toDateString()]);
        }

        return $query;
    }

    private function billingQueryAllTime(?int $companyId)
    {
        $query = Billing::query();
        if ($companyId) {
            $query->where('company_id', $companyId);
        }

        return $query;
    }

    private function paymentOverview(?int $companyId, Carbon $from, Carbon $to): array
    {
        $today = Carbon::today();

        $todayRevenue = (float) $this->billingQueryAllTime($companyId)
            ->whereDate('paid_at', $today)
            ->sum('paid_amount');

        if ($todayRevenue <= 0) {
            $todayRevenue = (float) $this->billingQueryAllTime($companyId)
                ->whereDate('billed_at', $today)
                ->sum('paid_amount');
        }

        $periodQuery = $this->billingQuery($companyId, $from, $to);
        $periodCollected = (float) (clone $periodQuery)->sum('paid_amount');
        $periodTotal = (float) (clone $periodQuery)->sum('total_amount');
        $outstandingDue = (float) (clone $periodQuery)->sum('due_amount');

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

    private function companiesPaymentOverview(Carbon $from, Carbon $to): array
    {
        return Company::query()
            ->where('is_active', true)
            ->orderBy('name')
            ->get()
            ->map(function (Company $company) use ($from, $to) {
                $overview = $this->paymentOverview($company->id, $from, $to);

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
        $today = Carbon::today();
        $canPatients = $flags['canPatients'] ?? true;
        $canDoctors = $flags['canDoctors'] ?? true;
        $canAppointments = $flags['canAppointments'] ?? true;
        $canDepartments = $flags['canDepartments'] ?? true;
        $canBilling = $flags['canBilling'] ?? true;
        $canCompanies = $flags['canCompanies'] ?? true;

        $summary = [
            'patients' => $canPatients ? $this->patientQuery($companyId, $doctorId)->count() : 0,
            'doctors' => $canDoctors ? ($doctorId ? 1 : $this->doctorQuery($companyId, $doctorId)->count()) : 0,
            'departments' => $canDepartments && ! $doctorId
                ? ($companyId
                    ? Department::where('company_id', $companyId)->count()
                    : Department::count())
                : 0,
            'appointments_total' => $canAppointments
                ? $this->appointmentQuery($companyId, $doctorId, $from, $to)->count()
                : 0,
            'appointments_today' => $canAppointments
                ? $this->appointmentQuery($companyId, $doctorId)->whereDate('appointment_date', $today)->count()
                : 0,
            'billing_collected' => 0,
            'billing_pending' => 0,
            'companies' => $canCompanies && $allCompanies ? Company::where('is_active', true)->count() : null,
        ];

        if ($canBilling && ! $doctorId) {
            $billing = $this->billingQuery($companyId, $from, $to);
            $summary['billing_collected'] = (float) (clone $billing)->sum('paid_amount');
            $summary['billing_pending'] = (float) (clone $billing)->sum('due_amount');
        }

        return $summary;
    }

    private function appointmentsByStatus(?int $companyId, ?int $doctorId, Carbon $from, Carbon $to): array
    {
        $rows = $this->appointmentQuery($companyId, $doctorId, $from, $to)
            ->select('status', DB::raw('count(*) as count'))
            ->groupBy('status')
            ->orderBy('status')
            ->get();

        return $rows->map(fn ($row) => [
            'status' => $row->status,
            'count' => (int) $row->count,
        ])->values()->all();
    }

    private function appointmentsByMonth(?int $companyId, ?int $doctorId, Carbon $from, Carbon $to): array
    {
        $driver = DB::connection()->getDriverName();
        $monthExpr = $driver === 'pgsql'
            ? "to_char(appointment_date, 'YYYY-MM')"
            : "DATE_FORMAT(appointment_date, '%Y-%m')";

        $rows = $this->appointmentQuery($companyId, $doctorId, $from, $to)
            ->selectRaw("{$monthExpr} as month, count(*) as count")
            ->groupBy('month')
            ->orderBy('month')
            ->get()
            ->keyBy('month');

        $result = [];
        $cursor = $from->copy()->startOfMonth();
        $end = $to->copy()->startOfMonth();

        while ($cursor->lte($end)) {
            $key = $cursor->format('Y-m');
            $result[] = [
                'month' => $key,
                'label' => $cursor->format('M Y'),
                'count' => (int) ($rows[$key]->count ?? 0),
            ];
            $cursor->addMonth();
        }

        return $result;
    }

    private function billingByMonth(?int $companyId, Carbon $from, Carbon $to): array
    {
        $driver = DB::connection()->getDriverName();
        $monthExpr = $driver === 'pgsql'
            ? "to_char(billed_at, 'YYYY-MM')"
            : "DATE_FORMAT(billed_at, '%Y-%m')";

        $rows = $this->billingQuery($companyId, $from, $to)
            ->selectRaw("{$monthExpr} as month")
            ->selectRaw('sum(paid_amount) as collected')
            ->selectRaw('sum(due_amount) as pending')
            ->groupBy('month')
            ->orderBy('month')
            ->get()
            ->keyBy('month');

        $result = [];
        $cursor = $from->copy()->startOfMonth();
        $end = $to->copy()->startOfMonth();

        while ($cursor->lte($end)) {
            $key = $cursor->format('Y-m');
            $row = $rows[$key] ?? null;
            $result[] = [
                'month' => $key,
                'label' => $cursor->format('M Y'),
                'collected' => round((float) ($row->collected ?? 0), 2),
                'pending' => round((float) ($row->pending ?? 0), 2),
            ];
            $cursor->addMonth();
        }

        return $result;
    }

    private function companiesOverview(Carbon $from, Carbon $to): array
    {
        return Company::query()
            ->where('is_active', true)
            ->orderBy('name')
            ->get()
            ->map(function (Company $company) use ($from, $to) {
                $payments = $this->paymentOverview($company->id, $from, $to);

                return [
                    'id' => $company->id,
                    'name' => $company->name,
                    'patients' => Patient::where('company_id', $company->id)->count(),
                    'doctors' => Doctor::where('company_id', $company->id)->count(),
                    'appointments' => Appointment::where('company_id', $company->id)
                        ->whereBetween('appointment_date', [$from, $to])
                        ->count(),
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

        $appointmentScope = Appointment::query()
            ->whereBetween('appointment_date', [$from, $to])
            ->where('status', '!=', 'cancelled');

        if ($doctorId) {
            $appointmentScope->where('doctor_id', $doctorId);
        } elseif ($companyId) {
            $appointmentScope->where('company_id', $companyId);
        }

        $patientCounts = (clone $appointmentScope)
            ->select('doctor_id')
            ->selectRaw('COUNT(DISTINCT patient_id) as patients')
            ->groupBy('doctor_id')
            ->pluck('patients', 'doctor_id');

        $fromDate = $from->toDateString();
        $toDate = $to->toDateString();

        $revenueByDoctor = Billing::query()
            ->join('appointments', 'billings.appointment_id', '=', 'appointments.id')
            ->whereBetween('billings.billed_at', [$fromDate, $toDate])
            ->whereBetween('appointments.appointment_date', [$from, $to])
            ->where('appointments.status', '!=', 'cancelled')
            ->when($doctorId, fn ($q) => $q->where('appointments.doctor_id', $doctorId))
            ->when($companyId && ! $doctorId, fn ($q) => $q->where('billings.company_id', $companyId))
            ->groupBy('appointments.doctor_id')
            ->selectRaw('appointments.doctor_id, COALESCE(SUM(billings.paid_amount), 0) as revenue')
            ->pluck('revenue', 'doctor_id');

        return $this->doctorQuery($companyId, $doctorId)
            ->with(['user', 'company'])
            ->get()
            ->map(function (Doctor $doctor) use ($patientCounts, $revenueByDoctor, $showCompany) {
                return [
                    'doctor_id' => $doctor->id,
                    'doctor_name' => $doctor->user?->name ?? 'Doctor #'.$doctor->id,
                    'company_name' => $showCompany ? $doctor->company?->name : null,
                    'patients' => (int) ($patientCounts[$doctor->id] ?? 0),
                    'revenue' => round((float) ($revenueByDoctor[$doctor->id] ?? 0), 2),
                ];
            })
            ->sortByDesc('revenue')
            ->values()
            ->all();
    }

    private function recentAppointments(?int $companyId, ?int $doctorId, Carbon $from, Carbon $to): array
    {
        return $this->appointmentQuery($companyId, $doctorId, $from, $to)
            ->with(['patient', 'doctor.user', 'company'])
            ->orderByDesc('appointment_date')
            ->limit(8)
            ->get()
            ->map(fn (Appointment $a) => [
                'id' => $a->id,
                'appointment_date' => $a->appointment_date,
                'status' => $a->status,
                'patient_name' => $a->patient?->name,
                'doctor_name' => $a->doctor?->user?->name,
                'company_name' => $a->company?->name,
            ])
            ->all();
    }
}
