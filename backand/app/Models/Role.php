<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Spatie\Permission\Models\Role as SpatieRole;

class Role extends SpatieRole
{
    protected $guard_name = 'web';

    protected $fillable = [
        'name',
        'guard_name',
        'company_id',
        'description',
        'is_system',
    ];

    protected function casts(): array
    {
        return [
            'is_system' => 'boolean',
            'company_id' => 'integer',
        ];
    }

    public function company()
    {
        return $this->belongsTo(Company::class);
    }

    protected static function booted(): void
    {
        static::addGlobalScope('tenant_company', function (Builder $builder) {
            $user = auth()->user();

            if ($user && $user->isTenantUser() && $user->company_id) {
                $builder->where($builder->getModel()->getTable().'.company_id', $user->company_id);
            }
        });

        static::creating(function (Role $role) {
            $user = auth()->user();

            if ($user && $user->isTenantUser() && empty($role->company_id)) {
                $role->company_id = $user->company_id;
            }
        });
    }

    public function scopeForCompany(Builder $query, ?int $companyId): Builder
    {
        return $query->where('company_id', $companyId);
    }

    public function resolveRouteBinding($value, $field = null)
    {
        $query = static::where($field ?? $this->getRouteKeyName(), $value);
        $user = auth()->user();

        if ($user && ! $user->isSuperAdmin()) {
            $query->where('company_id', $user->company_id);
        }

        return $query->firstOrFail();
    }
}
