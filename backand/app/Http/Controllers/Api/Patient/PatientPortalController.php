<?php

namespace App\Http\Controllers\Api\Patient;

use App\Http\Controllers\Controller;
use App\Models\Appointment;
use App\Models\Branch;
use App\Models\Company;
use App\Models\DiagnosticOrder;
use App\Models\DiagnosticPackage;
use App\Models\DiagnosticTestType;
use App\Models\Patient;
use App\Models\ReferralPartner;
use App\Services\DiagnosticOrderBillingService;
use App\Services\DiagnosticPaymentService;
use App\Services\DiagnosticReportShareService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class PatientPortalController extends Controller
{
    /** List active diagnostic centres. */
    public function centres(Request $request): JsonResponse
    {
        $search = trim((string) $request->input('search', ''));

        $query = Company::query()
            ->where('is_active', true)
            ->where(function ($q) {
                $q->whereJsonContains('modules', Company::MODULE_DIAGNOSTICS)
                    ->orWhere('type', 'diagnostic_center')
                    ->orWhere('type', 'hospital')
                    ->orWhere('type', 'multi');
            })
            ->orderBy('name');

        if ($search !== '') {
            $term = '%'.mb_strtolower($search).'%';
            $query->where(function ($q) use ($term) {
                $q->whereRaw('LOWER(name) LIKE ?', [$term])
                    ->orWhereRaw('LOWER(city) LIKE ?', [$term])
                    ->orWhereRaw('LOWER(address) LIKE ?', [$term]);
            });
        }

        $centres = $query->get()->map(fn (Company $c) => $this->centrePayload($c));

        return response()->json(['data' => $centres]);
    }

    public function centreShow(int $companyId): JsonResponse
    {
        $company = $this->resolveCentre($companyId);
        $branches = Branch::withoutGlobalScopes()
            ->where('company_id', $company->id)
            ->where('is_active', true)
            ->orderBy('name')
            ->get(['id', 'name', 'address', 'phone', 'city']);

        return response()->json([
            'centre' => $this->centrePayload($company),
            'branches' => $branches,
        ]);
    }

    public function centreServices(int $companyId): JsonResponse
    {
        $company = $this->resolveCentre($companyId);

        $tests = DiagnosticTestType::withoutGlobalScopes()
            ->with('category:id,name')
            ->where('company_id', $company->id)
            ->where('is_active', true)
            ->orderBy('name')
            ->get(['id', 'category_id', 'name', 'code', 'modality', 'description', 'preparation_instructions', 'price']);

        $packages = DiagnosticPackage::withoutGlobalScopes()
            ->where('company_id', $company->id)
            ->where('is_active', true)
            ->orderBy('package_name')
            ->get(['id', 'package_name', 'description', 'test_ids', 'offer_percentage']);

        return response()->json([
            'tests' => $tests,
            'packages' => $packages,
        ]);
    }

    /** Available sample-collection / visit slots for a date. */
    public function slots(Request $request, int $companyId): JsonResponse
    {
        $this->resolveCentre($companyId);

        $data = $request->validate([
            'date' => ['required', 'date', 'after_or_equal:today'],
        ]);

        $date = Carbon::parse($data['date'], config('app.timezone'))->startOfDay();
        if ($date->isSunday()) {
            return response()->json([
                'date' => $date->toDateString(),
                'slots' => [],
                'message' => 'No slots available on Sundays.',
            ]);
        }

        $startHour = 9;
        $endHour = 17;
        $intervalMinutes = 30;
        $now = now(config('app.timezone'));

        $booked = DiagnosticOrder::withoutGlobalScopes()
            ->where('company_id', $companyId)
            ->whereNotIn('status', ['cancelled'])
            ->whereDate('scheduled_at', $date->toDateString())
            ->pluck('scheduled_at')
            ->map(fn ($dt) => Carbon::parse($dt)->format('H:i'))
            ->countBy();

        $slots = [];
        for ($minutes = $startHour * 60; $minutes < $endHour * 60; $minutes += $intervalMinutes) {
            $slot = $date->copy()->addMinutes($minutes);
            if ($slot->lte($now)) {
                continue;
            }

            $key = $slot->format('H:i');
            $count = (int) ($booked[$key] ?? 0);
            $capacity = 8;

            $slots[] = [
                'time' => $key,
                'datetime' => $slot->toIso8601String(),
                'available' => $count < $capacity,
                'remaining' => max(0, $capacity - $count),
            ];
        }

        return response()->json([
            'date' => $date->toDateString(),
            'slots' => $slots,
        ]);
    }

    public function lookupReferral(Request $request, int $companyId): JsonResponse
    {
        $this->resolveCentre($companyId);

        $data = $request->validate([
            'code' => ['required', 'string', 'max:40'],
        ]);

        $partner = ReferralPartner::withoutGlobalScopes()
            ->where('company_id', $companyId)
            ->whereRaw('UPPER(referral_code) = ?', [strtoupper(trim($data['code']))])
            ->where(function ($q) {
                $q->where('status', 'active')->orWhere('status', 1)->orWhereNull('status');
            })
            ->first();

        if (! $partner) {
            throw ValidationException::withMessages([
                'code' => ['Referral doctor code not found for this centre.'],
            ]);
        }

        return response()->json([
            'referral' => [
                'id' => $partner->id,
                'name' => $partner->name,
                'type' => $partner->type,
                'referral_code' => $partner->referral_code,
            ],
        ]);
    }

    public function book(Request $request): JsonResponse
    {
        /** @var Patient $patient */
        $patient = $request->user();

        $data = $request->validate([
            'company_id' => ['required', 'exists:companies,id'],
            'branch_id' => ['nullable', 'exists:branches,id'],
            'test_type_ids' => ['required_without:package_id', 'array', 'min:1'],
            'test_type_ids.*' => ['integer', 'exists:diagnostic_test_types,id'],
            'package_id' => ['required_without:test_type_ids', 'nullable', 'exists:diago_package,id'],
            'scheduled_at' => ['required', 'date', 'after:now'],
            'notes' => ['nullable', 'string', 'max:1000'],
            'has_referral' => ['sometimes', 'boolean'],
            'referral_code' => ['nullable', 'string', 'max:40'],
            'payment_option' => ['required', Rule::in(['pay_on_visit', 'online'])],
            'online_method' => ['required_if:payment_option,online', 'nullable', Rule::in(['upi', 'card'])],
        ]);

        $company = $this->resolveCentre((int) $data['company_id']);

        if (! empty($data['branch_id'])) {
            $branchOk = Branch::withoutGlobalScopes()
                ->where('id', $data['branch_id'])
                ->where('company_id', $company->id)
                ->exists();
            abort_unless($branchOk, 422, 'Invalid branch for this centre.');
        }

        $partner = null;
        if ($request->boolean('has_referral') || filled($data['referral_code'] ?? null)) {
            abort_unless(filled($data['referral_code'] ?? null), 422, 'Referral doctor code is required when you have a referral.');

            $partner = ReferralPartner::withoutGlobalScopes()
                ->where('company_id', $company->id)
                ->whereRaw('UPPER(referral_code) = ?', [strtoupper(trim($data['referral_code']))])
                ->first();

            abort_unless($partner, 422, 'Referral doctor code not found for this centre.');
        }

        $scheduledAt = Carbon::parse($data['scheduled_at'], config('app.timezone'));

        if ($patient->company_id === null) {
            $patient->update(['company_id' => $company->id]);
            app(\App\Services\PatientWalletService::class)->ensureWallet($patient->fresh());
        }

        $billing = app(DiagnosticOrderBillingService::class);
        $paymentService = app(DiagnosticPaymentService::class);

        $orders = DB::transaction(function () use ($data, $patient, $company, $partner, $scheduledAt, $billing, $paymentService) {
            $created = [];

            if (! empty($data['package_id'])) {
                $package = DiagnosticPackage::withoutGlobalScopes()
                    ->where('company_id', $company->id)
                    ->findOrFail($data['package_id']);
                abort_unless($package->is_active, 422, 'This diagnostic package is not active.');

                $tests = DiagnosticTestType::withoutGlobalScopes()
                    ->where('company_id', $company->id)
                    ->whereIn('id', array_values(array_filter($package->test_ids ?? [])))
                    ->orderBy('name')
                    ->get();
                abort_if($tests->isEmpty(), 422, 'Package has no tests configured.');

                foreach ($tests as $testType) {
                    $created[] = $this->createOrderLine(
                        $patient,
                        $company,
                        $testType,
                        $package,
                        $partner,
                        $scheduledAt,
                        $data,
                        $billing,
                        $paymentService
                    );
                }

                return $created;
            }

            $testIds = array_values(array_unique($data['test_type_ids']));
            $tests = DiagnosticTestType::withoutGlobalScopes()
                ->where('company_id', $company->id)
                ->where('is_active', true)
                ->whereIn('id', $testIds)
                ->get();

            abort_if($tests->count() !== count($testIds), 422, 'One or more selected tests are invalid for this centre.');

            foreach ($tests as $testType) {
                $created[] = $this->createOrderLine(
                    $patient,
                    $company,
                    $testType,
                    null,
                    $partner,
                    $scheduledAt,
                    $data,
                    $billing,
                    $paymentService
                );
            }

            return $created;
        });

        $loaded = collect($orders)->map(fn (DiagnosticOrder $o) => $o->fresh()->load([
            'testType.category',
            'package',
            'referralPartner',
            'company:id,name,address,city,phone',
            'branch:id,name',
        ]));

        $totalGrand = round($loaded->sum(fn ($o) => (float) ($o->grand_total ?? $o->net_amount ?? 0)), 2);
        $totalPaid = round($loaded->sum(fn ($o) => (float) ($o->paid_amount ?? 0)), 2);
        $totalDue = round(max(0, $totalGrand - $totalPaid), 2);

        return response()->json([
            'message' => 'Appointment booked successfully.',
            'orders' => $loaded,
            'total_grand' => $totalGrand,
            'total_paid' => $totalPaid,
            'total_due' => $totalDue,
            'payment_option' => $data['payment_option'],
            'payment_status' => $totalDue <= 0.009 ? 'paid' : 'pending',
        ], 201);
    }

    public function appointments(Request $request): JsonResponse
    {
        /** @var Patient $patient */
        $patient = $request->user();
        $scope = $request->input('scope', 'upcoming'); // upcoming | past | all

        $query = DiagnosticOrder::withoutGlobalScopes()
            ->with([
                'testType.category',
                'package',
                'company:id,name,address,city,phone',
                'branch:id,name',
                'referralPartner:id,name,referral_code,type',
                'report',
            ])
            ->where('patient_id', $patient->id);

        if ($scope === 'upcoming') {
            $query->whereNotIn('status', ['completed', 'cancelled'])
                ->where(function ($q) {
                    $q->whereNull('scheduled_at')
                        ->orWhere('scheduled_at', '>=', now()->startOfDay());
                });
        } elseif ($scope === 'past') {
            $query->where(function ($q) {
                $q->whereIn('status', ['completed', 'cancelled'])
                    ->orWhere(function ($q2) {
                        $q2->whereNotNull('scheduled_at')
                            ->where('scheduled_at', '<', now()->startOfDay());
                    });
            });
        }

        $orders = $query->orderByDesc('scheduled_at')->orderByDesc('created_at')->get();

        return response()->json(['data' => $orders]);
    }

    public function appointmentShow(int $orderId): JsonResponse
    {
        /** @var Patient $patient */
        $patient = request()->user();

        $order = DiagnosticOrder::withoutGlobalScopes()
            ->with([
                'testType.category',
                'package',
                'company:id,name,address,city,phone,email',
                'branch:id,name,address,phone',
                'referralPartner:id,name,referral_code,type',
                'report',
            ])
            ->where('patient_id', $patient->id)
            ->findOrFail($orderId);

        $shareUrl = null;
        if ($order->share_token) {
                    $shareUrl = app(DiagnosticReportShareService::class)->shareUrl($order);
        }

        return response()->json([
            'order' => $order,
            'share_url' => $shareUrl,
            'can_cancel' => in_array($order->status, ['booked', 'scheduled'], true),
            'can_reschedule' => in_array($order->status, ['booked', 'scheduled'], true),
        ]);
    }

    public function cancel(int $orderId): JsonResponse
    {
        /** @var Patient $patient */
        $patient = request()->user();

        $order = DiagnosticOrder::withoutGlobalScopes()
            ->where('patient_id', $patient->id)
            ->findOrFail($orderId);

        abort_if($order->status === 'completed', 422, 'Completed appointments cannot be cancelled.');
        abort_if($order->status === 'cancelled', 422, 'This appointment is already cancelled.');
        abort_unless(in_array($order->status, ['booked', 'scheduled'], true), 422, 'This appointment can no longer be cancelled.');

        $order->update(['status' => 'cancelled']);

        return response()->json(['message' => 'Appointment cancelled.', 'order' => $order->fresh()]);
    }

    public function reschedule(Request $request, int $orderId): JsonResponse
    {
        /** @var Patient $patient */
        $patient = $request->user();

        $data = $request->validate([
            'scheduled_at' => ['required', 'date', 'after:now'],
        ]);

        $order = DiagnosticOrder::withoutGlobalScopes()
            ->where('patient_id', $patient->id)
            ->findOrFail($orderId);

        abort_unless(in_array($order->status, ['booked', 'scheduled'], true), 422, 'This appointment can no longer be rescheduled.');

        $scheduledAt = Carbon::parse($data['scheduled_at'], config('app.timezone'));
        $order->update([
            'scheduled_at' => $scheduledAt,
            'status' => 'scheduled',
            'queue_serial' => null,
        ]);

        return response()->json([
            'message' => 'Appointment rescheduled.',
            'order' => $order->fresh()->load(['testType', 'company:id,name', 'branch:id,name']),
        ]);
    }

    public function reports(Request $request): JsonResponse
    {
        /** @var Patient $patient */
        $patient = $request->user();

        $orders = DiagnosticOrder::withoutGlobalScopes()
            ->with(['testType:id,name', 'company:id,name', 'report'])
            ->where('patient_id', $patient->id)
            ->whereHas('report', fn ($q) => $q->whereNotNull('approved_at'))
            ->orderByDesc('updated_at')
            ->get()
            ->map(function (DiagnosticOrder $order) {
                return [
                    'order_id' => $order->id,
                    'order_number' => $order->order_number,
                    'test_name' => $order->testType?->name,
                    'centre' => $order->company?->name,
                    'status' => $order->status,
                    'approved_at' => $order->report?->approved_at,
                    'share_token' => $order->share_token,
                    'share_url' => $order->share_token
                        ? app(DiagnosticReportShareService::class)->shareUrl($order)
                        : null,
                ];
            });

        return response()->json(['data' => $orders]);
    }

    public function prescriptions(Request $request): JsonResponse
    {
        /** @var Patient $patient */
        $patient = $request->user();

        $fromAppointments = Appointment::withoutGlobalScopes()
            ->with(['doctor.user:id,name', 'company:id,name'])
            ->where('patient_id', $patient->id)
            ->where(function ($q) {
                $q->whereNotNull('prescription')
                    ->orWhereNotNull('prescription_file')
                    ->orWhereNotNull('prescription_data');
            })
            ->orderByDesc('appointment_date')
            ->get()
            ->map(fn (Appointment $a) => [
                'source' => 'appointment',
                'id' => $a->id,
                'date' => $a->appointment_date,
                'doctor' => $a->doctor?->user?->name,
                'centre' => $a->company?->name,
                'prescription' => $a->prescription,
                'prescription_type' => $a->prescription_type,
                'prescription_file_url' => $a->prescription_file_url,
                'prescription_data' => $a->prescription_data,
            ]);

        $fromDiagnostics = DiagnosticOrder::withoutGlobalScopes()
            ->with(['company:id,name', 'testType:id,name'])
            ->where('patient_id', $patient->id)
            ->whereNotNull('clinical_notes')
            ->where('clinical_notes', '!=', '')
            ->orderByDesc('created_at')
            ->get()
            ->map(fn (DiagnosticOrder $o) => [
                'source' => 'diagnostic',
                'id' => $o->id,
                'date' => $o->scheduled_at ?? $o->created_at,
                'doctor' => null,
                'centre' => $o->company?->name,
                'test_name' => $o->testType?->name,
                'prescription' => $o->clinical_notes,
                'prescription_type' => 'text',
                'prescription_file_url' => null,
                'prescription_data' => null,
            ]);

        return response()->json([
            'data' => $fromAppointments->concat($fromDiagnostics)->values(),
        ]);
    }

    private function createOrderLine(
        Patient $patient,
        Company $company,
        DiagnosticTestType $testType,
        ?DiagnosticPackage $package,
        ?ReferralPartner $partner,
        Carbon $scheduledAt,
        array $data,
        DiagnosticOrderBillingService $billing,
        DiagnosticPaymentService $paymentService
    ): DiagnosticOrder {
        $originalGross = (float) $testType->price;
        $packageDiscount = $package ? $package->discountForTestPrice($originalGross) : 0;
        $grossForBilling = $package ? $package->discountedPriceForTest($originalGross) : $originalGross;

        $amounts = $billing->calculate(
            $grossForBilling,
            (float) ($testType->referral_commission ?? 0),
            $partner,
            false,
            (int) $company->id,
            0,
        );

        $payload = array_merge($amounts, [
            'company_id' => $company->id,
            'branch_id' => $data['branch_id'] ?? null,
            'patient_id' => $patient->id,
            'test_type_id' => $testType->id,
            'package_id' => $package?->id,
            'package_discount' => $packageDiscount,
            'gross_amount' => $originalGross,
            'order_number' => $this->generateOrderNumber((int) $company->id),
            'status' => 'scheduled',
            'scheduled_at' => $scheduledAt,
            'priority' => 'routine',
            'notes' => $data['notes'] ?? null,
            'doctor_commission_amount' => round((float) ($testType->doctor_commission ?? 0), 2),
            'deduct_commission_from_bill' => false,
        ]);

        if ($partner) {
            $payload['referral_partner_id'] = $partner->id;
            $payload['referral_partner_name'] = $partner->name;
            $payload['referral_partner_mobile'] = $partner->mobile;
            $payload['referral_partner_address'] = $partner->address;
            $payload['referral_partner_type'] = $partner->type;
        }

        $order = DiagnosticOrder::create($payload);

        $paymentOption = $data['payment_option'] ?? 'pay_on_visit';
        if ($paymentOption === 'online') {
            $method = ($data['online_method'] ?? 'upi') === 'card' ? 'card' : 'upi';
            $payable = round((float) ($order->grand_total ?? $order->net_amount ?? 0), 2);
            $reference = 'ONLINE-'.strtoupper(Str::random(8));
            $paymentService->applyInitialPayment(
                $order,
                $payable,
                $method,
                $reference,
                'Paid online via patient portal'
            );
        } else {
            $paymentService->applyInitialPayment($order, 0, null, null, null);
            $order->update(['payment_method' => 'pay_on_visit']);
        }

        return $order->fresh();
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

    private function resolveCentre(int $companyId): Company
    {
        $company = Company::query()
            ->where('id', $companyId)
            ->where('is_active', true)
            ->firstOrFail();

        $hasDiagnostics = $company->hasModule(Company::MODULE_DIAGNOSTICS)
            || in_array($company->type, ['diagnostic_center', 'hospital', 'multi'], true);

        abort_unless($hasDiagnostics, 404, 'Diagnostic centre not found.');

        return $company;
    }

    private function centrePayload(Company $c): array
    {
        return [
            'id' => $c->id,
            'name' => $c->name,
            'code' => $c->code,
            'phone' => $c->phone,
            'email' => $c->email,
            'address' => $c->address,
            'city' => $c->city,
            'state' => $c->state,
            'description' => $c->description,
            'logo_url' => $c->logo_url,
            'modules' => $c->modules,
        ];
    }
}
