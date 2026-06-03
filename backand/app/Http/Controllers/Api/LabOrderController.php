<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Concerns\HandlesTenancy;
use App\Http\Controllers\Controller;
use App\Models\LabOrder;
use App\Services\LabOrderService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LabOrderController extends Controller
{
    use HandlesTenancy;

    public function __construct(private LabOrderService $service) {}

    public function index(Request $request): JsonResponse
    {
        $companyId = $this->optionalCompanyId($request);

        $orders = LabOrder::with(['patient', 'doctor.user', 'items.test', 'items.package', 'samples'])
            ->when($companyId, fn ($q) => $q->where('company_id', $companyId))
            ->when($request->filled('status'), fn ($q) => $q->where('status', $request->status))
            ->when($request->filled('patient_id'), fn ($q) => $q->where('patient_id', $request->patient_id))
            ->when($request->filled('date_from'), fn ($q) => $q->whereDate('ordered_at', '>=', $request->date_from))
            ->when($request->filled('date_to'), fn ($q) => $q->whereDate('ordered_at', '<=', $request->date_to))
            ->orderByDesc('ordered_at')
            ->paginate($request->input('per_page', 25));

        return response()->json($orders);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'company_id'                => ['sometimes', 'exists:companies,id'],
            'patient_id'                => ['required', 'exists:patients,id'],
            'doctor_id'                 => ['nullable', 'exists:doctors,id'],
            'collection_type'           => ['in:walk_in,home'],
            'home_address'              => ['nullable', 'string'],
            'collection_scheduled_at'   => ['nullable', 'date'],
            'discount'                  => ['nullable', 'numeric', 'min:0'],
            'notes'                     => ['nullable', 'string'],
            'items'                     => ['required', 'array', 'min:1'],
            'items.*.test_id'           => ['nullable', 'exists:lab_tests,id'],
            'items.*.package_id'        => ['nullable', 'exists:lab_test_packages,id'],
        ]);

        $data['company_id'] = $this->resolveCompanyId($request);
        $order = $this->service->createOrder($data, $data['items']);

        return response()->json($order, 201);
    }

    public function show(LabOrder $labOrder): JsonResponse
    {
        $this->assertTenantAccess($labOrder);

        return response()->json(
            $labOrder->load(['patient', 'doctor.user', 'items.test.category', 'items.package.tests', 'items.result', 'samples.collector'])
        );
    }

    /** Collect sample — moves order to 'collected' */
    public function collect(Request $request, LabOrder $labOrder): JsonResponse
    {
        $this->assertTenantAccess($labOrder);

        abort_if(! in_array($labOrder->status, ['pending']), 422, 'Order is not in pending state.');

        $data = $request->validate([
            'sample_type'       => ['required', 'in:blood,urine,stool,swab,sputum,other'],
            'collection_method' => ['in:walk_in,home'],
            'notes'             => ['nullable', 'string'],
        ]);

        $sample = $this->service->collectSample($labOrder, $data, auth()->id());

        return response()->json($sample);
    }

    /** Enter results — moves order to 'resulted' */
    public function results(Request $request, LabOrder $labOrder): JsonResponse
    {
        $this->assertTenantAccess($labOrder);

        abort_if(! in_array($labOrder->status, ['collected', 'processing']), 422, 'Sample not yet collected.');

        $data = $request->validate([
            'results'                    => ['required', 'array', 'min:1'],
            'results.*.order_item_id'    => ['required', 'exists:lab_order_items,id'],
            'results.*.test_id'          => ['nullable', 'exists:lab_tests,id'],
            'results.*.value'            => ['nullable', 'string'],
            'results.*.unit'             => ['nullable', 'string'],
            'results.*.ref_range'        => ['nullable', 'string'],
            'results.*.flag'             => ['nullable', 'in:normal,high,low,critical'],
            'results.*.notes'            => ['nullable', 'string'],
        ]);

        $this->service->enterResults($labOrder, $data['results'], auth()->id());

        return response()->json($labOrder->load('results.test'));
    }

    /** Verify — senior checks results, moves to 'verified' */
    public function verify(LabOrder $labOrder): JsonResponse
    {
        $this->assertTenantAccess($labOrder);
        abort_if($labOrder->status !== 'resulted', 422, 'Order results not entered yet.');
        $this->service->verifyOrder($labOrder, auth()->id());

        return response()->json(['status' => 'verified']);
    }

    /** Approve — final step, report ready */
    public function approve(LabOrder $labOrder): JsonResponse
    {
        $this->assertTenantAccess($labOrder);
        abort_if($labOrder->status !== 'verified', 422, 'Order not yet verified.');
        $this->service->approveOrder($labOrder);

        return response()->json(['status' => 'approved']);
    }

    /** Cancel */
    public function cancel(Request $request, LabOrder $labOrder): JsonResponse
    {
        $this->assertTenantAccess($labOrder);
        abort_if(in_array($labOrder->status, ['approved']), 422, 'Approved orders cannot be cancelled.');
        $labOrder->update(['status' => 'cancelled']);

        return response()->json(['status' => 'cancelled']);
    }
}
