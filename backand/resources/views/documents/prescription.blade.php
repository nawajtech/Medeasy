<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Prescription — {{ $appointment->patient->name }}</title>
    @include('documents.partials.styles')
    <style>
        .rx { font-size: 2rem; font-weight: 700; color: #0d9488; margin: 12px 0; }
        .prescription-body { white-space: pre-wrap; line-height: 1.6; min-height: 100px; }
        .sign { margin-top: 36px; border-top: 1px solid #e2e8f0; padding-top: 14px; }
    </style>
</head>
<body>
    <button class="no-print doc-print-btn" onclick="window.print()">Print / Save as PDF</button>

    @include('documents.partials.clinic-header', ['branding' => $branding])

    <p class="doc-meta">
        <strong>Prescription</strong> &middot; {{ $appointment->appointment_date->format('M d, Y') }}
        &middot; Ref: APT-{{ $appointment->id }}
    </p>

    <div class="rx">℞</div>

    <div class="block">
        <h3>Patient</h3>
        <p><strong>{{ $appointment->patient->name }}</strong> ({{ $appointment->patient->patient_code }})</p>
        @if($appointment->patient->date_of_birth)
            <p style="font-size:0.8125rem;color:#64748b;">DOB: {{ $appointment->patient->date_of_birth->format('M d, Y') }}</p>
        @endif
        @if($appointment->patient->phone)
            <p style="font-size:0.8125rem;color:#64748b;">Phone: {{ $appointment->patient->phone }}</p>
        @endif
    </div>

    <div class="block">
        <h3>Prescribing doctor</h3>
        <p><strong>{{ $appointment->doctor->user->name ?? '—' }}</strong></p>
        <p style="font-size:0.8125rem;">
            {{ $appointment->doctor->department->name ?? '—' }}
            @if($appointment->doctor->license_number)
                &middot; License: {{ $appointment->doctor->license_number }}
            @endif
        </p>
    </div>

    @if($appointment->reason)
        <div class="block">
            <h3>Diagnosis / Reason</h3>
            <p>{{ $appointment->reason }}</p>
        </div>
    @endif

    <div class="block">
        <h3>Prescription</h3>
        <div class="prescription-body">{{ $appointment->prescription ?: 'No prescription notes recorded for this visit.' }}</div>
    </div>

    <div class="sign">
        <p><strong>{{ $appointment->doctor->user->name ?? 'Doctor' }}</strong></p>
        <p style="font-size:0.8125rem;color:#64748b;">Authorized signature</p>
    </div>

    @include('documents.partials.clinic-footer', ['branding' => $branding])
</body>
</html>
