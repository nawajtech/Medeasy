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

        $scopeLabel = $this->scopeLabel($companyId);
        $company = $companyId ? Company::find($companyId) : null;

        return response()->json([
            'scope_label' => $scopeLabel,
            'company' => $company ? [
                'id' => $company->id,
                'name' => $company->name,
                'code' => $company->code,
            ] : null,
            'summary' => $this->summary($companyId, $doctorId, $user->isSuperAdmin() && ! $companyId),
            'appointments_by_status' => $this->appointmentsByStatus($companyId, $doctorId),
            'appointments_by_month' => $this->appointmentsByMonth($companyId, $doctorId),
            'billing_by_month' => $doctorId ? [] : $this->billingByMonth($companyId),
            'companies_overview' => $user->isSuperAdmin() && ! $companyId && ! $doctorId
                ? $this->companiesOverview()
                : [],
            'recent_appointments' => $this->recentAppointments($companyId, $doctorId),
        ]);
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

    private function appointmentQuery(?int $companyId, ?int $doctorId)
    {
        $query = Appointment::query();

        if ($doctorId) {
            $query->where('doctor_id', $doctorId);
        } elseif ($companyId) {
            $query->where('company_id', $companyId);
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

    private function billingQuery(?int $companyId)
    {
        $query = Billing::query();
        if ($companyId) {
            $query->where('company_id', $companyId);
        }

        return $query;
    }

    private function summary(?int $companyId, ?int $doctorId, bool $allCompanies): array
    {
        $today = Carbon::today();

        $summary = [
            'patients' => $this->patientQuery($companyId, $doctorId)->count(),
            'doctors' => $doctorId ? 1 : $this->doctorQuery($companyId, $doctorId)->count(),
            'departments' => $doctorId ? 0 : ($companyId
                ? Department::where('company_id', $companyId)->count()
                : Department::count()),
            'appointments_total' => $this->appointmentQuery($companyId, $doctorId)->count(),
            'appointments_today' => $this->appointmentQuery($companyId, $doctorId)
                ->whereDate('appointment_date', $today)
                ->count(),
            'billing_collected' => 0,
            'billing_pending' => 0,
            'companies' => $allCompanies ? Company::where('is_active', true)->count() : null,
        ];

        if (! $doctorId) {
            $billing = $this->billingQuery($companyId);
            $summary['billing_collected'] = (float) $billing->clone()->sum('paid_amount');
            $summary['billing_pending'] = (float) $billing->clone()->sum('due_amount');
        }

        return $summary;
    }

    private function appointmentsByStatus(?int $companyId, ?int $doctorId): array
    {
        $rows = $this->appointmentQuery($companyId, $doctorId)
            ->select('status', DB::raw('count(*) as count'))
            ->groupBy('status')
            ->orderBy('status')
            ->get();

        return $rows->map(fn ($row) => [
            'status' => $row->status,
            'count' => (int) $row->count,
        ])->values()->all();
    }

    private function appointmentsByMonth(?int $companyId, ?int $doctorId): array
    {
        $start = Carbon::now()->subMonths(5)->startOfMonth();
        $driver = DB::connection()->getDriverName();

        $monthExpr = $driver === 'pgsql'
            ? "to_char(appointment_date, 'YYYY-MM')"
            : "DATE_FORMAT(appointment_date, '%Y-%m')";

        $rows = $this->appointmentQuery($companyId, $doctorId)
            ->where('appointment_date', '>=', $start)
            ->selectRaw("{$monthExpr} as month, count(*) as count")
            ->groupBy('month')
            ->orderBy('month')
            ->get()
            ->keyBy('month');

        $result = [];
        for ($i = 0; $i < 6; $i++) {
            $month = $start->copy()->addMonths($i);
            $key = $month->format('Y-m');
            $result[] = [
                'month' => $key,
                'label' => $month->format('M Y'),
                'count' => (int) ($rows[$key]->count ?? 0),
            ];
        }

        return $result;
    }

    private function billingByMonth(?int $companyId): array
    {
        $start = Carbon::now()->subMonths(5)->startOfMonth();
        $driver = DB::connection()->getDriverName();

        $monthExpr = $driver === 'pgsql'
            ? "to_char(billed_at, 'YYYY-MM')"
            : "DATE_FORMAT(billed_at, '%Y-%m')";

        $rows = $this->billingQuery($companyId)
            ->where('billed_at', '>=', $start)
            ->selectRaw("{$monthExpr} as month")
            ->selectRaw('sum(paid_amount) as collected')
            ->selectRaw('sum(due_amount) as pending')
            ->groupBy('month')
            ->orderBy('month')
            ->get()
            ->keyBy('month');

        $result = [];
        for ($i = 0; $i < 6; $i++) {
            $month = $start->copy()->addMonths($i);
            $key = $month->format('Y-m');
            $row = $rows[$key] ?? null;
            $result[] = [
                'month' => $key,
                'label' => $month->format('M Y'),
                'collected' => round((float) ($row->collected ?? 0), 2),
                'pending' => round((float) ($row->pending ?? 0), 2),
            ];
        }

        return $result;
    }

    private function companiesOverview(): array
    {
        return Company::query()
            ->where('is_active', true)
            ->orderBy('name')
            ->get()
            ->map(function (Company $company) {
                return [
                    'id' => $company->id,
                    'name' => $company->name,
                    'patients' => Patient::where('company_id', $company->id)->count(),
                    'doctors' => Doctor::where('company_id', $company->id)->count(),
                    'appointments' => Appointment::where('company_id', $company->id)->count(),
                ];
            })
            ->values()
            ->all();
    }

    private function recentAppointments(?int $companyId, ?int $doctorId): array
    {
        return $this->appointmentQuery($companyId, $doctorId)
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
