<?php

namespace App\Models;

use App\Models\Concerns\BelongsToCompany;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class AuditLog extends Model
{
    use BelongsToCompany;

    public $timestamps = false;

    protected $fillable = [
        'company_id',
        'branch_id',
        'user_id',
        'user_name',
        'user_email',
        'action',
        'module',
        'auditable_type',
        'auditable_id',
        'auditable_label',
        'old_values',
        'new_values',
        'metadata',
        'ip_address',
        'user_agent',
        'device',
        'browser',
        'url',
        'created_at',
    ];

    protected function casts(): array
    {
        return [
            'old_values' => 'array',
            'new_values' => 'array',
            'metadata' => 'array',
            'created_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function auditable(): MorphTo
    {
        return $this->morphTo();
    }
}
