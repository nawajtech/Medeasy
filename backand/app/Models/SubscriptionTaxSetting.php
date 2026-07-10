<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SubscriptionTaxSetting extends Model
{
    protected $fillable = [
        'enabled',
        'mode',
        'rate',
        'inclusive',
        'updated_by',
    ];

    protected function casts(): array
    {
        return [
            'enabled' => 'boolean',
            'rate' => 'decimal:2',
            'inclusive' => 'boolean',
        ];
    }
}
