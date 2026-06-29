<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PatientWalletTransaction extends Model
{
    public const TYPES = [
        'refund_credit',
        'payment_debit',
        'manual_credit',
        'manual_debit',
    ];

    protected $fillable = [
        'company_id',
        'patient_id',
        'wallet_id',
        'type',
        'amount',
        'balance_after',
        'method',
        'reference',
        'notes',
        'related_type',
        'related_id',
        'recorded_by',
        'transacted_at',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'balance_after' => 'decimal:2',
            'transacted_at' => 'datetime',
        ];
    }

    public function wallet()
    {
        return $this->belongsTo(PatientWallet::class, 'wallet_id');
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
