<?php

namespace App\Mail;

use App\Models\Partner;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class PartnerPasswordResetOtpMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly Partner $partner,
        public readonly string $code,
        public readonly int $expiresInMinutes,
        public readonly string $appName,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Your '.$this->appName.' password reset code',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.partner-password-reset-otp',
        );
    }
}
