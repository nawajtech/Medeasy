<?php

namespace App\Services;

use App\Models\SubscriptionPayment;
use App\Support\MediaStorage;
use App\Support\PlatformSettingDefinitions;
use App\Support\PublicStorageUrl;
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
        $issuer = $this->resolveIssuer();

        $html = view('documents.subscription-invoice', [
            'payment' => $payment,
            'company' => $company,
            'issuer' => $issuer,
            'logoDataUri' => $issuer['logo_data_uri'],
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
     * Issuer block: platform settings first, then subscription config for legal/bank fields.
     *
     * @return array<string, mixed>
     */
    private function resolveIssuer(): array
    {
        $config = config('subscription.issuer', []);
        $values = app(PlatformBrandingService::class)->rawValues();
        $defaults = collect(PlatformSettingDefinitions::all())->keyBy('key');

        $pick = function (string $key) use ($values, $defaults): ?string {
            $value = $values[$key] ?? null;
            if (filled($value)) {
                return trim((string) $value);
            }

            $fallback = $defaults->get($key)['default'] ?? null;

            return filled($fallback) ? trim((string) $fallback) : null;
        };

        $name = $pick('organisation_name') ?: ($config['brand_name'] ?? 'ApnaMedi');
        $address = $pick('organisation_address');
        $country = $pick('organisation_country');
        $pincode = $pick('organisation_pincode');
        $tagline = $pick('organisation_division');

        $addressLines = array_values(array_filter([
            $address,
            collect([$country, $pincode])->filter()->implode(' — '),
        ]));

        // Prefer settings address; fall back to Udyam/config lines only if settings empty.
        if ($addressLines === []) {
            $addressLines = array_values(array_filter($config['address_lines'] ?? []));
            if ($addressLines === [] && filled($config['address'] ?? null)) {
                $addressLines = [(string) $config['address']];
            }
        }

        return [
            'brand_name' => $name,
            'legal_name' => $config['legal_name'] ?? $name,
            'office_name' => $tagline ?: ($config['office_name'] ?? null),
            'udyam_urn' => $config['udyam_urn'] ?? null,
            'email' => $pick('organisation_email') ?: ($config['email'] ?? null),
            'phone' => $pick('organisation_phone') ?: ($config['phone'] ?? null),
            'website' => $pick('organisation_website') ?: ($config['website'] ?? null),
            'address' => $address ?: ($config['address'] ?? null),
            'address_lines' => $addressLines,
            'tagline' => $tagline,
            'proprietor' => $config['proprietor'] ?? null,
            'bank' => $config['bank'] ?? [],
            'signatory' => $config['signatory'] ?? ('Authorized Signatory — '.$name),
            'logo_data_uri' => $this->platformLogoDataUri($values['company_logo'] ?? null),
        ];
    }

    /**
     * Embed the platform logo as a data URI so Dompdf can render it offline (local or S3).
     */
    private function platformLogoDataUri(mixed $stored): ?string
    {
        try {
            if (! is_string($stored) || $stored === '') {
                return null;
            }

            // Already a data URI from upload preview / stored base64.
            if (str_starts_with($stored, 'data:image/')) {
                return $this->dompdfSafeImageDataUri($stored);
            }

            $relative = PublicStorageUrl::toRelativePath($stored);
            if (! $relative) {
                return null;
            }

            $binary = null;
            $mime = null;

            if (MediaStorage::exists($relative)) {
                $binary = MediaStorage::disk()->get($relative);
                $mime = MediaStorage::disk()->mimeType($relative) ?: null;
            }

            if ($binary === null || $binary === '') {
                $absolute = storage_path('app/public/'.$relative);
                if (is_file($absolute) && is_readable($absolute)) {
                    $binary = (string) file_get_contents($absolute);
                    $mime = mime_content_type($absolute) ?: null;
                }
            }

            if ($binary === null || $binary === '') {
                return null;
            }

            $mime = $mime ?: $this->guessMimeFromPath($relative);
            if (! is_string($mime) || ! str_starts_with($mime, 'image/')) {
                return null;
            }

            // Dompdf does not reliably render SVG in <img> tags.
            if (str_contains($mime, 'svg')) {
                return null;
            }

            return 'data:'.$mime.';base64,'.base64_encode($binary);
        } catch (\Throwable) {
            return null;
        }
    }

    private function dompdfSafeImageDataUri(string $dataUri): ?string
    {
        if (! preg_match('#^data:(image/(?:png|jpe?g|gif|webp));base64,#i', $dataUri, $m)) {
            return null;
        }

        return 'data:'.strtolower($m[1]).';base64,'.substr($dataUri, strpos($dataUri, ',') + 1);
    }

    private function guessMimeFromPath(string $path): ?string
    {
        $ext = strtolower(pathinfo($path, PATHINFO_EXTENSION));

        return match ($ext) {
            'jpg', 'jpeg' => 'image/jpeg',
            'png' => 'image/png',
            'gif' => 'image/gif',
            'webp' => 'image/webp',
            default => null,
        };
    }
}
