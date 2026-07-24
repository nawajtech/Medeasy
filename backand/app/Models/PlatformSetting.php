<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PlatformSetting extends Model
{
    protected $fillable = [
        'values',
        'updated_by',
    ];

    protected function casts(): array
    {
        return [
            'values' => 'array',
        ];
    }

    public static function current(): self
    {
        return static::query()->firstOrCreate(['id' => 1], [
            'values' => [],
        ]);
    }
}
