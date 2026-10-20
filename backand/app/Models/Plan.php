<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Plan extends Model
{
    public const STATUS_ACTIVE = 'active';

    public const STATUS_INACTIVE = 'inactive';

    /** Plan can be purchased / assigned normally. */
    public const AVAILABILITY_AVAILABLE = 'available';

    /** Visible on pricing, but not open for purchase yet. */
    public const AVAILABILITY_COMING_SOON = 'coming_soon';

    /** Shown as in progress (e.g. automation / AI work underway). */
    public const AVAILABILITY_IN_DEVELOPMENT = 'in_development';

    public const AVAILABILITIES = [
        self::AVAILABILITY_AVAILABLE,
        self::AVAILABILITY_COMING_SOON,
        self::AVAILABILITY_IN_DEVELOPMENT,
    ];

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
        'tax_enabled',
        'tax_mode',
        'tax_rate',
        'tax_inclusive',
        'trial_days',
        'status',
        'availability',
        'availability_note',
        'display_order',
    ];

    protected function casts(): array
    {
        return [
            'monthly_price' => 'decimal:2',
            'yearly_price' => 'decimal:2',
            'discount_percent' => 'integer',
            'tax_enabled' => 'boolean',
            'tax_rate' => 'decimal:2',
            'tax_inclusive' => 'boolean',
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

    public function isPurchasable(): bool
    {
        return $this->status === self::STATUS_ACTIVE
            && ($this->availability ?? self::AVAILABILITY_AVAILABLE) === self::AVAILABILITY_AVAILABLE;
    }

    public function availabilityLabel(): string
    {
        return match ($this->availability ?? self::AVAILABILITY_AVAILABLE) {
            self::AVAILABILITY_COMING_SOON => 'Coming soon',
            self::AVAILABILITY_IN_DEVELOPMENT => 'In development',
            default => 'Available',
        };
    }
}
