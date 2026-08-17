<?php

namespace App\Mail;

use App\Models\DiagnosticOrder;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class DiagnosticReportReadyMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly DiagnosticOrder $order,
        public readonly string $shareUrl,
        public readonly string $centreName,
        public readonly string $testName,
        public readonly string $patientName,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Your diagnostic report is ready — '.$this->testName,
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.diagnostic-report-ready',
            with: [
                'patientName' => $this->patientName,
                'centreName' => $this->centreName,
                'testName' => $this->testName,
                'orderNumber' => $this->order->order_number,
                'shareUrl' => $this->shareUrl,
                'approvedAt' => optional($this->order->report?->approved_at)->format('d M Y, h:i A'),
            ],
        );
    }
}
