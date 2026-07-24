<?php

namespace App\Models;

use App\Models\Concerns\BelongsToCompany;
use App\Support\S3Storage;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Appointment extends Model
{
    use BelongsToCompany, SoftDeletes;

    protected $fillable = [
        'company_id',
        'branch_id',
        'patient_id',
        'doctor_id',
        'appointment_date',
        'duration_minutes',
        'status',
        'reason',
        'notes',
        'prescription',
        'prescription_data',
        'prescription_type',
        'prescription_file',
    ];

    protected $appends = ['prescription_file_url'];

    protected function casts(): array
    {
        return [
            'appointment_date' => 'datetime',
            'duration_minutes' => 'integer',
            'prescription_data' => 'array',
        ];
    }

    public function branch()
    {
        return $this->belongsTo(Branch::class);
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

    public function getPrescriptionFileUrlAttribute(): ?string
    {
        if (! $this->prescription_file) {
            return null;
        }

        return S3Storage::url($this->prescription_file);
    }
}
