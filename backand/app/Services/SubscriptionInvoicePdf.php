<?php

namespace App\Services;

use App\Models\SubscriptionPayment;
use Dompdf\Dompdf;
use Dompdf\Options;
use Illuminate\Http\Response;

class SubscriptionInvoicePdf
{
    public function download(SubscriptionPayment $payment): Response
    {
        $payment->loadMissing(['subscription.company', 'subscription.plan']);

        $notes = $payment->notes ?? [];
        $company = $payment->subscription?->company;
        $planName = $notes['plan_name'] ?? $payment->subscription?->plan?->name ?? 'Subscription';
        $billingCycle = $notes['billing_cycle'] ?? $payment->subscription?->billing_cycle ?? 'monthly';
        $issuedAt = $payment->payment_date ?? $payment->created_at;
        $periodEnd = $billingCycle === 'yearly'
            ? $issuedAt->copy()->addYear()->subDay()
            : $issuedAt->copy()->addMonth()->subDay();

        $methods = config('subscription.payment_methods', []);
        $tz = config('app.timezone');
        $html = view('documents.subscription-invoice', [
            'payment' => $payment,
            'company' => $company,
            'issuer' => config('subscription.issuer'),
            'logoDataUri' => $this->platformLogoDataUri(),
            'planName' => $planName,
            'billingCycle' => $billingCycle,
            'invoiceDate' => $issuedAt->timezone($tz)->format('jS M, Y'),
            'periodLabel' => $issuedAt->timezone($tz)->format('jS M, Y')
                .' – '.$periodEnd->timezone($tz)->format('jS M, Y'),
            'subtotal' => $payment->subtotal ?? ($notes['subtotal'] ?? $payment->amount),
            'isPaid' => $payment->payment_status === SubscriptionPayment::STATUS_PAID,
            'isPending' => $payment->payment_status === SubscriptionPayment::STATUS_PENDING,
            'methodLabel' => $methods[$payment->payment_method]
                ?? ($payment->payment_method ? ucfirst(str_replace('_', ' ', $payment->payment_method)) : '—'),
            'money' => function ($amount) use ($payment) {
                $value = number_format((float) $amount, 2);

                return ($payment->currency === 'INR' ? 'Rs. ' : ($payment->currency.' ')).$value;
            },
        ])->render();

        $options = new Options;
        $options->set('isRemoteEnabled', false);
        $options->set('isHtml5ParserEnabled', true);
        $options->set('defaultFont', 'DejaVu Sans');

        $dompdf = new Dompdf($options);
        $dompdf->loadHtml($html);
        $dompdf->setPaper('A4', 'portrait');
        $dompdf->render();

        $filename = 'ApnaMedi_Invoice_'.$payment->invoice_number.'.pdf';

        return response($dompdf->output(), 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'attachment; filename="'.$filename.'"',
        ]);
    }

    /**
     * Embed the platform logo as a data URI so Dompdf can render it offline.
     */
    private function platformLogoDataUri(): ?string
    {
        try {
            $stored = app(PlatformBrandingService::class)->rawValues()['company_logo'] ?? null;
            $relative = \App\Support\PublicStorageUrl::toRelativePath(is_string($stored) ? $stored : null);
            if (! $relative) {
                return null;
            }

            $absolute = storage_path('app/public/'.$relative);
            if (! is_file($absolute) || ! is_readable($absolute)) {
                return null;
            }

            $mime = mime_content_type($absolute) ?: 'image/png';
            if (! str_starts_with($mime, 'image/')) {
                return null;
            }

            return 'data:'.$mime.';base64,'.base64_encode((string) file_get_contents($absolute));
        } catch (\Throwable) {
            return null;
        }
    }
}
