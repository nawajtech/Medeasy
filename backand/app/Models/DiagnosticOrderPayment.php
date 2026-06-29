<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DiagnosticOrderPayment extends Model
{
    public const METHODS = ['cash', 'upi', 'card', 'bank', 'wallet', 'other'];

    protected $fillable = [
        'diagnostic_order_id',
        'company_id',
        'amount',
        'refunded_amount',
        'payment_method',
        'reference',
        'notes',
        'recorded_by',
        'paid_at',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'refunded_amount' => 'decimal:2',
            'paid_at' => 'datetime',
        ];
    }

    public function order()
    {
        return $this->belongsTo(DiagnosticOrder::class, 'diagnostic_order_id');
    }

    public function recorder()
    {
        return $this->belongsTo(User::class, 'recorded_by');
    }

    public function refunds()
    {
        return $this->hasMany(DiagnosticOrderRefund::class, 'diagnostic_order_payment_id');
    }

    public function refundableAmount(): float
    {
        return round(max(0, (float) $this->amount - (float) ($this->refunded_amount ?? 0)), 2);
    }
}
