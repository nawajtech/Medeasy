<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Concerns\HandlesTenancy;
use App\Http\Controllers\Controller;
use App\Models\PartnerCentreRequest;
use App\Models\ReferralPartner;
use App\Services\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class PartnerCentreRequestController extends Controller
{
    use HandlesTenancy;

    public function index(Request $request): JsonResponse
    {
        $companyId = $this->optionalCompanyId($request);

        $rows = PartnerCentreRequest::query()
            ->with([
                'partner:id,name,type,phone,email,city,state,address,professional_details',
                'referralPartner:id,referral_code,status',
                'reviewer:id,name',
            ])
            ->when($companyId, fn ($q) => $q->where('company_id', $companyId))
            ->when($request->filled('status'), fn ($q) => $q->where('status', $request->status))
            ->orderByRaw("CASE status WHEN 'pending' THEN 0 WHEN 'approved' THEN 1 ELSE 2 END")
            ->orderByDesc('created_at')
            ->get();

        return response()->json(['data' => $rows]);
    }

    public function approve(Request $request, PartnerCentreRequest $partnerCentreRequest): JsonResponse
    {
        $this->assertTenantAccess($partnerCentreRequest);

        if ($partnerCentreRequest->status !== 'pending') {
            throw ValidationException::withMessages([
                'status' => ['Only pending requests can be approved.'],
            ]);
        }

        $data = $request->validate([
            'review_notes' => ['nullable', 'string', 'max:1000'],
            'surcharge_type' => ['nullable', Rule::in(ReferralPartner::SURCHARGE_TYPES)],
            'surcharge_value' => ['nullable', 'numeric', 'min:0'],
        ]);

        $partner = $partnerCentreRequest->partner;
        abort_unless($partner, 422, 'Partner account missing.');

        $existing = ReferralPartner::query()
            ->where('company_id', $partnerCentreRequest->company_id)
            ->where('partner_account_id', $partner->id)
            ->where('status', 'active')
            ->first();

        if ($existing) {
            throw ValidationException::withMessages([
                'status' => ['An active partnership already exists for this partner.'],
            ]);
        }

        $result = DB::transaction(function () use ($partnerCentreRequest, $partner, $data, $request) {
            $relationship = ReferralPartner::create([
                'company_id' => $partnerCentreRequest->company_id,
                'partner_account_id' => $partner->id,
                'name' => $partner->name,
                'phone' => $partner->phone,
                'address' => trim(implode(', ', array_filter([
                    $partner->address,
                    $partner->city,
                    $partner->state,
                ]))),
                'type' => $partner->type,
                'surcharge_type' => $data['surcharge_type'] ?? null,
                'surcharge_value' => $data['surcharge_value'] ?? 0,
                'status' => 'active',
            ]);

            $partnerCentreRequest->update([
                'status' => 'approved',
                'reviewed_by' => $request->user()?->id,
                'reviewed_at' => now(),
                'review_notes' => $data['review_notes'] ?? null,
                'referral_partner_id' => $relationship->id,
            ]);

            return $relationship;
        });

        app(AuditService::class)->log(
            'approve',
            'partner_requests',
            $partnerCentreRequest->fresh(),
            ['status' => 'pending'],
            ['status' => 'approved', 'referral_partner_id' => $result->id, 'referral_code' => $result->referral_code],
            ['label' => "Approved partnership for {$partner->name}"],
            $request,
        );

        return response()->json([
            'message' => 'Partnership approved.',
            'request' => $partnerCentreRequest->fresh()->load([
                'partner:id,name,type,phone,email',
                'referralPartner:id,referral_code,status',
            ]),
            'referral_partner' => $result,
        ]);
    }

    public function reject(Request $request, PartnerCentreRequest $partnerCentreRequest): JsonResponse
    {
        $this->assertTenantAccess($partnerCentreRequest);

        if ($partnerCentreRequest->status !== 'pending') {
            throw ValidationException::withMessages([
                'status' => ['Only pending requests can be rejected.'],
            ]);
        }

        $data = $request->validate([
            'review_notes' => ['nullable', 'string', 'max:1000'],
        ]);

        $partnerCentreRequest->update([
            'status' => 'rejected',
            'reviewed_by' => $request->user()?->id,
            'reviewed_at' => now(),
            'review_notes' => $data['review_notes'] ?? null,
        ]);

        app(AuditService::class)->log(
            'reject',
            'partner_requests',
            $partnerCentreRequest,
            ['status' => 'pending'],
            ['status' => 'rejected'],
            ['label' => 'Rejected partnership request'],
            $request,
        );

        return response()->json([
            'message' => 'Partnership request rejected.',
            'request' => $partnerCentreRequest->fresh()->load('partner:id,name,type,phone,email'),
        ]);
    }

    public function suspend(Request $request, PartnerCentreRequest $partnerCentreRequest): JsonResponse
    {
        $this->assertTenantAccess($partnerCentreRequest);

        if ($partnerCentreRequest->status !== 'approved') {
            throw ValidationException::withMessages([
                'status' => ['Only approved partnerships can be suspended.'],
            ]);
        }

        $data = $request->validate([
            'review_notes' => ['nullable', 'string', 'max:1000'],
        ]);

        DB::transaction(function () use ($partnerCentreRequest, $data, $request) {
            if ($partnerCentreRequest->referral_partner_id) {
                ReferralPartner::query()
                    ->where('id', $partnerCentreRequest->referral_partner_id)
                    ->update(['status' => 'inactive']);
            }

            $partnerCentreRequest->update([
                'status' => 'suspended',
                'reviewed_by' => $request->user()?->id,
                'reviewed_at' => now(),
                'review_notes' => $data['review_notes'] ?? null,
            ]);
        });

        app(AuditService::class)->log(
            'suspend',
            'partner_requests',
            $partnerCentreRequest->fresh(),
            ['status' => 'approved'],
            ['status' => 'suspended'],
            ['label' => 'Suspended partnership'],
            $request,
        );

        return response()->json([
            'message' => 'Partnership suspended.',
            'request' => $partnerCentreRequest->fresh()->load([
                'partner:id,name,type,phone,email',
                'referralPartner:id,referral_code,status',
            ]),
        ]);
    }
}
