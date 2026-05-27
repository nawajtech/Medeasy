<?php

namespace App\Models;

use App\Models\Concerns\BelongsToCompany;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Appointment extends Model
{
    use BelongsToCompany, SoftDeletes;

    protected $fillable = [
        'company_id',
        'patient_id',
        'doctor_id',
        'appointment_date',
        'duration_minutes',
        'status',
        'reason',
        'notes',
        'prescription',
    ];

    protected function casts(): array
    {
        return [
            'appointment_date' => 'datetime',
            'duration_minutes' => 'integer',
        ];
    }

    public function patient()
    {
        return $this->belongsTo(Patient::class);
    }

    public function doctor()
    {
        return $this->belongsTo(Doctor::class);
    }

    public function billing()
    {
        return $this->hasOne(Billing::class);
    }

    public function vitals()
    {
        return $this->hasOne(AppointmentVital::class);
    }
}
