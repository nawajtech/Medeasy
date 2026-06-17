<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Company extends Model
{
    use SoftDeletes;

    public const TYPES = [
        'clinic'            => 'Clinic',
        'diagnostic_center' => 'Diagnostic Center',
        'pathology_lab'     => 'Pathology Lab',
        'hospital'          => 'Hospital',
        'pharmacy'          => 'Pharmacy',
    ];

    protected $fillable = [
        'name',
        'code',
        'type',
        'phone',
        'email',
        'address',
        'city',
        'state',
        'country',
        'website',
        'description',
        'logo_url',
        'gst_number',
        'registration_number',
        'currency',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
        ];
    }

    public function getTypeLabelAttribute(): string
    {
        return self::TYPES[$this->type] ?? ucfirst($this->type ?? 'Clinic');
    }

    public function users()
    {
        return $this->hasMany(User::class);
    }

    public function doctors()
    {
        return $this->hasMany(Doctor::class);
    }

    public function patients()
    {
        return $this->hasMany(Patient::class);
    }

    public function appointments()
    {
        return $this->hasMany(Appointment::class);
    }

    public function departments()
    {
        return $this->hasMany(Department::class);
    }

    public function branches()
    {
        return $this->hasMany(Branch::class);
    }

    public function subscriptions()
    {
        return $this->hasMany(CompanySubscription::class);
    }

    public function activeSubscription()
    {
        return $this->hasOne(CompanySubscription::class)->where('status', 'active')->latest();
    }
}
