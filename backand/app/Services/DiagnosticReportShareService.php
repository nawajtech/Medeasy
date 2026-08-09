<?php

namespace App\Services;

use App\Models\DiagnosticOrder;
use App\Support\PrescriptionFormatter;
use Endroid\QrCode\Builder\Builder;
use Endroid\QrCode\Encoding\Encoding;
use Endroid\QrCode\ErrorCorrectionLevel;
use Endroid\QrCode\Writer\PngWriter;
use Illuminate\Support\Str;

class DiagnosticReportShareService
{
    private const PUBLIC_SHARE_BASE = 'https://apnamedi.com';

    public function ensureShareToken(DiagnosticOrder $order): string
    {
        if (filled($order->share_token)) {
            return $order->share_token;
        }

        do {
            $token = Str::lower(Str::random(24));
        } while (DiagnosticOrder::withoutGlobalScopes()->where('share_token', $token)->exists());

        $order->forceFill(['share_token' => $token])->saveQuietly();

        return $token;
    }

    public function shareUrl(DiagnosticOrder $order): string
    {
        $token = $this->ensureShareToken($order);

        return self::PUBLIC_SHARE_BASE.'/share-report/'.$token;
    }

    public function downloadUrl(DiagnosticOrder $order): string
    {
        $token = $this->ensureShareToken($order);

        return self::PUBLIC_SHARE_BASE.'/share-report/'.$token.'/download';
    }

    /** @return array<string, mixed> */
    public function publicPayload(DiagnosticOrder $order): array
    {
        $data = $this->documentData($order);
        $token = $this->ensureShareToken($order);

        return [
            'token' => $token,
            'report_id' => $order->order_number,
            'patient_name' => $data['patient']?->name,
            'patient_code' => $data['patient']?->patient_code,
            'patient_headline' => $data['patientHeadline'],
            'patient_age_sex_short' => $data['patientAgeSexShort'],
            'service_name' => $data['serviceName'],
            'test_name' => $order->testType?->name ?? $data['serviceName'],
            'referred_by' => $data['referredBy'],
            'study_at' => optional($data['studyDate'])->toIso8601String(),
            'study_at_label' => optional($data['studyDate'])->format('d-m-Y h:i A'),
            'report_at' => optional($data['reportDate'])->toIso8601String(),
            'report_at_label' => optional($data['reportDate'])->format('d-m-Y h:i A'),
            'has_report' => (bool) $data['hasReport'],
            'branding' => [
                'name' => $data['branding']['name'] ?? null,
                'logo' => $data['branding']['logo'] ?? null,
            ],
            'share_url' => $data['shareUrl'],
            'download_url' => $data['downloadUrl'],
        ];
    }

    public function qrDataUri(string $content, int $size = 140): string
    {
        $builder = new Builder(
            writer: new PngWriter,
            data: $content,
            encoding: new Encoding('UTF-8'),
            errorCorrectionLevel: ErrorCorrectionLevel::Medium,
            size: $size,
            margin: 4,
        );

        return $builder->build()->getDataUri();
    }

    /** @return array<string, mixed> */
    public function documentData(DiagnosticOrder $order): array
    {
        $order->loadMissing([
            'patient',
            'doctor.user',
            'doctor.department',
            'testType.category',
            'referralPartner',
            'report.reporter',
            'report.approver',
        ]);

        $branding = app(ClinicBrandingService::class)->forCompany((int) $order->company_id);
        $patient = $order->patient;

        $ageYears = null;
        $agePart = '—';
        if ($patient?->date_of_birth) {
            $diff = $patient->date_of_birth->diff(now());
            $ageYears = $diff->y;
            $agePart = sprintf('%d Y', $diff->y);
        }

        $genderRaw = strtolower((string) ($patient?->gender ?? ''));
        $sexShort = match (true) {
            str_starts_with($genderRaw, 'm') => 'M',
            str_starts_with($genderRaw, 'f') => 'F',
            $genderRaw !== '' => strtoupper(substr($genderRaw, 0, 1)),
            default => '—',
        };
        $sexPart = match ($sexShort) {
            'M' => 'MALE',
            'F' => 'FEMALE',
            '—' => '—',
            default => strtoupper((string) $patient?->gender),
        };

        $modality = strtoupper((string) ($order->testType?->modality ?? $order->testType?->category?->name ?? 'DX'));
        $serviceName = trim(
            ($order->testType?->category?->name ? $order->testType->category->name.' — ' : '')
            .($order->testType?->name ?? 'Diagnostic Test')
        );

        $referredBy = $order->referral_partner_name;
        if (! $referredBy && $order->doctor?->user?->name) {
            $referredBy = 'Dr. '.$order->doctor->user->name;
        }

        $doctorName = $order->doctor?->user?->name
            ?? $order->report?->reporter?->name
            ?? auth()->user()?->name
            ?? 'Doctor';
        $doctorQualification = trim(
            ($order->doctor?->department?->name ?? '')
            .($order->doctor?->license_number ? ' · Reg: '.$order->doctor->license_number : '')
        );

        $studyAt = $order->scheduled_at ?? $order->created_at ?? now();
        $reportAt = $order->report?->approved_at
            ?? $order->report?->updated_at
            ?? $order->updated_at
            ?? now();

        $shareUrl = $this->shareUrl($order);
        $downloadUrl = $this->downloadUrl($order);

        $headlineParts = array_filter([
            strtoupper((string) ($patient->name ?? 'Patient')),
            $ageYears !== null && $sexShort !== '—' ? $ageYears.'Y/'.$sexShort : null,
            $referredBy ? strtoupper($referredBy) : null,
        ]);

        return [
            'order' => $order,
            'patient' => $patient,
            'report' => $order->report,
            'branding' => $branding,
            'reportDate' => $reportAt,
            'studyDate' => $studyAt,
            'patientAgeSex' => $agePart.' / '.$sexPart,
            'patientAgeSexShort' => ($sexShort !== '—' ? $sexShort : '—').'/'.($ageYears !== null ? $ageYears.'Y' : '—').'/'.$modality,
            'patientHeadline' => implode(' ', $headlineParts),
            'serviceName' => $serviceName,
            'referredBy' => $referredBy,
            'doctorName' => $doctorName,
            'doctorQualification' => $doctorQualification,
            'findingsHtml' => PrescriptionFormatter::findingsToHtml($order->report?->findings),
            'shareUrl' => $shareUrl,
            'downloadUrl' => $downloadUrl,
            'qrDataUri' => $this->qrDataUri($shareUrl),
            'hasReport' => filled($order->report?->findings)
                || filled($order->report?->impression)
                || filled($order->report?->recommendations),
        ];
    }
}
