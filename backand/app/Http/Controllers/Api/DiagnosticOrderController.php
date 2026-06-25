<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Concerns\HandlesTenancy;
use App\Http\Controllers\Controller;
use App\Models\DiagnosticOrder;
use App\Models\DiagnosticReport;
use App\Models\DiagnosticTestType;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class DiagnosticOrderController extends Controller
{
    use HandlesTenancy;

    public function index(Request $request): JsonResponse
    {
        $companyId = $this->optionalCompanyId($request);

        $orders = DiagnosticOrder::with(['patient', 'doctor.user', 'testType.category', 'technician', 'report', 'branch'])
            ->when($companyId, fn ($q) => $q->where('company_id', $companyId))
            ->when($request->filled('branch_id'), fn ($q) => $q->where('branch_id', (int) $request->branch_id))
            ->when($request->filled('status'), fn ($q) => $q->where('status', $request->status))
            ->when($request->filled('category_id'), fn ($q) => $q->whereHas(
                'testType',
                fn ($q2) => $q2->where('category_id', $request->category_id)
            ))
            ->when($request->filled('modality'), fn ($q) => $q->whereHas('testType', fn ($q2) => $q2->where('modality', $request->modality)))
            ->when($request->filled('patient_id'), fn ($q) => $q->where('patient_id', $request->patient_id))
            ->when($request->filled('date_from'), fn ($q) => $q->whereDate('created_at', '>=', $request->date_from))
            ->when($request->filled('date_to'), fn ($q) => $q->whereDate('created_at', '<=', $request->date_to))
            ->orderByDesc('created_at')
            ->paginate($request->input('per_page', 25));

        return response()->json($orders);
    }

    public function store(Request $request): JsonResponse
    {
        $this->prepareCompanyScope($request);

        $data = $request->validate([
            'company_id'        => $this->companyIdRules(),
            'branch_id'         => ['nullable', 'exists:branches,id'],
            'patient_id'        => ['required', 'exists:patients,id'],
            'doctor_id'         => ['nullable', 'exists:doctors,id'],
            'test_type_id'      => ['required', 'exists:diagnostic_test_types,id'],
            'priority'          => ['in:routine,urgent,emergency'],
            'clinical_notes'    => ['nullable', 'string'],
            'notes'             => ['nullable', 'string'],
        ]);

        $data['company_id'] = $this->resolveCompanyId($request);
        $data['order_number'] = $this->generateOrderNumber($data['company_id']);

        $testType = DiagnosticTestType::findOrFail($data['test_type_id']);
        $data['amount'] = $testType->price;
        $data['status'] = 'booked';

        $order = DiagnosticOrder::create($data);

        return response()->json($order->load(['patient', 'doctor.user', 'testType']), 201);
    }

    public function show(DiagnosticOrder $diagnosticOrder): JsonResponse
    {
        $this->assertTenantAccess($diagnosticOrder);

        return response()->json(
            $diagnosticOrder->load(['patient', 'doctor.user', 'testType.category', 'technician', 'report.reporter'])
        );
    }

    /** Schedule + assign technician */
    public function schedule(Request $request, DiagnosticOrder $diagnosticOrder): JsonResponse
    {
        $this->assertTenantAccess($diagnosticOrder);

        $data = $request->validate([
            'technician_id' => ['nullable', 'exists:users,id'],
            'scheduled_at'  => ['required', 'date'],
        ]);

        $diagnosticOrder->update(array_merge($data, ['status' => 'scheduled']));

        return response()->json($diagnosticOrder->load('technician'));
    }

    /** Start processing */
    public function start(DiagnosticOrder $diagnosticOrder): JsonResponse
    {
        $this->assertTenantAccess($diagnosticOrder);
        abort_if(! in_array($diagnosticOrder->status, ['booked', 'scheduled']), 422, 'Invalid status transition.');
        $diagnosticOrder->update(['status' => 'in_progress']);

        return response()->json(['status' => 'in_progress']);
    }

    /** Upload report + complete order */
    public function uploadReport(Request $request, DiagnosticOrder $diagnosticOrder): JsonResponse
    {
        $this->assertTenantAccess($diagnosticOrder);

        $data = $request->validate([
            'findings'          => ['nullable', 'string'],
            'impression'        => ['nullable', 'string'],
            'recommendations'   => ['nullable', 'string'],
        ]);

        $data['order_id'] = $diagnosticOrder->id;
        $data['company_id'] = $diagnosticOrder->company_id;
        $data['reported_by'] = auth()->id();

        $report = DiagnosticReport::updateOrCreate(
            ['order_id' => $diagnosticOrder->id],
            $data
        );

        $diagnosticOrder->update(['status' => 'completed']);

        return response()->json($report);
    }

    /** Approve report */
    public function approveReport(DiagnosticOrder $diagnosticOrder): JsonResponse
    {
        $this->assertTenantAccess($diagnosticOrder);

        $diagnosticOrder->report()->update([
            'approved_by' => auth()->id(),
            'approved_at' => now(),
        ]);

        return response()->json(['approved' => true]);
    }

    /** Cancel */
    public function cancel(DiagnosticOrder $diagnosticOrder): JsonResponse
    {
        $this->assertTenantAccess($diagnosticOrder);
        abort_if($diagnosticOrder->status === 'completed', 422, 'Completed orders cannot be cancelled.');
        $diagnosticOrder->update(['status' => 'cancelled']);

        return response()->json(['status' => 'cancelled']);
    }

    private function generateOrderNumber(int $companyId): string
    {
        $date = now()->format('Ymd');
        $prefix = "DGN-{$date}-";

        $last = DiagnosticOrder::withoutGlobalScopes()
            ->where('order_number', 'like', $prefix.'%')
            ->where('company_id', $companyId)
            ->orderByDesc('id')
            ->value('order_number');

        $seq = $last ? ((int) substr($last, -4) + 1) : 1;

        return $prefix.str_pad($seq, 4, '0', STR_PAD_LEFT);
    }
}
