<?php

namespace App\Models\Concerns;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

trait BelongsToCompany
{
    public static function bootBelongsToCompany(): void
    {
        static::addGlobalScope('company', function (Builder $builder) {
            $user = auth()->user();

            // Unauthenticated queries and patient-portal auth skip tenant scoping.
            // Patient APIs filter by patient_id (and explicit company_id) instead.
            if (! $user || $user instanceof \App\Models\Patient) {
                return;
            }

            if ($user->isSuperAdmin()) {
                return;
            }

            $builder->where(
                $builder->getModel()->getTable().'.company_id',
                $user->company_id
            );
        });

        static::creating(function (Model $model) {
            $user = auth()->user();

            if ($user instanceof \App\Models\User && ! $user->isSuperAdmin() && empty($model->company_id)) {
                $model->company_id = $user->company_id;
            }
        });
    }

    public function company(): BelongsTo
    {
        return $this->belongsTo(\App\Models\Company::class);
    }
}
