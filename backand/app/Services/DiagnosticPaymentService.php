<?php

namespace App\Services;

use App\Models\DiagnosticOrder;
use App\Models\DiagnosticOrderPayment;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class DiagnosticPaymentService
{
    public const STATUSES = ['pending', 'partial', 'paid'];

    public function payableAmount(DiagnosticOrder $order): float
    {
        return (float) ($order->grand_total ?: $order->net_amount ?: $order->amount ?: 0);
    }

    public function compute(float $netAmount, float $paidAmount): array
    {
        $net = round(max(0, $netAmount), 2);
        $paid = round(min($net, max(0, $paidAmount)), 2);
        $due = round(max(0, $net - $paid), 2);

        $status = 'pending';
        if ($net > 0 && $due <= 0) {
            $status = 'paid';
        } elseif ($paid > 0 && $due > 0) {
            $status = 'partial';
        }

        return [
            'paid_amount' => $paid,
            'due_amount' => $due,
            'payment_status' => $status,
        ];
    }

    public function applyInitialPayment(
        DiagnosticOrder $order,
        float $paidAmount,
        ?string $method = null,
        ?string $reference = null,
        ?string $notes = null,
    ): DiagnosticOrder {
        $net = $this->payableAmount($order);

        if ($paidAmount > $net) {
            throw new InvalidArgumentException('Paid amount cannot exceed payable amount.');
        }

        if ($paidAmount <= 0) {
            $totals = $this->compute($net, 0);
            $order->update($totals);

            return $order->fresh();
        }

        if ($method === 'wallet') {
            return $this->applyWalletPayment($order, $paidAmount, $reference, $notes, isInitial: true);
        }

        return DB::transaction(function () use ($order, $paidAmount, $method, $reference, $notes, $net) {
            $totals = $this->compute($net, $paidAmount);

            $order->update([
                ...$totals,
                'payment_method' => $method,
            ]);

            $this->createPaymentRecord($order, $paidAmount, $method, $reference, $notes);

            return $order->fresh();
        });
    }

    public function recordPayment(
        DiagnosticOrder $order,
        float $amount,
        ?string $method = null,
        ?string $reference = null,
        ?string $notes = null,
        ?\DateTimeInterface $paidAt = null,
    ): DiagnosticOrder {
        if ($order->status === 'cancelled') {
            throw new InvalidArgumentException('Cancelled orders cannot accept payments.');
        }

        $due = (float) ($order->due_amount ?? 0);
        if ($due <= 0) {
            throw new InvalidArgumentException('This order is already fully paid.');
        }

        if ($amount <= 0) {
            throw new InvalidArgumentException('Payment amount must be greater than zero.');
        }

        if ($amount > $due) {
            throw new InvalidArgumentException('Payment cannot exceed due amount.');
        }

        if ($method === 'wallet') {
            return $this->applyWalletPayment($order, $amount, $reference, $notes, isInitial: false, paidAt: $paidAt);
        }

        return DB::transaction(function () use ($order, $amount, $method, $reference, $notes, $paidAt) {
            $net = $this->payableAmount($order);
            $newPaid = round((float) $order->paid_amount + $amount, 2);
            $totals = $this->compute($net, $newPaid);

            $order->update([
                ...$totals,
                'payment_method' => $method ?: $order->payment_method,
            ]);

            $this->createPaymentRecord($order, $amount, $method, $reference, $notes, $paidAt);

            return $order->fresh();
        });
    }

    private function applyWalletPayment(
        DiagnosticOrder $order,
        float $amount,
        ?string $reference,
        ?string $notes,
        bool $isInitial,
        ?\DateTimeInterface $paidAt = null,
    ): DiagnosticOrder {
        $order->loadMissing('patient');
        if (! $order->patient) {
            throw new InvalidArgumentException('Patient is required for wallet payments.');
        }

        return DB::transaction(function () use ($order, $amount, $reference, $notes, $isInitial, $paidAt) {
            $payment = $this->createPaymentRecord($order, $amount, 'wallet', $reference, $notes, $paidAt);

            app(PatientWalletService::class)->debit(
                $order->patient,
                $amount,
                'payment_debit',
                'wallet',
                $reference,
                $notes ?: "Payment for order {$order->order_number}",
                DiagnosticOrderPayment::class,
                $payment->id,
            );

            $net = $this->payableAmount($order);
            $newPaid = $isInitial ? $amount : round((float) $order->paid_amount + $amount, 2);
            $totals = $this->compute($net, $newPaid);

            $order->update([
                ...$totals,
                'payment_method' => 'wallet',
            ]);

            return $order->fresh();
        });
    }

    private function createPaymentRecord(
        DiagnosticOrder $order,
        float $amount,
        ?string $method,
        ?string $reference,
        ?string $notes,
        ?\DateTimeInterface $paidAt = null,
    ): DiagnosticOrderPayment {
        return DiagnosticOrderPayment::create([
            'diagnostic_order_id' => $order->id,
            'company_id' => $order->company_id,
            'amount' => round($amount, 2),
            'refunded_amount' => 0,
            'payment_method' => $method,
            'reference' => $reference,
            'notes' => $notes,
            'recorded_by' => auth()->id(),
            'paid_at' => $paidAt ?? now(),
        ]);
    }
}
