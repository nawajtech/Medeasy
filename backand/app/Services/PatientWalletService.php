<?php

namespace App\Services;

use App\Models\DiagnosticOrder;
use App\Models\DiagnosticOrderPayment;
use App\Models\DiagnosticOrderRefund;
use App\Models\Patient;
use App\Models\PatientWallet;
use App\Models\PatientWalletTransaction;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class PatientWalletService
{
    public function ensureWallet(Patient $patient): PatientWallet
    {
        return PatientWallet::firstOrCreate(
            ['patient_id' => $patient->id],
            ['company_id' => $patient->company_id, 'balance' => 0]
        );
    }

    public function summary(Patient $patient): array
    {
        $wallet = $this->ensureWallet($patient);

        $transactions = PatientWalletTransaction::query()
            ->where('patient_id', $patient->id)
            ->with('recorder:id,name')
            ->orderByDesc('transacted_at')
            ->limit(100)
            ->get()
            ->map(fn (PatientWalletTransaction $t) => [
                'id' => $t->id,
                'type' => $t->type,
                'amount' => (float) $t->amount,
                'balance_after' => (float) $t->balance_after,
                'method' => $t->method,
                'reference' => $t->reference,
                'notes' => $t->notes,
                'related_type' => $t->related_type,
                'related_id' => $t->related_id,
                'transacted_at' => $t->transacted_at?->toIso8601String(),
                'recorded_by' => $t->recorder?->name,
            ]);

        return [
            'balance' => round((float) $wallet->balance, 2),
            'transactions' => $transactions,
        ];
    }

    public function credit(
        Patient $patient,
        float $amount,
        string $type,
        ?string $method = null,
        ?string $reference = null,
        ?string $notes = null,
        ?string $relatedType = null,
        ?int $relatedId = null,
    ): PatientWalletTransaction {
        if ($amount <= 0) {
            throw new InvalidArgumentException('Credit amount must be greater than zero.');
        }

        return DB::transaction(function () use ($patient, $amount, $type, $method, $reference, $notes, $relatedType, $relatedId) {
            $wallet = PatientWallet::where('patient_id', $patient->id)->lockForUpdate()->first()
                ?? $this->ensureWallet($patient)->fresh();

            $wallet = PatientWallet::where('id', $wallet->id)->lockForUpdate()->first();
            $newBalance = round((float) $wallet->balance + $amount, 2);
            $wallet->update(['balance' => $newBalance]);

            return PatientWalletTransaction::create([
                'company_id' => $patient->company_id,
                'patient_id' => $patient->id,
                'wallet_id' => $wallet->id,
                'type' => $type,
                'amount' => round($amount, 2),
                'balance_after' => $newBalance,
                'method' => $method,
                'reference' => $reference,
                'notes' => $notes,
                'related_type' => $relatedType,
                'related_id' => $relatedId,
                'recorded_by' => auth()->id(),
                'transacted_at' => now(),
            ]);
        });
    }

    public function debit(
        Patient $patient,
        float $amount,
        string $type,
        ?string $method = null,
        ?string $reference = null,
        ?string $notes = null,
        ?string $relatedType = null,
        ?int $relatedId = null,
    ): PatientWalletTransaction {
        if ($amount <= 0) {
            throw new InvalidArgumentException('Debit amount must be greater than zero.');
        }

        return DB::transaction(function () use ($patient, $amount, $type, $method, $reference, $notes, $relatedType, $relatedId) {
            $wallet = PatientWallet::where('patient_id', $patient->id)->lockForUpdate()->first()
                ?? $this->ensureWallet($patient)->fresh();

            $wallet = PatientWallet::where('id', $wallet->id)->lockForUpdate()->first();

            if ((float) $wallet->balance < $amount) {
                throw new InvalidArgumentException('Insufficient wallet balance.');
            }

            $newBalance = round((float) $wallet->balance - $amount, 2);
            $wallet->update(['balance' => $newBalance]);

            return PatientWalletTransaction::create([
                'company_id' => $patient->company_id,
                'patient_id' => $patient->id,
                'wallet_id' => $wallet->id,
                'type' => $type,
                'amount' => round($amount, 2),
                'balance_after' => $newBalance,
                'method' => $method,
                'reference' => $reference,
                'notes' => $notes,
                'related_type' => $relatedType,
                'related_id' => $relatedId,
                'recorded_by' => auth()->id(),
                'transacted_at' => now(),
            ]);
        });
    }

    public function refundDiagnosticPayment(
        DiagnosticOrder $order,
        DiagnosticOrderPayment $payment,
        float $amount,
        string $refundMethod,
        ?string $reference = null,
        ?string $notes = null,
    ): array {
        if (! in_array($refundMethod, DiagnosticOrderRefund::METHODS, true)) {
            throw new InvalidArgumentException('Invalid refund method.');
        }

        if ($refundMethod === 'online' && ! filled($reference)) {
            throw new InvalidArgumentException('Reference number is required for online refunds.');
        }

        if ((int) $payment->diagnostic_order_id !== (int) $order->id) {
            throw new InvalidArgumentException('Payment does not belong to this order.');
        }

        $refundable = round((float) $payment->amount - (float) ($payment->refunded_amount ?? 0), 2);
        if ($amount <= 0 || $amount > $refundable) {
            throw new InvalidArgumentException("Refund amount cannot exceed refundable balance (₹{$refundable}).");
        }

        if ((float) $order->paid_amount < $amount) {
            throw new InvalidArgumentException('Refund exceeds order paid amount.');
        }

        $patient = $order->patient ?? Patient::findOrFail($order->patient_id);

        return DB::transaction(function () use ($order, $payment, $amount, $refundMethod, $reference, $notes, $patient) {
            $refund = DiagnosticOrderRefund::create([
                'company_id' => $order->company_id,
                'diagnostic_order_id' => $order->id,
                'diagnostic_order_payment_id' => $payment->id,
                'patient_id' => $patient->id,
                'amount' => round($amount, 2),
                'refund_method' => $refundMethod,
                'reference' => $reference,
                'notes' => $notes,
                'recorded_by' => auth()->id(),
                'refunded_at' => now(),
            ]);

            $payment->update([
                'refunded_amount' => round((float) $payment->refunded_amount + $amount, 2),
            ]);

            $newPaid = round(max(0, (float) $order->paid_amount - $amount), 2);
            $totals = app(DiagnosticPaymentService::class)->compute(
                (float) ($order->net_amount ?? $order->amount ?? 0),
                $newPaid
            );
            $order->update($totals);

            $walletTx = null;
            if ($refundMethod === 'wallet') {
                $walletTx = $this->credit(
                    $patient,
                    $amount,
                    'refund_credit',
                    'wallet',
                    $reference,
                    $notes ?: "Refund for order {$order->order_number}",
                    DiagnosticOrderRefund::class,
                    $refund->id,
                );
            }

            return [
                'refund' => $refund->load('recorder:id,name'),
                'order' => $order->fresh(),
                'payment' => $payment->fresh(),
                'wallet_transaction' => $walletTx,
            ];
        });
    }
}
