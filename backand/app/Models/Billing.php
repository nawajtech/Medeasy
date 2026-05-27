<?php

namespace App\Models;

use App\Models\Concerns\BelongsToCompany;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Billing extends Model
{
    use BelongsToCompany, SoftDeletes;

    protected $fillable = [
        'company_id',
        'patient_id',
        'appointment_id',
        'invoice_number',
        'previous_due',
        'charge_amount',
        'paid_amount',
        'total_amount',
        'due_amount',
        'status',
        'payment_method',
        'billed_at',
        'paid_at',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'previous_due' => 'decimal:2',
            'charge_amount' => 'decimal:2',
            'paid_amount' => 'decimal:2',
            'total_amount' => 'decimal:2',
            'due_amount' => 'decimal:2',
            'billed_at' => 'date',
            'paid_at' => 'date',
        ];
    }

    public function patient()
    {
        return $this->belongsTo(Patient::class);
    }

    public function appointment()
    {
        return $this->belongsTo(Appointment::class);
    }

    public static function outstandingForPatient(int $patientId, ?int $excludeBillingId = null): float
    {
        $query = static::where('patient_id', $patientId)->orderByDesc('id');

        if ($excludeBillingId) {
            $query->where('id', '!=', $excludeBillingId);
        }

        return (float) ($query->value('due_amount') ?? 0);
    }

    public static function computeTotals(float $previousDue, float $chargeAmount, float $paidAmount): array
    {
        $total = round($previousDue + $chargeAmount, 2);
        $due = round(max(0, $total - $paidAmount), 2);

        $status = 'pending';
        if ($due <= 0 && $total > 0) {
            $status = 'paid';
        } elseif ($paidAmount > 0 && $due > 0) {
            $status = 'partial';
        } elseif ($due > 0) {
            $status = 'pending';
        }

        return [
            'previous_due' => round($previousDue, 2),
            'charge_amount' => round($chargeAmount, 2),
            'paid_amount' => round($paidAmount, 2),
            'total_amount' => $total,
            'due_amount' => $due,
            'status' => $status,
        ];
    }
}
