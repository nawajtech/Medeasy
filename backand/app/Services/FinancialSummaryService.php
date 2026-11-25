<?php

namespace App\Services;

use App\Models\DiagnosticOrder;
use App\Models\Doctor;
use App\Models\Expense;
use App\Models\LabOrder;
use App\Models\ReferralCommissionPayout;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;

class FinancialSummaryService
{
    /**
     * @param  array{company_id: int, branch_id?: int|null, doctor_id?: int|null}  $filters
     */
    public function summary(array $filters, Carbon $from, Carbon $to, array $scope = []): array
    {
        $gains = $this->gainsBreakdown($filters, $from, $to);
        $expenses = $this->expensesBreakdown($filters, $from, $to);

        $totalGains = round(
            $gains['diagnostic_orders']
            + $gains['lab_orders'],
            2
        );

        $totalExpenses = round(
            $expenses['referral_commission']
            + $expenses['doctor_commission']
            + $expenses['other_expenses'],
            2
        );

        $netProfit = round($totalGains - $totalExpenses, 2);
        $marginPercent = $totalGains > 0
            ? round(($netProfit / $totalGains) * 100, 1)
            : 0;

        return [
            'scope' => $scope,
            'date_range' => [
                'from' => $from->toDateString(),
                'to' => $to->toDateString(),
            ],
            'gains' => [
                ...$gains,
                'total' => $totalGains,
            ],
            'expenses' => [
                ...$expenses,
                'total' => $totalExpenses,
            ],
            'referral_payouts_cash' => $expenses['referral_payouts'],
            'net_profit' => $netProfit,
            'margin_percent' => $marginPercent,
            'doctor_commissions' => $this->doctorCommissionBreakdown($filters, $from, $to),
            'referral_summary' => $this->referralSummary($filters, $from, $to),
        ];
    }

    /** @param array{company_id: int, branch_id?: int|null, doctor_id?: int|null} $filters */
    private function gainsBreakdown(array $filters, Carbon $from, Carbon $to): array
    {
        $diagnosticQuery = $this->diagnosticOrderQuery($filters, $from, $to);
        $diagnosticOrders = round((float) $diagnosticQuery->sum('paid_amount'), 2);

        $labQuery = $this->labOrderQuery($filters, $from, $to);
        $labOrders = round((float) $labQuery->sum('net_amount'), 2);

        return [
            'diagnostic_orders' => $diagnosticOrders,
            'lab_orders' => $labOrders,
        ];
    }

    /** @param array{company_id: int, branch_id?: int|null, doctor_id?: int|null} $filters */
    private function expensesBreakdown(array $filters, Carbon $from, Carbon $to): array
    {
        $fromDate = $from->toDateString();
        $toDate = $to->toDateString();

        $orderQuery = $this->diagnosticOrderQuery($filters, $from, $to);

        $referralCommission = round((float) (clone $orderQuery)->sum('referral_commission_amount'), 2);
        $doctorCommission = round((float) (clone $orderQuery)->sum('doctor_commission_amount'), 2);

        $expenseQuery = Expense::query()
            ->where('company_id', $filters['company_id'])
            ->whereDate('expense_date', '>=', $fromDate)
            ->whereDate('expense_date', '<=', $toDate);

        if (! empty($filters['branch_id'])) {
            $expenseQuery->where('branch_id', $filters['branch_id']);
        }

        $otherExpenses = round((float) $expenseQuery->sum('amount'), 2);

        $payoutQuery = ReferralCommissionPayout::query()
            ->where('company_id', $filters['company_id'])
            ->whereDate('paid_at', '>=', $fromDate)
            ->whereDate('paid_at', '<=', $toDate);

        $referralPayouts = round((float) $payoutQuery->sum('amount'), 2);

        return [
            'referral_commission' => $referralCommission,
            'doctor_commission' => $doctorCommission,
            'other_expenses' => $otherExpenses,
            'referral_payouts' => $referralPayouts,
        ];
    }

    /** @param array{company_id: int, branch_id?: int|null, doctor_id?: int|null} $filters */
    private function doctorCommissionBreakdown(array $filters, Carbon $from, Carbon $to): array
    {
        $rows = $this->diagnosticOrderQuery($filters, $from, $to)
            ->where('doctor_commission_amount', '>', 0)
            ->select('doctor_id')
            ->selectRaw('COUNT(*) as order_count')
            ->selectRaw('COALESCE(SUM(doctor_commission_amount), 0) as commission')
            ->selectRaw('COALESCE(SUM(net_amount), 0) as revenue')
            ->groupBy('doctor_id')
            ->orderByDesc('commission')
            ->get();

        $doctors = Doctor::with('user')
            ->where('company_id', $filters['company_id'])
            ->whereIn('id', $rows->pluck('doctor_id')->filter())
            ->get()
            ->keyBy('id');

        return $rows->map(function ($row) use ($doctors) {
            $doctor = $doctors->get($row->doctor_id);

            return [
                'doctor_id' => $row->doctor_id,
                'doctor_name' => $doctor?->user?->name ?? 'Unassigned',
                'order_count' => (int) $row->order_count,
                'revenue' => round((float) $row->revenue, 2),
                'commission' => round((float) $row->commission, 2),
            ];
        })->values()->all();
    }

    /** @param array{company_id: int, branch_id?: int|null, doctor_id?: int|null} $filters */
    private function referralSummary(array $filters, Carbon $from, Carbon $to): array
    {
        $orderQuery = $this->diagnosticOrderQuery($filters, $from, $to)
            ->where('referral_commission_amount', '>', 0);

        return [
            'orders_with_referral' => (clone $orderQuery)->count(),
            'commission_accrued' => round((float) (clone $orderQuery)->sum('referral_commission_amount'), 2),
            'payouts_made' => $this->expensesBreakdown($filters, $from, $to)['referral_payouts'],
        ];
    }

    /** @param array{company_id: int, branch_id?: int|null, doctor_id?: int|null} $filters */
    private function diagnosticOrderQuery(array $filters, Carbon $from, Carbon $to): Builder
    {
        $fromDate = $from->toDateString();
        $toDate = $to->toDateString();

        $query = DiagnosticOrder::query()
            ->where('company_id', $filters['company_id'])
            ->where('status', '!=', 'cancelled')
            ->whereDate('created_at', '>=', $fromDate)
            ->whereDate('created_at', '<=', $toDate);

        if (! empty($filters['branch_id'])) {
            $query->where('branch_id', $filters['branch_id']);
        }

        if (! empty($filters['doctor_id'])) {
            $query->where('doctor_id', $filters['doctor_id']);
        }

        return $query;
    }

    /** @param array{company_id: int, branch_id?: int|null, doctor_id?: int|null} $filters */
    private function labOrderQuery(array $filters, Carbon $from, Carbon $to): Builder
    {
        $fromDate = $from->toDateString();
        $toDate = $to->toDateString();

        $query = LabOrder::query()
            ->where('company_id', $filters['company_id'])
            ->where('status', '!=', 'cancelled')
            ->whereDate('ordered_at', '>=', $fromDate)
            ->whereDate('ordered_at', '<=', $toDate);

        if (! empty($filters['branch_id'])) {
            $query->where('branch_id', $filters['branch_id']);
        }

        if (! empty($filters['doctor_id'])) {
            $query->where('doctor_id', $filters['doctor_id']);
        }

        return $query;
    }
}