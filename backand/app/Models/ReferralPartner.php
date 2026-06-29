<?php

namespace App\Models;

use App\Models\Concerns\BelongsToCompany;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class ReferralPartner extends Model
{
    use BelongsToCompany, SoftDeletes;

    public const TYPES = ['doctor', 'clinic', 'hospital', 'agent'];

    public const SURCHARGE_TYPES = ['fixed', 'percentage'];

    protected $fillable = [
        'company_id',
        'name',
        'phone',
        'address',
        'type',
        'referral_code',
        'surcharge_type',
        'surcharge_value',
        'status',
    ];

    protected $appends = ['mobile', 'is_active'];

    protected static function booted(): void
    {
        static::creating(function (ReferralPartner $partner) {
            if (empty($partner->referral_code)) {
                $partner->referral_code = self::generateReferralCode($partner);
            }
        });
    }

    public static function generateReferralCode(ReferralPartner $partner): string
    {
        $slug = strtoupper(Str::slug($partner->name ?: 'ref', ''));
        $prefix = substr($slug, 0, 4) ?: 'REF';
        $code = $prefix.str_pad((string) random_int(1, 9999), 4, '0', STR_PAD_LEFT);

        while (self::withoutGlobalScopes()->where('referral_code', $code)->exists()) {
            $code = $prefix.str_pad((string) random_int(1, 9999), 4, '0', STR_PAD_LEFT);
        }

        return $code;
    }

    protected function casts(): array
    {
        return [
            'surcharge_value' => 'decimal:2',
        ];
    }

    protected function mobile(): Attribute
    {
        return Attribute::make(
            get: fn () => $this->attributes['phone'] ?? null,
            set: fn (?string $value) => ['phone' => $value],
        );
    }

    protected function isActive(): Attribute
    {
        return Attribute::make(
            get: fn () => ($this->attributes['status'] ?? 'active') === 'active',
            set: fn (bool $value) => ['status' => $value ? 'active' : 'inactive'],
        );
    }

    public function payouts()
    {
        return $this->hasMany(ReferralCommissionPayout::class, 'referral_partner_id');
    }

    public function orders()
    {
        return $this->hasMany(DiagnosticOrder::class);
    }
}
