<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Concerns\HandlesTenancy;
use App\Http\Controllers\Controller;
use App\Models\Appointment;
use App\Models\Billing;
use App\Models\DiagnosticOrder;
use App\Models\DiagnosticOrderPayment;
use App\Models\Patient;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TodayCentreController extends Controller
{
    use HandlesTenancy;

    public function show(Request $request): JsonResponse
    {
        $user = auth()->user();

        if (
            ! $user->isSuperAdmin()
            && ! $user->isCompanyAdmin()
            && ! $user->can('dashboard.view')
            && ! $user->can('diagnostic.view')
        ) {
            abort(403, 'You are not allowed to view Today\'s Centre.');
        }

        $companyId = $this->optionalCompanyId($request);
        $branchId = $request->filled('branch_id') ? (int) $request->input('branch_id') : null;
        $doctorId = $this->doctorIdForUser();
        $today = now(config('app.timezone'))->startOfDay();
        $end = $today->copy()->endOfDay();

        $canDiagnostics = $user->can('diagnostic.view') || $user->isSuperAdmin() || $user->isCompanyAdmin();
        $canAppointments = $user->can('appointment.view') || $user->isSuperAdmin() || $user->isCompanyAdmin();
        $canPatients = $user->can('patient.view') || $user->isSuperAdmin() || $user->isCompanyAdmin();
        $canBilling = $user->can('billing.view') || $user->isSuperAdmin() || $user->isCompanyAdmin();

        $summary = [
            'appointments_today' => 0,
            'walk_ins' => 0,
            'patients_today' => 0,
            'pending_reports' => 0,
            'collection_today' => 0,
            'pending_payments' => 0,
        ];

        $queue = [];
        $appointments = [];
        $reports = [];
        $payments = [
            'collected_today' => 0,
            'pending_due_total' => 0,
            'pending_orders' => [],
        ];
        $alerts = [];

        if ($canDiagnostics) {
            $diagBase = DiagnosticOrder::query()
                ->when($companyId, fn ($q) => $q->where('company_id', $companyId))
                ->when($branchId, fn ($q) => $q->where('branch_id', $branchId))
                ->when($doctorId, fn ($q) => $q->where('doctor_id', $doctorId))
                ->where('status', '!=', 'cancelled');

            $todayDiag = (clone $diagBase)->where(function ($q) use ($today, $end) {
                $q->whereBetween('scheduled_at', [$today, $end])
                    ->orWhere(function ($q2) use ($today, $end) {
                        $q2->whereBetween('created_at', [$today, $end])
                            ->whereIn('status', ['booked', 'scheduled', 'in_progress', 'completed', 'not_present']);
                    });
            });

            $summary['appointments_today'] = (clone $todayDiag)->count();

            $summary['walk_ins'] = (clone $diagBase)
                ->whereBetween('created_at', [$today, $end])
                ->where(function ($q) {
                    $q->whereNull('scheduled_at')
                        ->orWhereRaw('DATE(scheduled_at) = DATE(created_at)');
                })
                ->whereIn('status', ['booked', 'scheduled', 'in_progress'])
                ->count();

            $summary['pending_reports'] = (clone $diagBase)
                ->where('status', 'completed')
                ->whereHas('report', fn ($q) => $q->whereNull('approved_at'))
                ->count();

            $waiting = (clone $todayDiag)->whereIn('status', ['booked', 'scheduled'])->count();
            $inProgress = (clone $todayDiag)->where('status', 'in_progress')->count();

            $queue = (clone $todayDiag)
                ->with([
                    'patient:id,name,patient_code,phone',
                    'testType:id,name,code,modality',
                    'branch:id,name',
                    'report:id,order_id,approved_at',
                ])
                ->orderByRaw('queue_serial is null')
                ->orderBy('queue_serial')
                ->orderBy('scheduled_at')
                ->orderBy('created_at')
                ->limit(25)
                ->get()
                ->map(fn (DiagnosticOrder $o) => $this->mapOrderRow($o))
                ->values()
                ->all();

            $reports = (clone $diagBase)
                ->where('status', 'completed')
                ->whereHas('report', fn ($q) => $q->whereNull('approved_at'))
                ->with([
                    'patient:id,name,patient_code,phone',
                    'testType:id,name,code,modality',
                    'report:id,order_id,approved_at,updated_at',
                ])
                ->orderByDesc('updated_at')
                ->limit(15)
                ->get()
                ->map(fn (DiagnosticOrder $o) => [
                    'id' => $o->id,
                    'order_number' => $o->order_number,
                    'patient' => $o->patient?->name,
                    'patient_code' => $o->patient?->patient_code,
                    'service' => $o->testType?->name,
                    'status' => 'pending_approval',
                    'updated_at' => optional($o->report?->updated_at ?? $o->updated_at)->toIso8601String(),
                ])
                ->values()
                ->all();

            $paymentsQuery = DiagnosticOrderPayment::query()
                ->whereBetween('paid_at', [$today, $end])
                ->whereHas('order', function ($q) use ($companyId, $branchId, $doctorId) {
                    $q->when($companyId, fn ($q2) => $q2->where('company_id', $companyId))
                        ->when($branchId, fn ($q2) => $q2->where('branch_id', $branchId))
                        ->when($doctorId, fn ($q2) => $q2->where('doctor_id', $doctorId));
                });

            $diagCollected = (float) (clone $paymentsQuery)->sum('amount');

            $pendingDue = (float) (clone $diagBase)
                ->where('due_amount', '>', 0)
                ->whereIn('payment_status', ['pending', 'partial'])
                ->sum('due_amount');

            $pendingOrders = (clone $diagBase)
                ->where('due_amount', '>', 0)
                ->whereIn('payment_status', ['pending', 'partial'])
                ->with(['patient:id,name,patient_code', 'testType:id,name'])
                ->orderByDesc('due_amount')
                ->limit(15)
                ->get()
                ->map(fn (DiagnosticOrder $o) => [
                    'id' => $o->id,
                    'order_number' => $o->order_number,
                    'patient' => $o->patient?->name,
                    'service' => $o->testType?->name,
                    'due_amount' => (float) $o->due_amount,
                    'payment_status' => $o->payment_status,
                ])
                ->values()
                ->all();

            $payments['collected_today'] = round($diagCollected, 2);
            $payments['pending_due_total'] = round($pendingDue, 2);
            $payments['pending_orders'] = $pendingOrders;
            $summary['collection_today'] = round($diagCollected, 2);
            $summary['pending_payments'] = count($pendingOrders) > 0
                ? (clone $diagBase)->where('due_amount', '>', 0)->whereIn('payment_status', ['pending', 'partial'])->count()
                : 0;

            if ($summary['pending_reports'] > 0) {
                $alerts[] = [
                    'type' => 'reports',
                    'level' => 'warning',
                    'message' => $summary['pending_reports'].' report(s) awaiting approval',
                    'href' => '/diagnostics/orders?tab=completed',
                ];
            }
            if ($waiting > 0) {
                $alerts[] = [
                    'type' => 'waiting',
                    'level' => 'info',
                    'message' => $waiting.' patient(s) waiting in queue',
                    'href' => '/diagnostics/orders',
                ];
            }
            if ($inProgress > 0) {
                $alerts[] = [
                    'type' => 'in_progress',
                    'level' => 'info',
                    'message' => $inProgress.' visit(s) in progress',
                    'href' => '/diagnostics/orders',
                ];
            }
            if ($summary['pending_payments'] > 0) {
                $alerts[] = [
                    'type' => 'payments',
                    'level' => 'warning',
                    'message' => $summary['pending_payments'].' order(s) with pending payment',
                    'href' => '/diagnostics/orders',
                ];
            }
        }

        if ($canAppointments) {
            $apptQuery = Appointment::query()
                ->when($companyId, fn ($q) => $q->where('company_id', $companyId))
                ->when($branchId, fn ($q) => $q->where('branch_id', $branchId))
                ->when($doctorId, fn ($q) => $q->where('doctor_id', $doctorId))
                ->whereDate('appointment_date', $today->toDateString())
                ->where('status', '!=', 'cancelled');

            // Prefer clinic appointments count when available; otherwise keep diagnostic today count.
            $clinicToday = (clone $apptQuery)->count();
            if ($clinicToday > 0 || ! $canDiagnostics) {
                $summary['appointments_today'] = $clinicToday;
            }

            $appointments = (clone $apptQuery)
                ->with(['patient:id,name,patient_code', 'doctor.user:id,name'])
                ->orderBy('appointment_date')
                ->limit(20)
                ->get()
                ->map(fn (Appointment $a) => [
                    'id' => $a->id,
                    'patient' => $a->patient?->name,
                    'patient_code' => $a->patient?->patient_code,
                    'time' => optional($a->appointment_date)->format('h:i A'),
                    'doctor' => $a->doctor?->user?->name,
                    'status' => $a->status,
                    'scheduled_at' => optional($a->appointment_date)->toIso8601String(),
                ])
                ->values()
                ->all();
        }

        if ($canPatients) {
            $summary['patients_today'] = Patient::query()
                ->when($companyId, fn ($q) => $q->where('company_id', $companyId))
                ->whereBetween('created_at', [$today, $end])
                ->count();
        }

        if ($canBilling) {
            $billingToday = (float) Billing::query()
                ->when($companyId, fn ($q) => $q->where('company_id', $companyId))
                ->when($branchId, function ($q) use ($branchId) {
                    $q->whereHas('appointment', fn ($a) => $a->where('branch_id', $branchId));
                })
                ->whereDate('paid_at', $today->toDateString())
                ->sum('paid_amount');

            $summary['collection_today'] = round(((float) $summary['collection_today']) + $billingToday, 2);
            $payments['collected_today'] = round(((float) $payments['collected_today']) + $billingToday, 2);
            $payments['billing_collected_today'] = round($billingToday, 2);
        }

        return response()->json([
            'date' => $today->toDateString(),
            'timezone' => config('app.timezone'),
            'generated_at' => now()->toIso8601String(),
            'filters' => [
                'company_id' => $companyId,
                'branch_id' => $branchId,
            ],
            'access' => [
                'diagnostics' => $canDiagnostics,
                'appointments' => $canAppointments,
                'patients' => $canPatients,
                'billing' => $canBilling,
            ],
            'summary' => $summary,
            'queue' => $queue,
            'appointments' => $appointments,
            'reports' => $reports,
            'payments' => $payments,
            'alerts' => $alerts,
        ]);
    }

    /** @return array<string, mixed> */
    private function mapOrderRow(DiagnosticOrder $o): array
    {
        return [
            'id' => $o->id,
            'token' => $o->queue_serial,
            'order_number' => $o->order_number,
            'patient' => $o->patient?->name,
            'patient_code' => $o->patient?->patient_code,
            'patient_id' => $o->patient_id,
            'service' => $o->testType?->name,
            'modality' => $o->testType?->modality,
            'time' => optional($o->scheduled_at ?? $o->created_at)->format('h:i A'),
            'scheduled_at' => optional($o->scheduled_at)->toIso8601String(),
            'status' => $o->status,
            'payment_status' => $o->payment_status,
            'branch' => $o->branch?->name,
            'has_report' => (bool) $o->report,
            'report_approved' => (bool) $o->report?->approved_at,
        ];
    }
}
