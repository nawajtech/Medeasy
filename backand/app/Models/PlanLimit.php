<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PlanLimit extends Model
{
    public const MAX_USERS = 'max_users';

    public const MAX_BRANCHES = 'max_branches';

    public const MAX_STORAGE_MB = 'max_storage_mb';

    public const MAX_PATIENTS = 'max_patients';

    public const MAX_MONTHLY_REPORTS = 'max_monthly_reports';

    public const MAX_API_REQUESTS = 'max_api_requests';

    public const KEYS = [
        self::MAX_USERS,
        self::MAX_BRANCHES,
        self::MAX_STORAGE_MB,
        self::MAX_PATIENTS,
        self::MAX_MONTHLY_REPORTS,
        self::MAX_API_REQUESTS,
    ];

    protected $fillable = [
        'plan_id',
        'limit_key',
        'limit_value',
    ];

    protected function casts(): array
    {
        return [
            'limit_value' => 'integer',
        ];
    }

    public function plan(): BelongsTo
    {
        return $this->belongsTo(Plan::class);
    }
}
