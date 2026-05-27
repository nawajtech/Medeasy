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

            if (! $user || $user->isSuperAdmin()) {
                return;
            }

            $builder->where(
                $builder->getModel()->getTable().'.company_id',
                $user->company_id
            );
        });

        static::creating(function (Model $model) {
            $user = auth()->user();

            if ($user && ! $user->isSuperAdmin() && empty($model->company_id)) {
                $model->company_id = $user->company_id;
            }
        });
    }

    public function company(): BelongsTo
    {
        return $this->belongsTo(\App\Models\Company::class);
    }
}
