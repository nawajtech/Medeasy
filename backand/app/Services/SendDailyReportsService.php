<?php

namespace App\Services;

use App\Mail\DiagnosticReportReadyMail;
use App\Models\DiagnosticOrder;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class SendDailyReportsService
{
    public function __construct(
        private DiagnosticReportShareService $shareService,
    ) {}

    /**
     * Email patients for diagnostic reports approved today that have not been emailed yet.
     *
     * @return array{date: string, scanned: int, sent: int, skipped: int, failed: int, details: list<array<string, mixed>>}
     */
    public function sendTodaysApprovedReports(?string $date = null): array
    {
        $day = $date
            ? \Carbon\Carbon::parse($date, config('app.timezone'))->toDateString()
            : now(config('app.timezone'))->toDateString();

        $orders = DiagnosticOrder::query()
            ->with(['patient', 'company:id,name', 'testType:id,name', 'report'])
            ->whereHas('report', function ($q) use ($day) {
                $q->whereNotNull('approved_at')
                    ->whereDate('approved_at', $day)
                    ->whereNull('report_emailed_at');
            })
            ->orderBy('id')
            ->get();

        $sent = 0;
        $skipped = 0;
        $failed = 0;
        $details = [];

        foreach ($orders as $order) {
            $patient = $order->patient;
            $email = trim((string) ($patient?->email ?? ''));
            $report = $order->report;

            if (! $report) {
                $skipped++;
                $details[] = [
                    'order_id' => $order->id,
                    'order_number' => $order->order_number,
                    'status' => 'skipped',
                    'reason' => 'no_report',
                ];
                continue;
            }

            if ($email === '' || ! filter_var($email, FILTER_VALIDATE_EMAIL)) {
                $skipped++;
                $details[] = [
                    'order_id' => $order->id,
                    'order_number' => $order->order_number,
                    'status' => 'skipped',
                    'reason' => 'missing_or_invalid_email',
                ];
                continue;
            }

            try {
                $shareUrl = $this->shareService->shareUrl($order);
                $centreName = $order->company?->name ?? config('app.name');
                $testName = $order->testType?->name ?? 'Diagnostic test';
                $patientName = $patient->name ?? 'Patient';

                Mail::to($email)->send(new DiagnosticReportReadyMail(
                    order: $order,
                    shareUrl: $shareUrl,
                    centreName: $centreName,
                    testName: $testName,
                    patientName: $patientName,
                ));

                $report->forceFill(['report_emailed_at' => now()])->saveQuietly();
                $sent++;

                $details[] = [
                    'order_id' => $order->id,
                    'order_number' => $order->order_number,
                    'email' => $email,
                    'status' => 'sent',
                ];
            } catch (\Throwable $e) {
                $failed++;
                Log::error('sendreports failed', [
                    'order_id' => $order->id,
                    'email' => $email,
                    'error' => $e->getMessage(),
                ]);

                $details[] = [
                    'order_id' => $order->id,
                    'order_number' => $order->order_number,
                    'email' => $email,
                    'status' => 'failed',
                    'reason' => $e->getMessage(),
                ];
            }
        }

        return [
            'date' => $day,
            'scanned' => $orders->count(),
            'sent' => $sent,
            'skipped' => $skipped,
            'failed' => $failed,
            'details' => $details,
        ];
    }
}
