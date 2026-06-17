<?php

namespace App\Models;

use App\Models\Concerns\BelongsToCompany;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class LabOrder extends Model
{
    use BelongsToCompany, SoftDeletes;

    public const STATUSES = ['pending', 'collected', 'processing', 'resulted', 'verified', 'approved', 'cancelled'];

    protected $fillable = [
        'company_id',
        'branch_id',
        'patient_id',
        'doctor_id',
        'order_number',
        'status',
        'collection_type',
        'home_address',
        'collection_scheduled_at',
        'gross_amount',
        'discount',
        'net_amount',
        'notes',
        'ordered_at',
    ];

    protected function casts(): array
    {
        return [
            'gross_amount' => 'decimal:2',
            'discount' => 'decimal:2',
            'net_amount' => 'decimal:2',
            'ordered_at' => 'datetime',
            'collection_scheduled_at' => 'datetime',
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

    public function company()
    {
        return $this->belongsTo(Company::class);
    }

    public function items()
    {
        return $this->hasMany(LabOrderItem::class, 'order_id');
    }

    public function samples()
    {
        return $this->hasMany(LabSample::class, 'order_id');
    }

    public function results()
    {
        return $this->hasMany(LabResult::class, 'order_id');
    }
}
