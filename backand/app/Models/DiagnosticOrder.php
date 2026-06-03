<?php

namespace App\Models;

use App\Models\Concerns\BelongsToCompany;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class DiagnosticOrder extends Model
{
    use BelongsToCompany, SoftDeletes;

    public const STATUSES = ['booked', 'scheduled', 'in_progress', 'completed', 'cancelled'];

    protected $fillable = [
        'company_id',
        'patient_id',
        'doctor_id',
        'test_type_id',
        'order_number',
        'status',
        'technician_id',
        'scheduled_at',
        'amount',
        'priority',
        'clinical_notes',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'scheduled_at' => 'datetime',
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

    public function testType()
    {
        return $this->belongsTo(DiagnosticTestType::class, 'test_type_id');
    }

    public function technician()
    {
        return $this->belongsTo(User::class, 'technician_id');
    }

    public function report()
    {
        return $this->hasOne(DiagnosticReport::class, 'order_id');
    }

    public function company()
    {
        return $this->belongsTo(Company::class);
    }
}
