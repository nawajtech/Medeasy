<?php

namespace App\Http\Controllers\Api\Partner;

use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Models\Company;
use App\Models\DiagnosticOrder;
use App\Models\DiagnosticPackage;
use App\Models\DiagnosticTestType;
use App\Models\DiagnosticCategory;
use App\Models\Partner;
use App\Models\PartnerCentreRequest;
use App\Models\Patient;
use App\Models\ReferralCommissionPayout;
use App\Models\ReferralPartner;
use App\Services\AuditService;
use App\Services\DiagnosticOrderBillingService;
use App\Services\DiagnosticPaymentService;
use App\Services\PatientWalletService;
use App\Services\ReferralPartnerLedgerService;
use App\Support\ContactRules;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class PartnerPortalController extends Controller
{
    public function dashboard(Request $request): JsonResponse
    {
        /** @var Partner $partner */
        $partner = $request->user();

        $relationshipIds = $this->activeRelationshipIds($partner);

        $pendingRequests = PartnerCentreRequest::query()
            ->where('partner_id', $partner->id)
            ->where('status', 'pending')
            ->count();

        $approvedPartnerships = count($relationshipIds);

        $ordersQuery = DiagnosticOrder::withoutGlobalScopes()
            ->whereIn('referral_partner_id', $relationshipIds ?: [0]);

        $totalReferrals = (clone $ordersQuery)->where('status', '!=', 'cancelled')->count();
        $upcomingBookings = (clone $ordersQuery)
            ->whereNotIn('status', ['completed', 'cancelled'])
            ->where(function ($q) {
                $q->whereNull('scheduled_at')->orWhere('scheduled_at', '>=', now()->startOfDay());
            })
            ->count();
        $completedReferrals = (clone $ordersQuery)->where('status', 'completed')->count();

        $earnings = $this->earningsSummary($relationshipIds);

        $recentReferrals = DiagnosticOrder::withoutGlobalScopes()
            ->with([
                'patient:id,name',
                'company:id,name',
                'testType:id,name',
                'referralPartner:id,referral_code,name',
            ])
            ->whereIn('referral_partner_id', $relationshipIds ?: [0])
            ->orderByDesc('created_at')
            ->limit(8)
            ->get()
            ->map(fn (DiagnosticOrder $o) => $this->referralPayload($o));

        $recentRequests = PartnerCentreRequest::query()
            ->with('company:id,name,city,logo_url')
            ->where('partner_id', $partner->id)
            ->orderByDesc('created_at')
            ->limit(8)
            ->get();

        $centres = ReferralPartner::withoutGlobalScopes()
            ->with('company:id,name,city,logo_url')
            ->where('partner_account_id', $partner->id)
            ->where('status', 'active')
            ->orderBy('name')
            ->get()
            ->map(fn (ReferralPartner $r) => [
                'relationship_id' => $r->id,
                'referral_code' => $r->referral_code,
                'company_id' => $r->company_id,
                'centre_name' => $r->company?->name,
                'city' => $r->company?->city,
                'logo_url' => $r->company?->logo_url,
            ]);

        return response()->json([
            'stats' => [
                'connected_centres' => $approvedPartnerships,
                'pending_requests' => $pendingRequests,
                'approved_partnerships' => $approvedPartnerships,
                'total_referrals' => $totalReferrals,
                'upcoming_bookings' => $upcomingBookings,
                'completed_referrals' => $completedReferrals,
                'eligible_pending_earnings' => $earnings['pending'],
                'paid_earnings' => $earnings['paid'],
            ],
            'centres' => $centres,
            'recent_referrals' => $recentReferrals,
            'recent_requests' => $recentRequests,
        ]);
    }

    public function centres(Request $request): JsonResponse
    {
        /** @var Partner $partner */
        $partner = $request->user();

        $search = trim((string) $request->input('search', ''));
        $city = trim((string) $request->input('city', ''));
        $category = trim((string) $request->input('category', ''));

        $query = Company::query()
            ->where('is_active', true)
            ->where('partner_discovery_enabled', true)
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

        if ($city !== '') {
            $query->whereRaw('LOWER(city) = ?', [mb_strtolower($city)]);
        }

        $centres = $query->get();

        $requestMap = PartnerCentreRequest::query()
            ->where('partner_id', $partner->id)
            ->whereIn('company_id', $centres->pluck('id'))
            ->orderByDesc('id')
            ->get()
            ->groupBy('company_id')
            ->map(fn ($rows) => $rows->first());

        $relationshipMap = ReferralPartner::withoutGlobalScopes()
            ->where('partner_account_id', $partner->id)
            ->whereIn('company_id', $centres->pluck('id'))
            ->where('status', 'active')
            ->get()
            ->keyBy('company_id');

        $payload = $centres->map(function (Company $c) use ($requestMap, $relationshipMap, $category) {
            $categories = $this->centreCategories((int) $c->id);
            if ($category !== '' && ! collect($categories)->contains(fn ($n) => strcasecmp($n, $category) === 0)) {
                return null;
            }

            $rel = $relationshipMap->get($c->id);
            $req = $requestMap->get($c->id);

            return [
                ...$this->centrePayload($c),
                'categories' => $categories,
                'branch_count' => Branch::withoutGlobalScopes()
                    ->where('company_id', $c->id)
                    ->where('is_active', true)
                    ->count(),
                'partnership_status' => $rel
                    ? 'approved'
                    : ($req?->status ?? 'available'),
                'referral_code' => $rel?->referral_code,
                'relationship_id' => $rel?->id,
            ];
        })->filter()->values();

        $cities = Company::query()
            ->where('is_active', true)
            ->where('partner_discovery_enabled', true)
            ->whereNotNull('city')
            ->where('city', '!=', '')
            ->distinct()
            ->orderBy('city')
            ->pluck('city');

        return response()->json([
            'data' => $payload,
            'filters' => [
                'cities' => $cities,
            ],
        ]);
    }

    public function centreShow(Request $request, int $companyId): JsonResponse
    {
        /** @var Partner $partner */
        $partner = $request->user();
        $company = $this->resolveDiscoverableCentre($companyId);

        $branches = Branch::withoutGlobalScopes()
            ->where('company_id', $company->id)
            ->where('is_active', true)
            ->orderBy('name')
            ->get(['id', 'name', 'address', 'phone', 'city']);

        $tests = DiagnosticTestType::withoutGlobalScopes()
            ->with('category:id,name')
            ->where('company_id', $company->id)
            ->where('is_active', true)
            ->orderBy('name')
            ->get(['id', 'category_id', 'name', 'code', 'modality', 'description', 'preparation_instructions']);

        $packages = DiagnosticPackage::withoutGlobalScopes()
            ->where('company_id', $company->id)
            ->where('is_active', true)
            ->orderBy('package_name')
            ->get(['id', 'package_name', 'description', 'test_ids']);

        $relationship = ReferralPartner::withoutGlobalScopes()
            ->where('partner_account_id', $partner->id)
            ->where('company_id', $company->id)
            ->where('status', 'active')
            ->first();

        $requestRow = PartnerCentreRequest::query()
            ->where('partner_id', $partner->id)
            ->where('company_id', $company->id)
            ->orderByDesc('id')
            ->first();

        return response()->json([
            'centre' => [
                ...$this->centrePayload($company),
                'categories' => $this->centreCategories((int) $company->id),
                'partnership_status' => $relationship
                    ? 'approved'
                    : ($requestRow?->status ?? 'available'),
                'referral_code' => $relationship?->referral_code,
                'relationship_id' => $relationship?->id,
            ],
            'branches' => $branches,
            'tests' => $tests,
            'packages' => $packages,
        ]);
    }

    /** Public catalogue with prices — only for approved partnerships. */
    public function centreServices(Request $request, int $companyId): JsonResponse
    {
        /** @var Partner $partner */
        $partner = $request->user();
        $relationship = $this->requireActiveRelationship($partner, $companyId);

        $tests = DiagnosticTestType::withoutGlobalScopes()
            ->with('category:id,name')
            ->where('company_id', $relationship->company_id)
            ->where('is_active', true)
            ->orderBy('name')
            ->get(['id', 'category_id', 'name', 'code', 'modality', 'description', 'preparation_instructions', 'price']);

        $packages = DiagnosticPackage::withoutGlobalScopes()
            ->where('company_id', $relationship->company_id)
            ->where('is_active', true)
            ->orderBy('package_name')
            ->get(['id', 'package_name', 'description', 'test_ids', 'offer_percentage']);

        return response()->json([
            'relationship_id' => $relationship->id,
            'referral_code' => $relationship->referral_code,
            'tests' => $tests,
            'packages' => $packages,
        ]);
    }

    public function slots(Request $request, int $companyId): JsonResponse
    {
        /** @var Partner $partner */
        $partner = $request->user();
        $this->requireActiveRelationship($partner, $companyId);

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

    public function requestPartnership(Request $request): JsonResponse
    {
        /** @var Partner $partner */
        $partner = $request->user();

        $data = $request->validate([
            'company_id' => ['required', 'exists:companies,id'],
            'message' => ['nullable', 'string', 'max:2000'],
        ]);

        $company = $this->resolveDiscoverableCentre((int) $data['company_id']);

        $active = ReferralPartner::withoutGlobalScopes()
            ->where('partner_account_id', $partner->id)
            ->where('company_id', $company->id)
            ->where('status', 'active')
            ->exists();

        if ($active) {
            throw ValidationException::withMessages([
                'company_id' => ['You already have an active partnership with this centre.'],
            ]);
        }

        $pending = PartnerCentreRequest::query()
            ->where('partner_id', $partner->id)
            ->where('company_id', $company->id)
            ->where('status', 'pending')
            ->exists();

        if ($pending) {
            throw ValidationException::withMessages([
                'company_id' => ['A partnership request is already pending for this centre.'],
            ]);
        }

        $row = PartnerCentreRequest::create([
            'partner_id' => $partner->id,
            'company_id' => $company->id,
            'message' => $data['message'] ?? null,
            'status' => 'pending',
        ]);

        app(AuditService::class)->log(
            'create',
            'partner_requests',
            $row,
            null,
            ['status' => 'pending', 'partner_id' => $partner->id],
            ['label' => "Partnership request to {$company->name}"],
            $request,
        );

        return response()->json([
            'message' => 'Partnership request submitted.',
            'request' => $row->load('company:id,name,city,logo_url'),
        ], 201);
    }

    public function requests(Request $request): JsonResponse
    {
        /** @var Partner $partner */
        $partner = $request->user();

        $rows = PartnerCentreRequest::query()
            ->with([
                'company:id,name,city,logo_url,phone',
                'referralPartner:id,referral_code,status',
            ])
            ->where('partner_id', $partner->id)
            ->when($request->filled('status'), fn ($q) => $q->where('status', $request->status))
            ->orderByDesc('created_at')
            ->get();

        return response()->json(['data' => $rows]);
    }

    public function relationships(Request $request): JsonResponse
    {
        /** @var Partner $partner */
        $partner = $request->user();

        $rows = ReferralPartner::withoutGlobalScopes()
            ->with('company:id,name,city,logo_url,phone,address')
            ->where('partner_account_id', $partner->id)
            ->where('status', 'active')
            ->orderBy('name')
            ->get()
            ->map(fn (ReferralPartner $r) => [
                'relationship_id' => $r->id,
                'company_id' => $r->company_id,
                'referral_code' => $r->referral_code,
                'status' => $r->status,
                'centre' => $r->company,
            ]);

        return response()->json(['data' => $rows]);
    }

    public function book(Request $request): JsonResponse
    {
        /** @var Partner $partner */
        $partner = $request->user();

        $data = $request->validate([
            'company_id' => ['required', 'exists:companies,id'],
            'branch_id' => ['nullable', 'exists:branches,id'],
            'patient_id' => ['nullable', 'exists:patients,id'],
            'patient' => ['required_without:patient_id', 'array'],
            'patient.name' => ['required_without:patient_id', 'string', 'max:255'],
            'patient.phone' => ['required_without:patient_id', ...ContactRules::phone(required: false)],
            'patient.email' => [...ContactRules::email(required: false)],
            'patient.gender' => ['nullable', Rule::in(['male', 'female', 'other'])],
            'patient.date_of_birth' => ['nullable', 'date', 'before:today'],
            'patient.address' => ['nullable', 'string', 'max:1000'],
            'test_type_ids' => ['required_without:package_id', 'array', 'min:1'],
            'test_type_ids.*' => ['integer', 'exists:diagnostic_test_types,id'],
            'package_id' => ['required_without:test_type_ids', 'nullable', 'exists:diago_package,id'],
            'scheduled_at' => ['required', 'date', 'after:now'],
            'notes' => ['nullable', 'string', 'max:1000'],
            'patient_consent' => ['accepted'],
            'payment_option' => ['required', Rule::in(['pay_on_visit', 'online'])],
            'online_method' => ['required_if:payment_option,online', 'nullable', Rule::in(['upi', 'card'])],
        ]);

        $relationship = $this->requireActiveRelationship($partner, (int) $data['company_id']);
        $company = Company::query()->where('id', $relationship->company_id)->where('is_active', true)->firstOrFail();

        if (! empty($data['branch_id'])) {
            $branchOk = Branch::withoutGlobalScopes()
                ->where('id', $data['branch_id'])
                ->where('company_id', $company->id)
                ->exists();
            abort_unless($branchOk, 422, 'Invalid branch for this centre.');
        }

        $patient = $this->resolveOrCreatePatient($data, $company);
        $scheduledAt = Carbon::parse($data['scheduled_at'], config('app.timezone'));
        $billing = app(DiagnosticOrderBillingService::class);
        $paymentService = app(DiagnosticPaymentService::class);

        $orders = DB::transaction(function () use ($data, $patient, $company, $relationship, $scheduledAt, $billing, $paymentService) {
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
                        $relationship,
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
                    $relationship,
                    $scheduledAt,
                    $data,
                    $billing,
                    $paymentService
                );
            }

            return $created;
        });

        $loaded = collect($orders)->map(fn (DiagnosticOrder $o) => $o->fresh()->load([
            'patient:id,name,phone',
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
            'message' => 'Referral booking submitted.',
            'orders' => $loaded,
            'referral_code' => $relationship->referral_code,
            'total_grand' => $totalGrand,
            'total_paid' => $totalPaid,
            'total_due' => $totalDue,
            'payment_option' => $data['payment_option'],
            'payment_status' => $totalDue <= 0.009 ? 'paid' : 'pending',
        ], 201);
    }

    public function referrals(Request $request): JsonResponse
    {
        /** @var Partner $partner */
        $partner = $request->user();
        $relationshipIds = $this->activeRelationshipIds($partner);

        $query = DiagnosticOrder::withoutGlobalScopes()
            ->with([
                'patient:id,name,phone',
                'testType:id,name',
                'package:id,package_name',
                'company:id,name,city',
                'branch:id,name',
                'referralPartner:id,referral_code,name',
            ])
            ->whereIn('referral_partner_id', $relationshipIds ?: [0]);

        if ($request->filled('company_id')) {
            $query->where('company_id', (int) $request->company_id);
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('search')) {
            $term = '%'.$request->search.'%';
            $query->where(function ($q) use ($term) {
                $q->where('order_number', 'like', $term)
                    ->orWhereHas('patient', fn ($pq) => $pq->where('name', 'like', $term)->orWhere('phone', 'like', $term));
            });
        }

        $paginator = $query->orderByDesc('created_at')->paginate(min(50, max(1, (int) $request->input('per_page', 20))));

        return response()->json([
            'data' => collect($paginator->items())->map(fn (DiagnosticOrder $o) => $this->referralPayload($o)),
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
            ],
        ]);
    }

    public function referralShow(Request $request, int $orderId): JsonResponse
    {
        /** @var Partner $partner */
        $partner = $request->user();
        $relationshipIds = $this->activeRelationshipIds($partner);

        $order = DiagnosticOrder::withoutGlobalScopes()
            ->with([
                'patient:id,name,phone,gender,date_of_birth',
                'testType.category',
                'package',
                'company:id,name,address,city,phone',
                'branch:id,name,address,phone',
                'referralPartner:id,referral_code,name,type',
            ])
            ->whereIn('referral_partner_id', $relationshipIds ?: [0])
            ->findOrFail($orderId);

        return response()->json([
            'order' => $this->referralPayload($order, detailed: true),
        ]);
    }

    public function earnings(Request $request): JsonResponse
    {
        /** @var Partner $partner */
        $partner = $request->user();
        $relationshipIds = $this->activeRelationshipIds($partner);
        $ledger = app(ReferralPartnerLedgerService::class);

        $relationships = ReferralPartner::withoutGlobalScopes()
            ->with('company:id,name')
            ->whereIn('id', $relationshipIds ?: [0])
            ->get();

        $byCentre = $ledger->attachSummary($relationships)->map(fn (ReferralPartner $r) => [
            'relationship_id' => $r->id,
            'company_id' => $r->company_id,
            'centre_name' => $r->company?->name,
            'referral_code' => $r->referral_code,
            'total_earned' => (float) $r->total_earned,
            'total_paid' => (float) $r->total_paid,
            'balance_pending' => (float) $r->balance_pending,
        ]);

        $commissions = DiagnosticOrder::withoutGlobalScopes()
            ->with(['patient:id,name', 'testType:id,name', 'company:id,name'])
            ->whereIn('referral_partner_id', $relationshipIds ?: [0])
            ->where('status', '!=', 'cancelled')
            ->where('referral_commission_amount', '>', 0)
            ->orderByDesc('created_at')
            ->limit(100)
            ->get()
            ->map(fn (DiagnosticOrder $order) => [
                'id' => $order->id,
                'order_number' => $order->order_number,
                'date' => $order->created_at?->toIso8601String(),
                'patient_name' => $order->patient?->name,
                'centre' => $order->company?->name,
                'test_name' => $order->testType?->name,
                'commission' => (float) $order->referral_commission_amount,
                'status' => $order->status,
                'eligibility' => $order->status === 'completed' ? 'eligible' : 'pending_completion',
            ]);

        $payouts = ReferralCommissionPayout::query()
            ->with(['referralPartner.company:id,name'])
            ->whereIn('referral_partner_id', $relationshipIds ?: [0])
            ->orderByDesc('paid_at')
            ->limit(100)
            ->get()
            ->map(fn (ReferralCommissionPayout $payout) => [
                'id' => $payout->id,
                'amount' => (float) $payout->amount,
                'paid_at' => $payout->paid_at?->toIso8601String(),
                'method' => $payout->method,
                'reference' => $payout->reference,
                'centre' => $payout->referralPartner?->company?->name,
            ]);

        $summary = $this->earningsSummary($relationshipIds);

        return response()->json([
            'summary' => [
                'eligible_earnings' => $summary['earned'],
                'pending_commission' => $summary['pending'],
                'approved_commission' => $summary['earned'],
                'paid_commission' => $summary['paid'],
            ],
            'by_centre' => $byCentre,
            'ledger' => $commissions,
            'payouts' => $payouts,
        ]);
    }

    private function resolveOrCreatePatient(array $data, Company $company): Patient
    {
        if (! empty($data['patient_id'])) {
            $patient = Patient::withoutGlobalScopes()->findOrFail($data['patient_id']);
            abort_unless(
                $patient->company_id === null || (int) $patient->company_id === (int) $company->id,
                422,
                'Patient does not belong to this centre.'
            );
            if ($patient->company_id === null) {
                $patient->update(['company_id' => $company->id]);
                app(PatientWalletService::class)->ensureWallet($patient->fresh());
            }

            return $patient->fresh();
        }

        $patientData = $data['patient'];
        $existing = Patient::withoutGlobalScopes()
            ->where('phone', $patientData['phone'])
            ->where(function ($q) use ($company) {
                $q->where('company_id', $company->id)->orWhereNull('company_id');
            })
            ->first();

        if ($existing) {
            if ($existing->company_id === null) {
                $existing->update(['company_id' => $company->id]);
                app(PatientWalletService::class)->ensureWallet($existing->fresh());
            }

            return $existing->fresh();
        }

        $patient = Patient::create([
            'company_id' => $company->id,
            'patient_code' => 'P'.strtoupper(Str::random(8)),
            'name' => $patientData['name'],
            'phone' => $patientData['phone'],
            'email' => $patientData['email'] ?? null,
            'gender' => $patientData['gender'] ?? null,
            'date_of_birth' => $patientData['date_of_birth'] ?? null,
            'address' => $patientData['address'] ?? null,
            'status' => true,
            'password' => Str::random(32),
        ]);

        app(PatientWalletService::class)->ensureWallet($patient);

        return $patient;
    }

    private function createOrderLine(
        Patient $patient,
        Company $company,
        DiagnosticTestType $testType,
        ?DiagnosticPackage $package,
        ReferralPartner $partner,
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
            'referral_partner_id' => $partner->id,
            'referral_partner_name' => $partner->name,
            'referral_partner_mobile' => $partner->mobile,
            'referral_partner_address' => $partner->address,
            'referral_partner_type' => $partner->type,
        ]);

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
                'Paid online via partner portal'
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

    private function requireActiveRelationship(Partner $partner, int $companyId): ReferralPartner
    {
        $relationship = ReferralPartner::withoutGlobalScopes()
            ->where('partner_account_id', $partner->id)
            ->where('company_id', $companyId)
            ->where('status', 'active')
            ->first();

        abort_unless($relationship, 403, 'Approved partnership required for this centre.');

        return $relationship;
    }

    /** @return list<int> */
    private function activeRelationshipIds(Partner $partner): array
    {
        return ReferralPartner::withoutGlobalScopes()
            ->where('partner_account_id', $partner->id)
            ->where('status', 'active')
            ->pluck('id')
            ->all();
    }

    private function earningsSummary(array $relationshipIds): array
    {
        if ($relationshipIds === []) {
            return ['earned' => 0.0, 'paid' => 0.0, 'pending' => 0.0];
        }

        $earned = (float) DiagnosticOrder::withoutGlobalScopes()
            ->whereIn('referral_partner_id', $relationshipIds)
            ->where('status', '!=', 'cancelled')
            ->where('referral_commission_amount', '>', 0)
            ->sum('referral_commission_amount');

        $paid = (float) ReferralCommissionPayout::query()
            ->whereIn('referral_partner_id', $relationshipIds)
            ->sum('amount');

        return [
            'earned' => round($earned, 2),
            'paid' => round($paid, 2),
            'pending' => round(max(0, $earned - $paid), 2),
        ];
    }

    private function referralPayload(DiagnosticOrder $order, bool $detailed = false): array
    {
        $base = [
            'id' => $order->id,
            'booking_id' => $order->order_number,
            'patient_name' => $order->patient?->name,
            'patient_phone' => $detailed ? $order->patient?->phone : null,
            'centre' => $order->company?->name,
            'company_id' => $order->company_id,
            'test_name' => $order->testType?->name ?? $order->package?->package_name,
            'booking_date' => $order->created_at?->toIso8601String(),
            'appointment_date' => $order->scheduled_at?->toIso8601String(),
            'status' => $order->status,
            'referral_code' => $order->referralPartner?->referral_code,
            'commission_amount' => (float) ($order->referral_commission_amount ?? 0),
            'commission_status' => $order->status === 'cancelled'
                ? 'none'
                : ($order->status === 'completed' ? 'eligible' : 'pending'),
        ];

        if ($detailed) {
            $base['branch'] = $order->branch?->name;
            $base['notes'] = $order->notes;
            $base['amount'] = (float) ($order->grand_total ?? $order->net_amount ?? 0);
        }

        return $base;
    }

    private function resolveDiscoverableCentre(int $companyId): Company
    {
        $company = Company::query()
            ->where('id', $companyId)
            ->where('is_active', true)
            ->where('partner_discovery_enabled', true)
            ->firstOrFail();

        $hasDiagnostics = $company->hasModule(Company::MODULE_DIAGNOSTICS)
            || in_array($company->type, ['diagnostic_center', 'hospital', 'multi'], true);

        abort_unless($hasDiagnostics, 404, 'Diagnostic centre not found.');

        return $company;
    }

    /** @return list<string> */
    private function centreCategories(int $companyId): array
    {
        return DiagnosticCategory::withoutGlobalScopes()
            ->where('company_id', $companyId)
            ->orderBy('name')
            ->pluck('name')
            ->unique()
            ->values()
            ->all();
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
            'partner_discovery_enabled' => (bool) $c->partner_discovery_enabled,
        ];
    }
}
