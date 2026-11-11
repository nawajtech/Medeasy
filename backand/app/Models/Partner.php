<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Laravel\Sanctum\HasApiTokens;

class Partner extends Authenticatable
{
    use HasApiTokens, SoftDeletes;

    public const TYPES = ['doctor', 'clinic', 'hospital', 'agent'];

    protected $fillable = [
        'name',
        'type',
        'phone',
        'email',
        'password',
        'address',
        'city',
        'state',
        'professional_details',
        'phone_verified_at',
        'status',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'password' => 'hashed',
            'status' => 'boolean',
            'phone_verified_at' => 'datetime',
        ];
    }

    public function centreRequests(): HasMany
    {
        return $this->hasMany(PartnerCentreRequest::class);
    }

    public function referralRelationships(): HasMany
    {
        return $this->hasMany(ReferralPartner::class, 'partner_account_id');
    }

    public function isSuperAdmin(): bool
    {
        return false;
    }
}
