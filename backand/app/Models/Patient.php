<?php

namespace App\Models;

use App\Models\Concerns\BelongsToCompany;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Patient extends Model
{
    use BelongsToCompany, SoftDeletes;

    protected $fillable = [
        'company_id',
        'patient_code',
        'name',
        'email',
        'phone',
        'password',
        'status',
        'gender',
        'date_of_birth',
        'blood_group',
        'height',
        'weight',
        'address',
        'emergency_contact_name',
        'emergency_contact_phone',
        'allergies',
        'medical_history',
    ];

    protected $hidden = [
        'password',
    ];

    protected function casts(): array
    {
        return [
            'date_of_birth' => 'date',
            'status' => 'boolean',
            'password' => 'hashed',
            'height' => 'decimal:2',
            'weight' => 'decimal:2',
        ];
    }

    public function appointments()
    {
        return $this->hasMany(Appointment::class);
    }

    public function labOrders()
    {
        return $this->hasMany(LabOrder::class);
    }

    public function diagnosticOrders()
    {
        return $this->hasMany(DiagnosticOrder::class);
    }

    public function billings()
    {
        return $this->hasMany(Billing::class);
    }
}
