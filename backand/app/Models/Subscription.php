<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Subscription extends Model
{
    public const STATUS_TRIAL = 'trial';

    public const STATUS_ACTIVE = 'active';

    public const STATUS_EXPIRED = 'expired';

    public const STATUS_SUSPENDED = 'suspended';

    public const STATUS_CANCELLED = 'cancelled';

    public const BILLING_MONTHLY = 'monthly';

    public const BILLING_YEARLY = 'yearly';

    public const USABLE_STATUSES = [
        self::STATUS_TRIAL,
        self::STATUS_ACTIVE,
    ];

    protected $fillable = [
        'company_id',
        'plan_id',
        'status',
        'starts_at',
        'expires_at',
        'trial_ends_at',
        'renewal_date',
        'auto_renewal',
        'billing_cycle',
        'cancelled_at',
        'suspended_at',
        'meta',
    ];

    protected function casts(): array
    {
        return [
            'starts_at' => 'datetime',
            'expires_at' => 'datetime',
            'trial_ends_at' => 'datetime',
            'renewal_date' => 'datetime',
            'cancelled_at' => 'datetime',
            'suspended_at' => 'datetime',
            'auto_renewal' => 'boolean',
            'meta' => 'array',
        ];
    }

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    public function plan(): BelongsTo
    {
        return $this->belongsTo(Plan::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(SubscriptionPayment::class);
    }

    public function isUsable(): bool
    {
        if (! in_array($this->status, self::USABLE_STATUSES, true)) {
            return false;
        }

        if ($this->expires_at && $this->expires_at->isPast()) {
            return false;
        }

        if ($this->status === self::STATUS_TRIAL && $this->trial_ends_at && $this->trial_ends_at->isPast()) {
            return false;
        }

        return true;
    }
}
