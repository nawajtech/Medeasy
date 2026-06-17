<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SubscriptionPlan extends Model
{
    protected $fillable = [
        'name',
        'code',
        'description',
        'price_monthly',
        'price_yearly',
        'max_users',
        'max_doctors',
        'max_branches',
        'features',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'price_monthly' => 'decimal:2',
            'price_yearly' => 'decimal:2',
            'features' => 'array',
            'is_active' => 'boolean',
        ];
    }

    public function subscriptions()
    {
        return $this->hasMany(CompanySubscription::class, 'plan_id');
    }
}
