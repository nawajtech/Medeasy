<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Concerns\HandlesTenancy;
use App\Http\Controllers\Controller;
use App\Models\DiagnosticOrder;
use App\Models\DiagnosticOrderPayment;
use App\Models\DiagnosticOrderRefund;
use App\Models\DiagnosticPackage;
use App\Models\DiagnosticReport;
use App\Models\DiagnosticTestType;
use App\Models\ReferralPartner;
use App\Services\ClinicBrandingService;
use App\Services\DiagnosticOrderBillingService;
use App\Services\DiagnosticPaymentService;
use App\Services\PatientWalletService;
use App\Support\AmountInWords;
use App\Support\PrescriptionFormatter;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\View\View;

class DiagnosticOrderController extends Controller
{
    use HandlesTenancy;

    public function index(Request $request): JsonResponse
    {
        $companyId = $this->optionalCompanyId($request);

        $orders = DiagnosticOrder::with(['patient', 'doctor.user', 'testType.category', 'technician', 'report', 'branch', 'referralPartner', 'package'])
            ->when($companyId, fn ($q) => $q->where('company_id', $companyId))
            ->when($doctorId = $this->doctorIdForUser(), fn ($q) => $q->where('doctor_id', $doctorId))
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
            'doctor_id'         => [
                'nullable',
                Rule::exists('doctors', 'id')->where(fn ($q) => $q->where('company_id', $this->resolveCompanyId($request))),
            ],
            'test_type_id'      => ['required_without:package_id', 'nullable', 'exists:diagnostic_test_types,id'],
            'package_id'        => ['required_without:test_type_id', 'nullable', 'exists:diago_package,id'],
            'priority'          => ['in:routine,urgent,emergency'],
            'clinical_notes'              => ['nullable', 'string'],
            'notes'                       => ['nullable', 'string'],
            'referral_partner_id'         => ['nullable', 'exists:referral_partners,id'],
            'deduct_commission_from_bill' => ['boolean'],
            'paid_amount'                 => ['nullable', 'numeric', 'min:0'],
            'payment_method'              => ['nullable', 'string', 'max:40'],
            'payment_reference'           => ['nullable', 'string', 'max:80'],
            'payment_notes'               => ['nullable', 'string'],
        ]);

        if (! empty($data['package_id'])) {
            return $this->storePackageOrders($request, $data);
        }

        return $this->storeSingleOrder($request, $data);
    }

    private function storeSingleOrder(Request $request, array $data): JsonResponse
    {
        $data['company_id'] = $this->resolveCompanyId($request);
        $data['order_number'] = $this->generateOrderNumber($data['company_id']);

        $testType = DiagnosticTestType::with('doctors')->findOrFail($data['test_type_id']);
        $this->assertDoctorMappedToTest($data['doctor_id'] ?? null, $testType);

        $partner = $this->resolveReferralPartner($data);
        $deductCommission = (bool) ($data['deduct_commission_from_bill'] ?? false);
        $billing = app(DiagnosticOrderBillingService::class)->calculate(
            (float) $testType->price,
            (float) ($testType->referral_commission ?? 0),
            $partner,
            $deductCommission,
            (int) $data['company_id'],
        );

        $data = $this->mergeReferralSnapshot($data, $partner);
        $data = array_merge($data, $billing);
        $data['package_discount'] = 0;
        $data['status'] = 'booked';
        $data['doctor_commission_amount'] = round((float) ($testType->doctor_commission ?? 0), 2);

        $paidAmount = (float) ($data['paid_amount'] ?? 0);
        $paymentMethod = $data['payment_method'] ?? null;
        $paymentReference = $data['payment_reference'] ?? null;
        $paymentNotes = $data['payment_notes'] ?? null;
        unset($data['paid_amount'], $data['payment_method'], $data['payment_reference'], $data['payment_notes'], $data['package_id']);

        $order = DiagnosticOrder::create($data);

        app(DiagnosticPaymentService::class)->applyInitialPayment(
            $order,
            $paidAmount,
            $paymentMethod,
            $paymentReference,
            $paymentNotes
        );

        return response()->json($order->fresh()->load(['patient', 'doctor.user', 'testType', 'referralPartner', 'package', 'payments.recorder']), 201);
    }

    private function storePackageOrders(Request $request, array $data): JsonResponse
    {
        $companyId = $this->resolveCompanyId($request);
        $package = DiagnosticPackage::findOrFail($data['package_id']);
        $this->assertTenantAccess($package);

        abort_unless($package->is_active, 422, 'This diagnostic package is not active.');

        $tests = DiagnosticTestType::with('doctors')
            ->whereIn('id', array_values(array_filter($package->test_ids ?? [])))
            ->orderBy('name')
            ->get();
        abort_if($tests->isEmpty(), 422, 'Package has no tests configured.');

        $partner = $this->resolveReferralPartner($data);
        $deductCommission = (bool) ($data['deduct_commission_from_bill'] ?? false);
        $referralService = app(DiagnosticOrderBillingService::class);
        $paymentService = app(DiagnosticPaymentService::class);

        $paidAmount = (float) ($data['paid_amount'] ?? 0);
        $paymentMethod = $data['payment_method'] ?? null;
        $paymentReference = $data['payment_reference'] ?? null;
        $paymentNotes = $data['payment_notes'] ?? null;

        $base = $this->mergeReferralSnapshot($data, $partner);
        unset($base['paid_amount'], $base['payment_method'], $base['payment_reference'], $base['payment_notes'], $base['test_type_id']);

        $prepared = [];
        foreach ($tests as $testType) {
            $this->assertDoctorMappedToTest($base['doctor_id'] ?? null, $testType);

            $originalGross = (float) $testType->price;
            $packageDiscount = $package->discountForTestPrice($originalGross);
            $discountedGross = $package->discountedPriceForTest($originalGross);

            $billing = $referralService->calculate(
                $discountedGross,
                (float) ($testType->referral_commission ?? 0),
                $partner,
                $deductCommission,
                $companyId,
            );

            $prepared[] = array_merge($base, $billing, [
                'company_id' => $companyId,
                'test_type_id' => $testType->id,
                'package_id' => $package->id,
                'package_discount' => $packageDiscount,
                'gross_amount' => $originalGross,
                'doctor_commission_amount' => round((float) ($testType->doctor_commission ?? 0), 2),
                'status' => 'booked',
            ]);
        }

        $totalGrand = round(collect($prepared)->sum('grand_total'), 2);
        $remainingPaid = $paidAmount;
        $orders = [];

        foreach ($prepared as $index => $orderData) {
            $orderData['order_number'] = $this->generateOrderNumber($companyId);
            $order = DiagnosticOrder::create($orderData);

            $isLast = $index === count($prepared) - 1;
            $orderPaid = $isLast
                ? round($remainingPaid, 2)
                : ($totalGrand > 0
                    ? round($paidAmount * ($orderData['grand_total'] / $totalGrand), 2)
                    : 0);
            $remainingPaid = round($remainingPaid - $orderPaid, 2);

            $paymentService->applyInitialPayment(
                $order,
                max(0, $orderPaid),
                $orderPaid > 0 ? $paymentMethod : null,
                $orderPaid > 0 ? $paymentReference : null,
                $orderPaid > 0 ? $paymentNotes : null
            );

            $orders[] = $order->fresh()->load(['patient', 'doctor.user', 'testType.category', 'referralPartner', 'package', 'payments.recorder']);
        }

        return response()->json([
            'package' => $package->only(['id', 'package_name', 'offer_percentage']),
            'orders' => $orders,
            'total_grand' => $totalGrand,
            'total_net' => round(collect($prepared)->sum('net_amount'), 2),
            'total_package_discount' => round(collect($prepared)->sum('package_discount'), 2),
        ], 201);
    }

    private function resolveReferralPartner(array $data): ?ReferralPartner
    {
        if (empty($data['referral_partner_id'])) {
            return null;
        }

        $partner = ReferralPartner::findOrFail($data['referral_partner_id']);
        $this->assertTenantAccess($partner);

        return $partner;
    }

  private function mergeReferralSnapshot(array $data, ?ReferralPartner $partner): array
    {
        if ($partner) {
            $data['referral_partner_name'] = $partner->name;
            $data['referral_partner_mobile'] = $partner->mobile;
            $data['referral_partner_address'] = $partner->address;
            $data['referral_partner_type'] = $partner->type;
        } else {
            unset($data['referral_partner_id']);
            $data['deduct_commission_from_bill'] = false;
        }

        return $data;
    }

    public function show(DiagnosticOrder $diagnosticOrder): JsonResponse
    {
        $this->assertTenantAccess($diagnosticOrder);

        return response()->json(
            $diagnosticOrder->load(['patient.wallet', 'doctor.user', 'testType.category', 'technician', 'report.reporter', 'referralPartner', 'branch', 'package', 'payments.recorder', 'refunds.recorder'])
        );
    }

    public function invoice(DiagnosticOrder $diagnosticOrder): View
    {
        $this->assertTenantAccess($diagnosticOrder);

        $order = $diagnosticOrder->load([
            'patient',
            'testType.category',
            'referralPartner',
            'branch',
            'company',
            'package',
        ]);

        $brandingService = app(ClinicBrandingService::class);
        $branding = $brandingService->forCompany((int) $order->company_id);
        $currencySymbol = $brandingService->currencySymbol($branding['currency']);

        $gross = (float) ($order->gross_amount ?: $order->amount ?: 0);
        $packageAdjusted = (float) ($order->package_discount ?: 0);
        $adjusted = (float) ($order->referral_discount ?: 0);
        $payable = (float) ($order->grand_total ?: $order->net_amount ?: $order->amount ?: 0);
        $taxable = (float) ($order->taxable_amount ?: $order->net_amount ?: $payable);
        $paid = (float) ($order->paid_amount ?? 0);
        $due = (float) ($order->due_amount ?? max(0, $payable - $paid));

        $patient = $order->patient;
        $patientAge = '—';
        if ($patient?->date_of_birth) {
            $diff = $patient->date_of_birth->diff(now());
            $patientAge = sprintf('%d Yr %d Mnt %d Dy', $diff->y, $diff->m, $diff->d);
        }

        $serviceName = trim(($order->testType?->category?->name ? $order->testType->category->name.' — ' : '').($order->testType?->name ?? 'Diagnostic Test'));

        $referredBy = $order->referral_partner_name;
        if ($referredBy && $order->referral_partner_type) {
            $referredBy = ucfirst($order->referral_partner_type).' '.$referredBy;
        }

        $deliveryDate = $order->scheduled_at
            ? $order->scheduled_at->format('d/m/Y')
            : ($order->created_at?->addDays(3)->format('d/m/Y') ?? '—');

        $amountInWords = strtoupper($branding['currency']) === 'INR'
            ? AmountInWords::rupees($payable)
            : strtoupper(number_format($payable, 2).' '.$branding['currency'].' ONLY');

        return view('documents.diagnostic-invoice', [
            'order' => $order,
            'patient' => $patient,
            'branding' => $branding,
            'currencySymbol' => $currencySymbol,
            'gross' => $gross,
            'packageAdjusted' => $packageAdjusted,
            'packageName' => $order->package?->package_name,
            'adjusted' => $adjusted,
            'payable' => $payable,
            'taxable' => $taxable,
            'tax' => [
                'enabled' => (bool) $order->tax_enabled,
                'mode' => $order->tax_mode,
                'rate' => (float) $order->tax_rate,
                'cgst_rate' => (float) $order->cgst_rate,
                'sgst_rate' => (float) $order->sgst_rate,
                'igst_rate' => (float) $order->igst_rate,
                'cgst_amount' => (float) $order->cgst_amount,
                'sgst_amount' => (float) $order->sgst_amount,
                'igst_amount' => (float) $order->igst_amount,
                'tax_amount' => (float) $order->tax_amount,
            ],
            'paid' => $paid,
            'due' => $due,
            'paymentStatus' => $order->payment_status,
            'patientAge' => $patientAge,
            'patientGender' => $patient?->gender ? ucfirst($patient->gender) : '—',
            'serviceName' => $serviceName,
            'referredBy' => $referredBy,
            'deliveryDate' => $deliveryDate,
            'amountInWords' => $amountInWords,
            'billDate' => $order->created_at ?? now(),
            'printedAt' => now(),
            'postedBy' => auth()->user()?->name ?? 'System',
        ]);
    }

    /** Schedule + assign technician */
    public function schedule(Request $request, DiagnosticOrder $diagnosticOrder): JsonResponse
    {
        $this->assertTenantAccess($diagnosticOrder);

        $data = $request->validate([
            'technician_id' => ['nullable', 'exists:users,id'],
            'scheduled_at'  => ['required', 'date'],
        ]);

        $data['scheduled_at'] = \Carbon\Carbon::parse($data['scheduled_at'], config('app.timezone'));

        $diagnosticOrder->update(array_merge($data, ['status' => 'scheduled']));
        $this->assignQueueSerial($diagnosticOrder->fresh());

        return response()->json($diagnosticOrder->fresh()->load(['technician', 'patient', 'testType.category']));
    }

    /** Doctor's today queue — serial order for diagnostic appointments (today only). */
    public function todayQueue(Request $request): JsonResponse
    {
        $doctorId = $this->doctorIdForUser();
        abort_unless($doctorId, 403, 'Only doctors can view today\'s appointment queue.');

        $start = now()->startOfDay();
        $end = now()->endOfDay();

        $orders = DiagnosticOrder::with(['patient', 'testType.category', 'branch', 'report'])
            ->where('doctor_id', $doctorId)
            ->whereNotIn('status', ['cancelled'])
            ->where(function ($q) use ($start, $end) {
                $q->whereBetween('scheduled_at', [$start, $end])
                    ->orWhere(function ($q2) use ($start, $end) {
                        $q2->whereBetween('created_at', [$start, $end])
                            ->whereIn('status', ['booked', 'scheduled', 'in_progress', 'completed', 'not_present']);
                    });
            })
            ->orderByRaw('queue_serial IS NULL, queue_serial ASC')
            ->orderBy('scheduled_at')
            ->orderBy('created_at')
            ->get();

        foreach ($orders as $order) {
            if (! $order->queue_serial && $order->scheduled_at) {
                $this->assignQueueSerial($order);
            }
        }

        $orderIds = $orders->pluck('id');
        $orders = DiagnosticOrder::with(['patient', 'testType.category', 'branch', 'report'])
            ->whereIn('id', $orderIds)
            ->orderByRaw('queue_serial IS NULL, queue_serial ASC')
            ->orderBy('scheduled_at')
            ->orderBy('created_at')
            ->get();

        return response()->json([
            'date' => now()->toDateString(),
            'summary' => [
                'total' => $orders->count(),
                'waiting' => $orders->whereIn('status', ['booked', 'scheduled'])->count(),
                'in_progress' => $orders->where('status', 'in_progress')->count(),
                'completed' => $orders->where('status', 'completed')->count(),
                'not_present' => $orders->where('status', 'not_present')->count(),
            ],
            'queue' => $orders->values(),
        ]);
    }

    /** Doctor updates visit status from today's queue */
    public function updateVisitStatus(Request $request, DiagnosticOrder $diagnosticOrder): JsonResponse
    {
        $this->assertTenantAccess($diagnosticOrder);

        $doctorId = $this->doctorIdForUser();
        abort_unless($doctorId, 403, 'Only doctors can update visit status.');
        abort_if((int) $diagnosticOrder->doctor_id !== $doctorId, 403, 'This appointment is assigned to another doctor.');
        abort_unless(
            $this->isOrderInTodayQueue($diagnosticOrder),
            422,
            'Only today\'s appointments can be updated from this queue.'
        );

        $status = $request->validate([
            'status' => ['required', 'in:scheduled,in_progress,completed,not_present'],
        ])['status'];

        $allowed = match ($diagnosticOrder->status) {
            'booked', 'scheduled' => ['in_progress', 'not_present', 'scheduled'],
            'in_progress' => ['completed', 'scheduled'],
            'not_present' => ['scheduled', 'in_progress'],
            default => [],
        };

        abort_if(! in_array($status, $allowed, true), 422, 'Invalid status change for this appointment.');

        $diagnosticOrder->update(['status' => $status]);

        if ($status === 'scheduled' && ! $diagnosticOrder->queue_serial) {
            $this->assignQueueSerial($diagnosticOrder->fresh());
        }

        return response()->json($diagnosticOrder->fresh(['patient', 'testType.category']));
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

    /** Save prescription / report without completing the order */
    public function savePrescription(Request $request, DiagnosticOrder $diagnosticOrder): JsonResponse
    {
        $this->assertTenantAccess($diagnosticOrder);
        abort_if($diagnosticOrder->status === 'cancelled', 422, 'Cancelled orders cannot be updated.');

        $data = $request->validate([
            'findings'        => ['nullable', 'string'],
            'impression'      => ['nullable', 'string'],
            'recommendations' => ['nullable', 'string'],
            'complete'        => ['boolean'],
        ]);

        $report = DiagnosticReport::updateOrCreate(
            ['order_id' => $diagnosticOrder->id],
            [
                'company_id' => $diagnosticOrder->company_id,
                'findings' => $data['findings'] ?? null,
                'impression' => $data['impression'] ?? null,
                'recommendations' => $data['recommendations'] ?? null,
                'reported_by' => auth()->id(),
            ]
        );

        if ($request->boolean('complete')) {
            $diagnosticOrder->update(['status' => 'completed']);
        }

        return response()->json($report->load('reporter'));
    }

    public function prescription(DiagnosticOrder $diagnosticOrder): View
    {
        $this->assertTenantAccess($diagnosticOrder);

        $order = $diagnosticOrder->load([
            'patient',
            'doctor.user',
            'doctor.department',
            'testType.category',
            'referralPartner',
            'report.reporter',
        ]);

        $brandingService = app(ClinicBrandingService::class);
        $branding = $brandingService->forCompany((int) $order->company_id);

        $patient = $order->patient;
        $agePart = '—';
        if ($patient?->date_of_birth) {
            $diff = $patient->date_of_birth->diff(now());
            $agePart = sprintf('%d Y', $diff->y);
        }
        $sexPart = $patient?->gender ? strtoupper(substr($patient->gender, 0, 1) === 'M' ? 'MALE' : ($patient->gender === 'female' ? 'FEMALE' : strtoupper($patient->gender))) : '—';

        $serviceName = trim(($order->testType?->category?->name ? $order->testType->category->name.' — ' : '').($order->testType?->name ?? 'Diagnostic Test'));

        $referredBy = $order->referral_partner_name;
        if (! $referredBy && $order->doctor?->user?->name) {
            $referredBy = 'Dr. '.$order->doctor->user->name;
        }

        $doctorName = $order->doctor?->user?->name ?? auth()->user()?->name ?? 'Doctor';
        $doctorQualification = trim(($order->doctor?->department?->name ?? '').($order->doctor?->license_number ? ' · Reg: '.$order->doctor->license_number : ''));

        return view('documents.diagnostic-prescription', [
            'order' => $order,
            'patient' => $patient,
            'report' => $order->report,
            'branding' => $branding,
            'reportDate' => $order->report?->updated_at ?? $order->created_at ?? now(),
            'patientAgeSex' => $agePart.' / '.$sexPart,
            'serviceName' => $serviceName,
            'referredBy' => $referredBy,
            'doctorName' => $doctorName,
            'doctorQualification' => $doctorQualification,
            'findingsHtml' => PrescriptionFormatter::findingsToHtml($order->report?->findings),
        ]);
    }

    /** Record additional payment against due balance */
    public function recordPayment(Request $request, DiagnosticOrder $diagnosticOrder): JsonResponse
    {
        $this->assertTenantAccess($diagnosticOrder);

        $data = $request->validate([
            'amount' => ['required', 'numeric', 'min:0.01'],
            'payment_method' => ['nullable', 'string', 'max:40'],
            'reference' => ['nullable', 'string', 'max:80'],
            'notes' => ['nullable', 'string'],
            'paid_at' => ['nullable', 'date'],
        ]);

        try {
            $order = app(DiagnosticPaymentService::class)->recordPayment(
                $diagnosticOrder,
                (float) $data['amount'],
                $data['payment_method'] ?? null,
                $data['reference'] ?? null,
                $data['notes'] ?? null,
                isset($data['paid_at']) ? \Carbon\Carbon::parse($data['paid_at']) : null,
            );
        } catch (\InvalidArgumentException $e) {
            abort(422, $e->getMessage());
        }

        return response()->json($order->load(['payments.recorder', 'refunds.recorder', 'patient.wallet', 'testType']));
    }

    /** Refund a diagnostic payment (cash / online / wallet) */
    public function processRefund(Request $request, DiagnosticOrder $diagnosticOrder): JsonResponse
    {
        $this->assertTenantAccess($diagnosticOrder);

        $data = $request->validate([
            'payment_id' => ['required', 'exists:diagnostic_order_payments,id'],
            'amount' => ['required', 'numeric', 'min:0.01'],
            'refund_method' => ['required', Rule::in(DiagnosticOrderRefund::METHODS)],
            'reference' => ['nullable', 'required_if:refund_method,online', 'string', 'max:120'],
            'notes' => ['nullable', 'string'],
        ]);

        $payment = DiagnosticOrderPayment::findOrFail($data['payment_id']);
        abort_unless((int) $payment->diagnostic_order_id === (int) $diagnosticOrder->id, 422, 'Payment does not belong to this order.');

        try {
            $result = app(PatientWalletService::class)->refundDiagnosticPayment(
                $diagnosticOrder,
                $payment,
                (float) $data['amount'],
                $data['refund_method'],
                $data['reference'] ?? null,
                $data['notes'] ?? null,
            );
        } catch (\InvalidArgumentException $e) {
            abort(422, $e->getMessage());
        }

        return response()->json([
            'refund' => $result['refund'],
            'order' => $result['order']->load(['payments.recorder', 'refunds.recorder', 'patient.wallet']),
            'wallet_transaction' => $result['wallet_transaction'],
        ]);
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

    private function assertDoctorMappedToTest(?int $doctorId, DiagnosticTestType $testType): void
    {
        if (! $doctorId) {
            return;
        }

        $mappedIds = $testType->doctors->pluck('id');

        if ($mappedIds->isNotEmpty() && ! $mappedIds->contains($doctorId)) {
            abort(422, 'Selected doctor is not assigned to this diagnostic test.');
        }
    }

    private function assignQueueSerial(DiagnosticOrder $order): void
    {
        if (! $order->doctor_id) {
            return;
        }

        $day = ($order->scheduled_at ?? $order->created_at)?->toDateString();
        if (! $day) {
            return;
        }

        if ($order->queue_serial) {
            return;
        }

        $max = DiagnosticOrder::query()
            ->where('doctor_id', $order->doctor_id)
            ->whereDate('scheduled_at', $day)
            ->max('queue_serial');

        $order->update(['queue_serial' => ((int) $max) + 1]);
    }

    private function isOrderInTodayQueue(DiagnosticOrder $order): bool
    {
        $start = now()->startOfDay();
        $end = now()->endOfDay();

        if ($order->scheduled_at && $order->scheduled_at->between($start, $end)) {
            return true;
        }

        return $order->created_at?->between($start, $end)
            && in_array($order->status, ['booked', 'scheduled', 'in_progress', 'completed', 'not_present'], true);
    }
}
