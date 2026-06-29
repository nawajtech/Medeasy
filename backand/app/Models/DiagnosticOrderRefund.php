<?php

namespace App\Models;

use App\Models\Concerns\BelongsToCompany;
use Illuminate\Database\Eloquent\Model;

class DiagnosticOrderRefund extends Model
{
    use BelongsToCompany;

    public const METHODS = ['cash', 'online', 'wallet'];

    protected $fillable = [
        'company_id',
        'diagnostic_order_id',
        'diagnostic_order_payment_id',
        'patient_id',
        'amount',
        'refund_method',
        'reference',
        'notes',
        'recorded_by',
        'refunded_at',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'refunded_at' => 'datetime',
        ];
    }

    public function order()
    {
        return $this->belongsTo(DiagnosticOrder::class, 'diagnostic_order_id');
    }

    public function payment()
    {
        return $this->belongsTo(DiagnosticOrderPayment::class, 'diagnostic_order_payment_id');
    }

    public function patient()
    {
        return $this->belongsTo(Patient::class);
    }

    public function recorder()
    {
        return $this->belongsTo(User::class, 'recorded_by');
    }
}
