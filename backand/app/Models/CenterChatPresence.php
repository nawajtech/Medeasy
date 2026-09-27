<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CenterChatPresence extends Model
{
    protected $fillable = [
        'actor_type',
        'actor_id',
        'company_id',
        'last_seen_at',
    ];

    protected function casts(): array
    {
        return [
            'last_seen_at' => 'datetime',
        ];
    }
}
