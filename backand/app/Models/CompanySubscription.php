<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CompanySubscription extends Model
{
    protected $fillable = [
        'company_id',
        'plan_id',
        'status',
        'starts_at',
        'expires_at',
        'meta',
    ];

    protected function casts(): array
    {
        return [
            'starts_at' => 'datetime',
            'expires_at' => 'datetime',
            'meta' => 'array',
        ];
    }

    public function company()
    {
        return $this->belongsTo(Company::class);
    }

    public function plan()
    {
        return $this->belongsTo(SubscriptionPlan::class, 'plan_id');
    }
}
