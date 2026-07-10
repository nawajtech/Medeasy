<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Feature extends Model
{
    public const PATIENT_MANAGEMENT = 'patient_management';

    public const APPOINTMENT_MANAGEMENT = 'appointment_management';

    public const BILLING = 'billing';

    public const LAB_MODULE = 'lab_module';

    public const DIAGNOSTICS_MODULE = 'diagnostics_module';

    public const PHARMACY = 'pharmacy';

    public const INVENTORY = 'inventory';

    public const MULTI_BRANCH = 'multi_branch';

    public const API_ACCESS = 'api_access';

    public const ANALYTICS = 'analytics';

    public const AI_OCR = 'ai_ocr';

    public const AI_REPORT_EXPLANATION = 'ai_report_explanation';

    public const VOICE_ASSISTANT = 'voice_assistant';

    public const AI_CHAT_ASSISTANT = 'ai_chat_assistant';

    public const KEYS = [
        self::PATIENT_MANAGEMENT,
        self::APPOINTMENT_MANAGEMENT,
        self::BILLING,
        self::LAB_MODULE,
        self::DIAGNOSTICS_MODULE,
        self::PHARMACY,
        self::INVENTORY,
        self::MULTI_BRANCH,
        self::API_ACCESS,
        self::ANALYTICS,
        self::AI_OCR,
        self::AI_REPORT_EXPLANATION,
        self::VOICE_ASSISTANT,
        self::AI_CHAT_ASSISTANT,
    ];

    protected $fillable = [
        'key',
        'name',
        'description',
        'category',
        'is_active',
        'display_order',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'display_order' => 'integer',
        ];
    }

    public function plans(): BelongsToMany
    {
        return $this->belongsToMany(Plan::class, 'plan_features')
            ->withPivot('is_enabled')
            ->withTimestamps();
    }
}
