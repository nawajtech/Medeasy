<?php

namespace App\Models;

use App\Models\Concerns\BelongsToCompany;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PartnerCentreRequest extends Model
{
    use BelongsToCompany;

    public const STATUSES = ['pending', 'approved', 'rejected', 'suspended'];

    protected $fillable = [
        'partner_id',
        'company_id',
        'message',
        'status',
        'reviewed_by',
        'reviewed_at',
        'review_notes',
        'referral_partner_id',
    ];

    protected function casts(): array
    {
        return [
            'reviewed_at' => 'datetime',
        ];
    }

    public function partner(): BelongsTo
    {
        return $this->belongsTo(Partner::class);
    }

    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }

    public function referralPartner(): BelongsTo
    {
        return $this->belongsTo(ReferralPartner::class, 'referral_partner_id');
    }
}
