<?php

namespace App\Models;

use App\Models\Concerns\BelongsToCompany;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class DiagnosticOrder extends Model
{
    use BelongsToCompany, SoftDeletes;

    public const STATUSES = [
        'booked', 'scheduled', 'in_progress', 'completed', 'not_present', 'cancelled',
    ];

    protected $fillable = [
        'company_id',
        'branch_id',
        'patient_id',
        'doctor_id',
        'test_type_id',
        'package_id',
        'order_number',
        'status',
        'technician_id',
        'scheduled_at',
        'queue_serial',
        'amount',
        'referral_partner_id',
        'referral_partner_name',
        'referral_partner_mobile',
        'referral_partner_address',
        'referral_partner_type',
        'deduct_commission_from_bill',
        'gross_amount',
        'referral_commission_amount',
        'doctor_commission_amount',
        'referral_discount',
        'package_discount',
        'surcharge_amount',
        'net_amount',
        'paid_amount',
        'due_amount',
        'payment_status',
        'payment_method',
        'priority',
        'clinical_notes',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'gross_amount' => 'decimal:2',
            'referral_commission_amount' => 'decimal:2',
            'doctor_commission_amount' => 'decimal:2',
            'referral_discount' => 'decimal:2',
            'package_discount' => 'decimal:2',
            'surcharge_amount' => 'decimal:2',
            'net_amount' => 'decimal:2',
            'paid_amount' => 'decimal:2',
            'due_amount' => 'decimal:2',
            'deduct_commission_from_bill' => 'boolean',
            'scheduled_at' => 'datetime',
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

    public function testType()
    {
        return $this->belongsTo(DiagnosticTestType::class, 'test_type_id');
    }

    public function package()
    {
        return $this->belongsTo(DiagnosticPackage::class, 'package_id');
    }

    public function referralPartner()
    {
        return $this->belongsTo(ReferralPartner::class);
    }

    public function technician()
    {
        return $this->belongsTo(User::class, 'technician_id');
    }

    public function report()
    {
        return $this->hasOne(DiagnosticReport::class, 'order_id');
    }

    public function payments()
    {
        return $this->hasMany(DiagnosticOrderPayment::class, 'diagnostic_order_id')->orderByDesc('paid_at');
    }

    public function refunds()
    {
        return $this->hasMany(DiagnosticOrderRefund::class, 'diagnostic_order_id')->orderByDesc('refunded_at');
    }

    public function company()
    {
        return $this->belongsTo(Company::class);
    }
}
