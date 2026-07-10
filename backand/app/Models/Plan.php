<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Plan extends Model
{
    public const STATUS_ACTIVE = 'active';

    public const STATUS_INACTIVE = 'inactive';

    public const CODE_BASIC = 'basic';

    public const CODE_PREMIUM = 'premium';

    public const CODE_ENTERPRISE = 'enterprise';

    public const CODE_AI_GOLD = 'ai_gold';

    protected $fillable = [
        'name',
        'code',
        'description',
        'monthly_price',
        'yearly_price',
        'discount_percent',
        'currency',
        'trial_days',
        'status',
        'display_order',
    ];

    protected function casts(): array
    {
        return [
            'monthly_price' => 'decimal:2',
            'yearly_price' => 'decimal:2',
            'discount_percent' => 'integer',
            'trial_days' => 'integer',
            'display_order' => 'integer',
        ];
    }

    public function subscriptions(): HasMany
    {
        return $this->hasMany(Subscription::class);
    }

    public function limits(): HasMany
    {
        return $this->hasMany(PlanLimit::class);
    }

    public function features(): BelongsToMany
    {
        return $this->belongsToMany(Feature::class, 'plan_features')
            ->withPivot('is_enabled')
            ->withTimestamps();
    }

    public function enabledFeatures(): BelongsToMany
    {
        return $this->features()->wherePivot('is_enabled', true);
    }

    public function baseAmount(string $billingCycle): float
    {
        return (float) ($billingCycle === 'yearly'
            ? $this->yearly_price
            : $this->monthly_price);
    }

    public function discountedAmount(string $billingCycle): float
    {
        $base = $this->baseAmount($billingCycle);
        $discount = min(100, max(0, (int) ($this->discount_percent ?? 0)));

        return round($base * (1 - $discount / 100), 2);
    }
}
