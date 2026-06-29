<?php

namespace App\Models;

use App\Models\Concerns\BelongsToCompany;
use Illuminate\Database\Eloquent\Model;

class PatientWallet extends Model
{
    use BelongsToCompany;

    protected $fillable = [
        'company_id',
        'patient_id',
        'balance',
    ];

    protected function casts(): array
    {
        return [
            'balance' => 'decimal:2',
        ];
    }

    public function patient()
    {
        return $this->belongsTo(Patient::class);
    }

    public function transactions()
    {
        return $this->hasMany(PatientWalletTransaction::class, 'wallet_id')->orderByDesc('transacted_at');
    }
}
