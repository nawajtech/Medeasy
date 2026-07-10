<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ThemeSetting extends Model
{
    protected $fillable = [
        'colors',
        'updated_by',
    ];

    protected function casts(): array
    {
        return [
            'colors' => 'array',
        ];
    }
}
