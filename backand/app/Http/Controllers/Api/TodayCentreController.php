<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Concerns\HandlesTenancy;
use App\Http\Controllers\Controller;
use App\Models\Appointment;
use App\Models\Billing;
use App\Models\DiagnosticOrder;
use App\Models\DiagnosticOrderPayment;
use App\Models\Patient;
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

        $companyModules = collect($user->company?->modules ?? [])->map(fn ($m) => (string) $m)->all();
        if ($user->isSuperAdmin() && $companyId) {
            $scopedCompany = \App\Models\Company::query()->find($companyId);
            $companyModules = collect($scopedCompany?->modules ?? [])->map(fn ($m) => (string) $m)->all();
        }
        $hasClinicModule = in_array('clinic', $companyModules, true);
        $hasDiagnosticsModule = in_array('diagnostics', $companyModules, true) || ($canDiagnostics && $companyModules === []);
        // Super admin with no company filter: treat as multi-module (show clinic panel when data exists).
        if ($user->isSuperAdmin() && ! $companyId) {
            $hasClinicModule = true;
            $hasDiagnosticsModule = true;
        }

        $summary = [
            'appointments_today' => 0,
            'walk_ins' => 0,
            'patients_today' => 0,
            'pending_reports' => 0,
            'collection_today' => 0,
            'pending_payments' => 0,
            'cancelled_today' => 0,
            'pending_queue' => 0,
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
            $diagScoped = DiagnosticOrder::query()
                ->when($companyId, fn ($q) => $q->where('company_id', $companyId))
                ->when($branchId, fn ($q) => $q->where('branch_id', $branchId))
                ->when($doctorId, fn ($q) => $q->where('doctor_id', $doctorId));

            $diagActive = (clone $diagScoped)->where('status', '!=', 'cancelled');

            $todayDiag = (clone $diagActive)->where(function ($q) use ($today, $end) {
                $q->whereBetween('scheduled_at', [$today, $end])
                    ->orWhere(function ($q2) use ($today, $end) {
                        $q2->whereBetween('created_at', [$today, $end])
                            ->whereIn('status', ['booked', 'scheduled', 'in_progress', 'completed', 'not_present']);
                    });
            });

            $summary['appointments_today'] = (clone $todayDiag)->count();

            $summary['cancelled_today'] = (clone $diagScoped)
                ->where('status', 'cancelled')
                ->where(function ($q) use ($today, $end) {
                    $q->whereBetween('scheduled_at', [$today, $end])
                        ->orWhereBetween('updated_at', [$today, $end])
                        ->orWhereBetween('created_at', [$today, $end]);
                })
                ->count();

            $summary['walk_ins'] = (clone $diagActive)
                ->whereBetween('created_at', [$today, $end])
                ->where(function ($q) {
                    $q->whereNull('scheduled_at')
                        ->orWhereRaw('DATE(scheduled_at) = DATE(created_at)');
                })
                ->whereIn('status', ['booked', 'scheduled', 'in_progress'])
                ->count();

            $summary['pending_reports'] = (clone $diagActive)
                ->where('status', 'completed')
                ->whereHas('report', fn ($q) => $q->whereNull('approved_at'))
                ->count();

            $waiting = (clone $todayDiag)->whereIn('status', ['booked', 'scheduled'])->count();
            $inProgress = (clone $todayDiag)->where('status', 'in_progress')->count();
            $summary['pending_queue'] = $waiting;

            $queue = (clone $todayDiag)
                ->with([
                    'patient:id,name,patient_code,phone',
                    'testType:id,name,code,modality',
                    'package:id,name',
                    'branch:id,name',
                    'report:id,order_id,approved_at',
                ])
                ->orderByRaw("CASE WHEN status IN ('booked','scheduled','in_progress') THEN 0 ELSE 1 END")
                ->orderByRaw('queue_serial is null')
                ->orderBy('queue_serial')
                ->orderBy('scheduled_at')
                ->orderBy('created_at')
                ->limit(25)
                ->get()
                ->map(fn (DiagnosticOrder $o) => $this->mapOrderRow($o))
                ->values()
                ->all();

            // For diagnostic centres, "Today's Appointments" = today's diagnostic bookings (with order #).
            if ($hasDiagnosticsModule && ! $hasClinicModule) {
                $appointments = array_values(array_filter(
                    $queue,
                    fn (array $row) => in_array($row['status'], ['booked', 'scheduled', 'in_progress'], true)
                ));
            }

            $reports = (clone $diagActive)
                ->where('status', 'completed')
                ->whereHas('report', fn ($q) => $q->whereNull('approved_at'))
                ->with([
                    'patient:id,name,patient_code,phone',
                    'testType:id,name,code,modality',
                    'package:id,name',
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
                    'service' => $o->testType?->name ?? $o->package?->name,
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

            $pendingDue = (float) (clone $diagActive)
                ->where('due_amount', '>', 0)
                ->whereIn('payment_status', ['pending', 'partial'])
                ->sum('due_amount');

            $pendingOrders = (clone $diagActive)
                ->where('due_amount', '>', 0)
                ->whereIn('payment_status', ['pending', 'partial'])
                ->with(['patient:id,name,patient_code', 'testType:id,name', 'package:id,name'])
                ->orderByDesc('due_amount')
                ->limit(15)
                ->get()
                ->map(fn (DiagnosticOrder $o) => [
                    'id' => $o->id,
                    'order_number' => $o->order_number,
                    'patient' => $o->patient?->name,
                    'service' => $o->testType?->name ?? $o->package?->name,
                    'due_amount' => (float) $o->due_amount,
                    'payment_status' => $o->payment_status,
                ])
                ->values()
                ->all();

            $payments['collected_today'] = round($diagCollected, 2);
            $payments['pending_due_total'] = round($pendingDue, 2);
            $payments['pending_orders'] = $pendingOrders;
            $summary['collection_today'] = round($diagCollected, 2);
            $summary['pending_payments'] = (clone $diagActive)
                ->where('due_amount', '>', 0)
                ->whereIn('payment_status', ['pending', 'partial'])
                ->count();

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
                    'message' => $waiting.' order(s) pending in today\'s queue',
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
            if ($summary['cancelled_today'] > 0) {
                $alerts[] = [
                    'type' => 'cancelled',
                    'level' => 'info',
                    'message' => $summary['cancelled_today'].' cancelled today',
                    'href' => '/diagnostics/orders',
                ];
            }
        }

        if ($canAppointments && $hasClinicModule) {
            $apptBase = Appointment::query()
                ->when($companyId, fn ($q) => $q->where('company_id', $companyId))
                ->when($branchId, fn ($q) => $q->where('branch_id', $branchId))
                ->when($doctorId, fn ($q) => $q->where('doctor_id', $doctorId))
                ->whereDate('appointment_date', $today->toDateString());

            $apptQuery = (clone $apptBase)->where('status', '!=', 'cancelled');

            $clinicToday = (clone $apptQuery)->count();
            if ($clinicToday > 0 || ! $canDiagnostics) {
                $summary['appointments_today'] = $clinicToday;
            }

            $summary['cancelled_today'] += (clone $apptBase)->where('status', 'cancelled')->count();

            $appointments = (clone $apptQuery)
                ->with(['patient:id,name,patient_code', 'doctor.user:id,name'])
                ->orderBy('appointment_date')
                ->limit(20)
                ->get()
                ->map(fn (Appointment $a) => [
                    'id' => $a->id,
                    'type' => 'clinic',
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
                'appointments' => $canAppointments && ($hasClinicModule || ($canDiagnostics && ! $hasClinicModule)),
                'clinic_appointments' => $canAppointments && $hasClinicModule,
                'diagnostic_appointments' => $canDiagnostics && ! $hasClinicModule,
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
            'type' => 'diagnostic',
            'token' => $o->queue_serial,
            'order_number' => $o->order_number,
            'patient' => $o->patient?->name,
            'patient_code' => $o->patient?->patient_code,
            'patient_id' => $o->patient_id,
            'service' => $o->testType?->name ?? $o->package?->name,
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
