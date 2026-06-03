<?php

namespace App\Models;

use App\Models\Concerns\BelongsToCompany;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Branch extends Model
{
    use BelongsToCompany, SoftDeletes;

    protected $fillable = [
        'company_id',
        'name',
        'code',
        'address',
        'city',
        'phone',
        'email',
        'is_main',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'is_main' => 'boolean',
            'is_active' => 'boolean',
        ];
    }
}
