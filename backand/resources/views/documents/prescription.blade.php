<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Prescription — {{ $appointment->patient->name }}</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: Segoe UI, system-ui, sans-serif; color: #0f172a; padding: 40px; max-width: 800px; margin: 0 auto; }
        h1 { font-size: 1.5rem; color: #0d9488; }
        .rx { font-size: 2rem; font-weight: 700; color: #0d9488; margin: 16px 0; }
        .meta { color: #64748b; font-size: 0.875rem; margin-bottom: 24px; }
        .block { margin: 20px 0; padding: 16px; border: 1px solid #e2e8f0; border-radius: 8px; }
        .block h3 { font-size: 0.75rem; text-transform: uppercase; color: #64748b; margin-bottom: 8px; }
        .prescription-body { white-space: pre-wrap; line-height: 1.6; min-height: 120px; }
        .sign { margin-top: 48px; border-top: 1px solid #e2e8f0; padding-top: 16px; }
        @media print { body { padding: 20px; } .no-print { display: none; } }
    </style>
</head>
<body>
    <button class="no-print" onclick="window.print()" style="margin-bottom:20px;padding:8px 16px;cursor:pointer;">Print / Save as PDF</button>

    <h1>{{ $clinicName }}</h1>
    <p class="meta">{{ $appointment->appointment_date->format('M d, Y') }} &middot; Ref: APT-{{ $appointment->id }}</p>

    <div class="rx">℞</div>

    <div class="block">
        <h3>Patient</h3>
        <p><strong>{{ $appointment->patient->name }}</strong> ({{ $appointment->patient->patient_code }})</p>
        @if($appointment->patient->date_of_birth)
        <p style="font-size:0.875rem;color:#64748b;">DOB: {{ $appointment->patient->date_of_birth->format('M d, Y') }}</p>
        @endif
    </div>

    <div class="block">
        <h3>Prescribing doctor</h3>
        <p><strong>{{ $appointment->doctor->user->name ?? '—' }}</strong></p>
        <p style="font-size:0.875rem;">{{ $appointment->doctor->department->name ?? '—' }} @if($appointment->doctor->license_number) &middot; License: {{ $appointment->doctor->license_number }} @endif</p>
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
        <p style="font-size:0.875rem;color:#64748b;">Signature</p>
    </div>
</body>
</html>
