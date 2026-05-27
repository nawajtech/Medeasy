<?php

namespace App\Models;

use App\Models\Concerns\BelongsToCompany;
use Illuminate\Database\Eloquent\Model;

class DoctorAvailability extends Model
{
    use BelongsToCompany;

    public const DAY_LABELS = [
        0 => 'Sunday',
        1 => 'Monday',
        2 => 'Tuesday',
        3 => 'Wednesday',
        4 => 'Thursday',
        5 => 'Friday',
        6 => 'Saturday',
    ];

    public const SLOT_DURATIONS = [15, 20, 30, 45, 60];

    protected $fillable = [
        'company_id',
        'doctor_id',
        'day_of_week',
        'start_time',
        'end_time',
        'slot_duration',
        'max_patients',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'day_of_week' => 'integer',
            'slot_duration' => 'integer',
            'max_patients' => 'integer',
            'is_active' => 'boolean',
        ];
    }

    public function doctor()
    {
        return $this->belongsTo(Doctor::class);
    }

    public function getDayLabelAttribute(): string
    {
        return self::DAY_LABELS[$this->day_of_week] ?? 'Day '.$this->day_of_week;
    }
}
