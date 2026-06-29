<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Concerns\HandlesTenancy;
use App\Http\Controllers\Controller;
use App\Models\ReferralPartner;
use App\Services\ReferralPartnerLedgerService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ReferralPartnerController extends Controller
{
    use HandlesTenancy;

    public function __construct(private ReferralPartnerLedgerService $ledger) {}

    public function index(Request $request): JsonResponse
    {
        $companyId = $this->optionalCompanyId($request);

        $partners = ReferralPartner::query()
            ->when($companyId, fn ($q) => $q->where('company_id', $companyId))
            ->when($request->boolean('active_only'), fn ($q) => $q->where('status', 'active'))
            ->when($request->filled('type'), fn ($q) => $q->where('type', $request->type))
            ->when($request->filled('q'), function ($q) use ($request) {
                $term = '%'.$request->q.'%';
                $q->where(function ($q2) use ($term) {
                    $q2->where('name', 'like', $term)
                        ->orWhere('phone', 'like', $term);
                });
            })
            ->orderBy('name')
            ->get();

        if ($request->boolean('with_summary')) {
            $partners = $this->ledger->attachSummary($partners);
        }

        return response()->json($partners);
    }

    public function store(Request $request): JsonResponse
    {
        $this->prepareCompanyScope($request);

        $data = $this->validatedPartnerData($request);
        $data['company_id'] = $this->resolveCompanyId($request);

        $partner = ReferralPartner::create($data);

        return response()->json($partner, 201);
    }

    public function update(Request $request, ReferralPartner $referralPartner): JsonResponse
    {
        $this->assertTenantAccess($referralPartner);

        $data = $this->validatedPartnerData($request, partial: true);

        if (array_key_exists('surcharge_type', $data) || array_key_exists('surcharge_value', $data)) {
            $type = $data['surcharge_type'] ?? $referralPartner->surcharge_type;
            $value = $data['surcharge_value'] ?? $referralPartner->surcharge_value;
            if (! $type || (float) $value <= 0) {
                $data['surcharge_type'] = null;
                $data['surcharge_value'] = 0;
            }
        }

        $referralPartner->update($data);

        return response()->json($referralPartner->fresh());
    }

    public function destroy(ReferralPartner $referralPartner): JsonResponse
    {
        $this->assertTenantAccess($referralPartner);
        $referralPartner->delete();

        return response()->json(null, 204);
    }

    public function ledger(ReferralPartner $referralPartner): JsonResponse
    {
        $this->assertTenantAccess($referralPartner);

        return response()->json($this->ledger->ledger($referralPartner));
    }

    public function storePayout(Request $request, ReferralPartner $referralPartner): JsonResponse
    {
        $this->assertTenantAccess($referralPartner);

        $data = $request->validate([
            'amount'    => ['required', 'numeric', 'min:0.01'],
            'paid_at'   => ['required', 'date'],
            'method'    => ['nullable', 'in:cash,bank,upi,other'],
            'reference' => ['nullable', 'string', 'max:100'],
            'notes'     => ['nullable', 'string'],
        ]);

        $summary = $this->ledger->ledger($referralPartner)['summary'];
        abort_if(
            (float) $data['amount'] > (float) $summary['balance_pending'],
            422,
            'Payout amount exceeds pending balance (₹'.number_format($summary['balance_pending'], 2).').'
        );

        $payout = $this->ledger->recordPayout($referralPartner, $data);

        return response()->json($payout->load('recorder:id,name'), 201);
    }

    private function validatedPartnerData(Request $request, bool $partial = false): array
    {
        $rules = [
            'company_id'      => $this->companyIdRules(),
            'name'            => [$partial ? 'sometimes' : 'required', 'string', 'max:150'],
            'mobile'          => ['nullable', 'string', 'max:20'],
            'address'         => ['nullable', 'string'],
            'type'            => [$partial ? 'sometimes' : 'required', 'in:doctor,clinic,hospital,agent'],
            'surcharge_type'  => ['nullable', 'in:fixed,percentage'],
            'surcharge_value' => ['nullable', 'numeric', 'min:0'],
            'is_active'       => ['boolean'],
        ];

        if ($partial) {
            unset($rules['company_id']);
        }

        $data = $request->validate($rules);

        if (array_key_exists('mobile', $data)) {
            $data['phone'] = $data['mobile'];
            unset($data['mobile']);
        }

        if (array_key_exists('is_active', $data)) {
            $data['status'] = $data['is_active'] ? 'active' : 'inactive';
            unset($data['is_active']);
        } elseif (! $partial) {
            $data['status'] = 'active';
        }

        $data['surcharge_value'] = $data['surcharge_value'] ?? 0;
        if (empty($data['surcharge_type']) || (float) $data['surcharge_value'] <= 0) {
            $data['surcharge_type'] = null;
            $data['surcharge_value'] = 0;
        }

        return $data;
    }
}
