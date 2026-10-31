<?php

namespace App\Mail;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class PasswordResetOtpMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly User $user,
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
            view: 'emails.password-reset-otp',
        );
    }
}
