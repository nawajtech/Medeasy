<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Prescription — {{ $appointment->patient->name }}</title>
    @include('documents.partials.styles')
    <style>
        .rx { font-size: 2rem; font-weight: 700; color: #2563eb; margin: 12px 0; }
        .prescription-body { white-space: pre-wrap; line-height: 1.6; min-height: 100px; }
        .rx-table { width: 100%; border-collapse: collapse; font-size: 0.875rem; margin-top: 8px; }
        .rx-table th, .rx-table td { border: 1px solid #e2e8f0; padding: 8px 10px; text-align: left; vertical-align: top; }
        .rx-table th { background: #f8fafc; font-weight: 600; color: #334155; }
        .rx-table .num { width: 28px; text-align: center; color: #2563eb; font-weight: 700; }
        .rx-advice { margin-top: 16px; padding: 12px; background: #f8fafc; border-radius: 8px; border-left: 3px solid #2563eb; }
        .rx-followup { margin-top: 12px; font-size: 0.875rem; color: #475569; }
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
        @if($appointment->prescription_type === 'upload' && $appointment->prescription_file)
            @php
                $ext = strtolower(pathinfo($appointment->prescription_file, PATHINFO_EXTENSION));
                $fileUrl = \App\Support\S3Storage::url($appointment->prescription_file);
            @endphp
            @if(in_array($ext, ['jpg', 'jpeg', 'png', 'webp']))
                <img src="{{ $fileUrl }}" alt="Uploaded prescription" style="max-width:100%;border:1px solid #e2e8f0;border-radius:8px;">
            @else
                <p><a href="{{ $fileUrl }}" target="_blank" rel="noopener">View uploaded prescription ({{ strtoupper($ext) }})</a></p>
            @endif
        @elseif($appointment->prescription_type === 'structured' && !empty($appointment->prescription_data['items']))
            @php
                $rxData = $appointment->prescription_data;
                $timingLabels = [
                    'before_food' => 'Before Food',
                    'after_food' => 'After Food',
                    'with_food' => 'With Food',
                    'empty_stomach' => 'Empty Stomach',
                    'bedtime' => 'Bedtime',
                ];
                $freqLabels = [
                    'once_daily' => 'Once Daily',
                    'twice_daily' => 'Twice Daily',
                    'three_times_daily' => 'Three Times Daily',
                    'four_times_daily' => 'Four Times Daily',
                    'sos' => 'SOS',
                ];
                $unitLabels = ['days' => 'Days', 'weeks' => 'Weeks', 'months' => 'Months'];
            @endphp
            <table class="rx-table">
                <thead>
                    <tr>
                        <th class="num">#</th>
                        <th>Medicine</th>
                        <th>Dose (M-A-N)</th>
                        <th>Frequency</th>
                        <th>Timing</th>
                        <th>Duration</th>
                        <th>Instructions</th>
                    </tr>
                </thead>
                <tbody>
                    @foreach($rxData['items'] as $i => $item)
                        @php
                            $dose = ($item['frequency'] ?? '') === 'sos'
                                ? 'SOS'
                                : ($item['dose_morning'] ?? '0') . '-' . ($item['dose_afternoon'] ?? '0') . '-' . ($item['dose_night'] ?? '0');
                            $duration = !empty($item['duration_value'])
                                ? $item['duration_value'] . ' ' . ($unitLabels[$item['duration_unit'] ?? 'days'] ?? 'Days')
                                : '—';
                        @endphp
                        <tr>
                            <td class="num">{{ $i + 1 }}</td>
                            <td>
                                <strong>{{ $item['name'] ?? '—' }}</strong>
                                @if(!empty($item['composition']))
                                    <br><span style="font-size:0.75rem;color:#64748b;">{{ $item['composition'] }}</span>
                                @endif
                            </td>
                            <td>{{ $dose }}</td>
                            <td>{{ $freqLabels[$item['frequency'] ?? ''] ?? '—' }}</td>
                            <td>{{ $timingLabels[$item['timing'] ?? ''] ?? '—' }}</td>
                            <td>{{ $duration }}</td>
                            <td>{{ $item['instruction'] ?? '—' }}</td>
                        </tr>
                    @endforeach
                </tbody>
            </table>
            @if(!empty($rxData['care_suggestions']))
                <div class="rx-advice">
                    <strong>Basic Care</strong>
                    <ul style="margin:6px 0 0;padding-left:20px;">
                        @foreach($rxData['care_suggestions'] as $tip)
                            <li>{{ $tip }}</li>
                        @endforeach
                    </ul>
                </div>
            @endif
            @if(!empty($rxData['advice']))
                <div class="rx-advice">
                    <strong>Doctor's Advice</strong>
                    <p style="margin:6px 0 0;white-space:pre-wrap;">{{ $rxData['advice'] }}</p>
                </div>
            @endif
            @if(!empty($rxData['follow_up_date']))
                <p class="rx-followup"><strong>Follow-up:</strong> {{ \Carbon\Carbon::parse($rxData['follow_up_date'])->format('M d, Y') }}</p>
            @elseif(!empty($rxData['follow_up_days']))
                <p class="rx-followup"><strong>Follow-up:</strong> After {{ $rxData['follow_up_days'] }} day(s)</p>
            @endif
        @else
            <div class="prescription-body">{{ $appointment->prescription ?: 'No prescription notes recorded for this visit.' }}</div>
        @endif
    </div>

    <div class="sign">
        <p><strong>{{ $appointment->doctor->user->name ?? 'Doctor' }}</strong></p>
        <p style="font-size:0.8125rem;color:#64748b;">Authorized signature</p>
    </div>

    @include('documents.partials.clinic-footer', ['branding' => $branding])
</body>
</html>
