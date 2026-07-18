<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Concerns\HandlesTenancy;
use App\Http\Controllers\Controller;
use App\Models\Appointment;
use App\Models\AuditLog;
use App\Models\Billing;
use App\Models\DiagnosticOrder;
use App\Models\LabOrder;
use App\Models\Patient;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

class AuditLogController extends Controller
{
    use HandlesTenancy;

    public function index(Request $request): JsonResponse
    {
        $companyId = $this->resolveAuditCompanyId($request);

        $logs = AuditLog::query()
            ->with(['user:id,name,email', 'branch:id,name'])
            ->when($companyId, fn ($q) => $q->where('company_id', $companyId))
            ->when($request->filled('branch_id'), fn ($q) => $q->where('branch_id', (int) $request->branch_id))
            ->when($request->filled('user_id'), fn ($q) => $q->where('user_id', (int) $request->user_id))
            ->when($request->filled('module'), fn ($q) => $q->where('module', $request->module))
            ->when($request->filled('action'), fn ($q) => $q->where('action', $request->action))
            ->when($request->filled('auditable_type'), fn ($q) => $q->where('auditable_type', $request->auditable_type))
            ->when($request->filled('auditable_id'), fn ($q) => $q->where('auditable_id', (int) $request->auditable_id))
            ->when($request->filled('date_from'), fn ($q) => $q->whereDate('created_at', '>=', $request->date_from))
            ->when($request->filled('date_to'), fn ($q) => $q->whereDate('created_at', '<=', $request->date_to))
            ->when($request->filled('search'), function ($q) use ($request) {
                $term = '%'.$request->search.'%';
                $q->where(function ($q2) use ($term) {
                    $q2->where('user_name', 'like', $term)
                        ->orWhere('user_email', 'like', $term)
                        ->orWhere('auditable_label', 'like', $term)
                        ->orWhere('action', 'like', $term)
                        ->orWhere('module', 'like', $term);
                });
            })
            ->orderByDesc('created_at')
            ->paginate($request->input('per_page', 25));

        return response()->json($logs);
    }

    public function show(AuditLog $auditLog): JsonResponse
    {
        $this->assertTenantAccess($auditLog);

        return response()->json($auditLog->load(['user:id,name,email', 'branch:id,name']));
    }

    public function modules(): JsonResponse
    {
        $modules = AuditLog::query()
            ->when($this->optionalCompanyId(request()), fn ($q, $id) => $q->where('company_id', $id))
            ->distinct()
            ->orderBy('module')
            ->pluck('module');

        $actions = AuditLog::query()
            ->when($this->optionalCompanyId(request()), fn ($q, $id) => $q->where('company_id', $id))
            ->distinct()
            ->orderBy('action')
            ->pluck('action');

        return response()->json([
            'modules' => $modules,
            'actions' => $actions,
        ]);
    }

    /** Related activity for a patient, lab order, diagnostic order, or billing record. */
    public function related(Request $request): JsonResponse
    {
        $request->validate([
            'patient_id' => ['nullable', 'integer', 'exists:patients,id'],
            'lab_order_id' => ['nullable', 'integer', 'exists:lab_orders,id'],
            'diagnostic_order_id' => ['nullable', 'integer', 'exists:diagnostic_orders,id'],
            'billing_id' => ['nullable', 'integer', 'exists:billings,id'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $companyId = $this->resolveAuditCompanyId($request);
        $perPage = (int) ($request->input('per_page', 50));

        $pairs = [];

        if ($request->filled('patient_id')) {
            $patient = Patient::findOrFail((int) $request->patient_id);
            $this->assertTenantAccess($patient);
            $pairs[] = ['patient', $patient->id];
            Appointment::where('patient_id', $patient->id)->pluck('id')
                ->each(fn ($id) => $pairs[] = ['appointment', $id]);
            LabOrder::where('patient_id', $patient->id)->pluck('id')
                ->each(fn ($id) => $pairs[] = ['lab_order', $id]);
            DiagnosticOrder::where('patient_id', $patient->id)->pluck('id')
                ->each(fn ($id) => $pairs[] = ['diagnostic_order', $id]);
            Billing::where('patient_id', $patient->id)->pluck('id')
                ->each(fn ($id) => $pairs[] = ['billing', $id]);
        }

        if ($request->filled('lab_order_id')) {
            $order = LabOrder::findOrFail((int) $request->lab_order_id);
            $this->assertTenantAccess($order);
            $pairs[] = ['lab_order', $order->id];
        }

        if ($request->filled('diagnostic_order_id')) {
            $order = DiagnosticOrder::findOrFail((int) $request->diagnostic_order_id);
            $this->assertTenantAccess($order);
            $pairs[] = ['diagnostic_order', $order->id];
        }

        if ($request->filled('billing_id')) {
            $billing = Billing::findOrFail((int) $request->billing_id);
            $this->assertTenantAccess($billing);
            $pairs[] = ['billing', $billing->id];
        }

        if ($pairs === []) {
            return response()->json(['message' => 'Provide patient_id, lab_order_id, diagnostic_order_id, or billing_id.'], 422);
        }

        $logs = AuditLog::query()
            ->with(['user:id,name,email', 'branch:id,name'])
            ->when($companyId, fn ($q) => $q->where('company_id', $companyId))
            ->where(function ($q) use ($pairs) {
                foreach ($pairs as [$type, $id]) {
                    $q->orWhere(function ($q2) use ($type, $id) {
                        $q2->where('auditable_type', $type)->where('auditable_id', $id);
                    });
                }
            })
            ->orderByDesc('created_at')
            ->paginate($perPage);

        return response()->json($logs);
    }

    public function export(Request $request): StreamedResponse
    {
        $companyId = $this->resolveAuditCompanyId($request);

        $filename = 'audit-trail-'.now()->format('Y-m-d-His').'.csv';

        return response()->streamDownload(function () use ($request, $companyId) {
            $handle = fopen('php://output', 'w');
            fprintf($handle, chr(0xEF).chr(0xBB).chr(0xBF));

            fputcsv($handle, [
                'Date', 'User', 'Email', 'Action', 'Module', 'Record', 'Record ID',
                'Branch', 'IP', 'Device', 'Browser', 'Old Values', 'New Values',
            ]);

            $query = AuditLog::query()
                ->when($companyId, fn ($q) => $q->where('company_id', $companyId))
                ->when($request->filled('branch_id'), fn ($q) => $q->where('branch_id', (int) $request->branch_id))
                ->when($request->filled('user_id'), fn ($q) => $q->where('user_id', (int) $request->user_id))
                ->when($request->filled('module'), fn ($q) => $q->where('module', $request->module))
                ->when($request->filled('action'), fn ($q) => $q->where('action', $request->action))
                ->when($request->filled('auditable_type'), fn ($q) => $q->where('auditable_type', $request->auditable_type))
                ->when($request->filled('auditable_id'), fn ($q) => $q->where('auditable_id', (int) $request->auditable_id))
                ->when($request->filled('date_from'), fn ($q) => $q->whereDate('created_at', '>=', $request->date_from))
                ->when($request->filled('date_to'), fn ($q) => $q->whereDate('created_at', '<=', $request->date_to))
                ->when($request->filled('search'), function ($q) use ($request) {
                    $term = '%'.$request->search.'%';
                    $q->where(function ($q2) use ($term) {
                        $q2->where('user_name', 'like', $term)
                            ->orWhere('auditable_label', 'like', $term);
                    });
                })
                ->orderByDesc('created_at');

            $query->chunk(500, function ($rows) use ($handle) {
                foreach ($rows as $row) {
                    fputcsv($handle, [
                        $row->created_at?->toDateTimeString(),
                        $row->user_name,
                        $row->user_email,
                        $row->action,
                        $row->module,
                        $row->auditable_label,
                        $row->auditable_id,
                        $row->branch_id,
                        $row->ip_address,
                        $row->device,
                        $row->browser,
                        $row->old_values ? json_encode($row->old_values) : '',
                        $row->new_values ? json_encode($row->new_values) : '',
                    ]);
                }
            });

            fclose($handle);
        }, $filename, [
            'Content-Type' => 'text/csv; charset=UTF-8',
        ]);
    }

    /** Users list for audit filter dropdown (same company). */
    public function actors(Request $request): JsonResponse
    {
        $companyId = $this->resolveAuditCompanyId($request);

        $users = User::query()
            ->when($companyId, fn ($q) => $q->where('company_id', $companyId))
            ->where('role', '!=', User::ROLE_SUPER_ADMIN)
            ->orderBy('name')
            ->get(['id', 'name', 'email', 'role']);

        return response()->json($users);
    }

    private function resolveAuditCompanyId(Request $request): ?int
    {
        $user = $request->user();

        if ($user?->isSuperAdmin()) {
            return $this->optionalCompanyId($request);
        }

        return $user?->company_id;
    }
}
