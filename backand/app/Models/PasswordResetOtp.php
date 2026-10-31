<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PasswordResetOtp extends Model
{
    protected $fillable = [
        'email',
        'code_hash',
        'attempts',
        'expires_at',
        'verified_at',
        'reset_token_hash',
        'reset_expires_at',
        'used_at',
    ];

    protected $hidden = [
        'code_hash',
        'reset_token_hash',
    ];

    protected function casts(): array
    {
        return [
            'attempts' => 'integer',
            'expires_at' => 'datetime',
            'verified_at' => 'datetime',
            'reset_expires_at' => 'datetime',
            'used_at' => 'datetime',
        ];
    }
}
