<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
    <title>Report — {{ $order->order_number }}</title>
    <style>
        :root {
            --navy: #1e3a5f;
            --navy-deep: #152a45;
            --blue: #2563eb;
            --blue-soft: #dbeafe;
            --blue-mid: #3b82f6;
            --text: #1e293b;
            --muted: #64748b;
            --line: #e2e8f0;
            --ok: #22c55e;
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
            background: #f8fafc;
            color: var(--text);
            min-height: 100vh;
            display: flex;
            flex-direction: column;
        }
        .wrap {
            width: 100%;
            max-width: 430px;
            margin: 0 auto;
            flex: 1;
            display: flex;
            flex-direction: column;
            background: #fff;
            min-height: 100vh;
        }
        .brand {
            display: flex;
            justify-content: center;
            padding: 22px 16px 8px;
        }
        .brand-logo {
            width: 72px;
            height: 72px;
            border-radius: 50%;
            object-fit: contain;
            background: #fff;
            border: 2px solid var(--blue-soft);
            padding: 4px;
        }
        .brand-fallback {
            width: 72px;
            height: 72px;
            border-radius: 50%;
            background: linear-gradient(135deg, var(--navy), var(--blue));
            color: #fff;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 800;
            font-size: 18px;
            letter-spacing: 0.5px;
        }
        .hero {
            margin: 12px 16px 0;
            background: linear-gradient(180deg, #e8f1ff 0%, #f0f7ff 100%);
            border-radius: 14px;
            padding: 18px 16px 16px;
            text-align: center;
        }
        .hero h1 {
            font-size: 17px;
            font-weight: 800;
            color: var(--navy);
            line-height: 1.35;
            text-transform: uppercase;
            letter-spacing: 0.2px;
        }
        .hero .study {
            margin-top: 6px;
            font-size: 14px;
            font-weight: 700;
            color: var(--navy);
            text-transform: uppercase;
        }
        .hero .pid {
            margin-top: 8px;
            font-size: 13px;
            color: var(--muted);
        }
        .hero .pid strong { color: var(--text); }

        .details {
            margin: 8px 16px 0;
            padding: 4px 0;
        }
        .row {
            display: flex;
            justify-content: space-between;
            gap: 12px;
            padding: 12px 4px;
            border-bottom: 1px solid var(--line);
            font-size: 13.5px;
        }
        .row:last-child { border-bottom: none; }
        .row .label { color: var(--muted); flex-shrink: 0; }
        .row .value {
            font-weight: 700;
            color: var(--text);
            text-align: right;
            word-break: break-word;
        }

        .actions {
            margin: 8px 16px 24px;
            text-align: center;
        }
        .actions p {
            font-size: 13px;
            color: var(--muted);
            margin-bottom: 14px;
        }
        .btn {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
            width: 100%;
            border: none;
            border-radius: 12px;
            padding: 14px 16px;
            font-size: 15px;
            font-weight: 700;
            color: #fff;
            text-decoration: none;
            cursor: pointer;
            margin-bottom: 12px;
            box-shadow: 0 4px 14px rgba(37, 99, 235, 0.25);
        }
        .btn--download {
            background: linear-gradient(135deg, #1e3a5f 0%, #1d4ed8 100%);
        }
        .btn--view {
            background: linear-gradient(135deg, #38bdf8 0%, #2563eb 100%);
            box-shadow: 0 4px 14px rgba(56, 189, 248, 0.28);
        }
        .btn:disabled,
        .btn.is-disabled {
            opacity: 0.55;
            pointer-events: none;
            box-shadow: none;
        }
        .btn svg { width: 20px; height: 20px; fill: currentColor; flex-shrink: 0; }
        .note {
            margin-top: 4px;
            font-size: 12px;
            color: #b45309;
            background: #fffbeb;
            border: 1px solid #fde68a;
            border-radius: 8px;
            padding: 10px 12px;
        }

        .secure {
            margin-top: auto;
            background: linear-gradient(135deg, #0f172a, #1e293b);
            color: #fff;
            padding: 16px;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 12px;
            text-align: left;
        }
        .secure-icon {
            width: 36px;
            height: 36px;
            border-radius: 50%;
            background: var(--ok);
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
        }
        .secure-icon svg { width: 20px; height: 20px; fill: #fff; }
        .secure strong { display: block; font-size: 13px; }
        .secure span { font-size: 11px; opacity: 0.8; }
    </style>
</head>
<body>
    <div class="wrap">
        <div class="brand">
            @if(!empty($branding['logo']))
                <img src="{{ $branding['logo'] }}" alt="{{ $branding['name'] }}" class="brand-logo">
            @else
                <div class="brand-fallback">{{ strtoupper(substr($branding['name'] ?? 'AM', 0, 2)) }}</div>
            @endif
        </div>

        <div class="hero">
            <h1>{{ $patientHeadline }}</h1>
            <div class="study">{{ strtoupper($serviceName) }}</div>
            <div class="pid">Patient ID: <strong>{{ $patient->patient_code ?? '—' }}</strong></div>
        </div>

        <div class="details">
            <div class="row">
                <span class="label">Sex/Age/Modality</span>
                <span class="value">{{ $patientAgeSexShort }}</span>
            </div>
            <div class="row">
                <span class="label">Report Id</span>
                <span class="value">{{ $order->order_number }}</span>
            </div>
            <div class="row">
                <span class="label">Report</span>
                <span class="value">{{ strtoupper($order->testType?->name ?? $serviceName) }}</span>
            </div>
            <div class="row">
                <span class="label">Ref. physician</span>
                <span class="value">{{ $referredBy ?: '—' }}</span>
            </div>
            <div class="row">
                <span class="label">Study Date/Time</span>
                <span class="value">{{ $studyDate->format('d-m-Y h:i A') }}</span>
            </div>
            <div class="row">
                <span class="label">Report Date/Time</span>
                <span class="value">{{ $reportDate->format('d-m-Y h:i A') }}</span>
            </div>
        </div>

        <div class="actions">
            <p>Please download or view your report from here</p>

            @if($hasReport)
                <a class="btn btn--download" href="{{ $downloadUrl }}?print=1" target="_blank" rel="noopener">
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3a1 1 0 0 1 1 1v9.59l2.3-2.3a1 1 0 1 1 1.4 1.42l-4 4a1 1 0 0 1-1.4 0l-4-4a1 1 0 1 1 1.4-1.42L11 13.59V4a1 1 0 0 1 1-1Zm-7 14a1 1 0 0 1 1 1v1h12v-1a1 1 0 1 1 2 0v2a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-2a1 1 0 0 1 1-1Z"/></svg>
                    Download Report
                </a>
                <a class="btn btn--view" href="{{ $downloadUrl }}" target="_blank" rel="noopener">
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5c5.2 0 9.3 3.6 10.5 6.5a1.6 1.6 0 0 1 0 1C21.3 15.4 17.2 19 12 19S2.7 15.4 1.5 12.5a1.6 1.6 0 0 1 0-1C2.7 8.6 6.8 5 12 5Zm0 2c-3.8 0-7 2.7-8.2 5C5 14.3 8.2 17 12 17s7-2.7 8.2-5C19 9.7 15.8 7 12 7Zm0 2.5A2.5 2.5 0 1 1 12 14a2.5 2.5 0 0 1 0-4.5Z"/></svg>
                    View Report Card
                </a>
            @else
                <button type="button" class="btn btn--download is-disabled" disabled>Download Report</button>
                <button type="button" class="btn btn--view is-disabled" disabled>View Report Card</button>
                <div class="note">Report is being prepared. Please check back shortly.</div>
            @endif
        </div>

        <div class="secure">
            <div class="secure-icon">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2 4 5v6c0 5 3.4 9.4 8 11 4.6-1.6 8-6 8-11V5l-8-3Zm-1.2 13.3-3.1-3.1 1.4-1.4 1.7 1.7 3.9-3.9 1.4 1.4-5.3 5.3Z"/></svg>
            </div>
            <div>
                <strong>Secured By {{ $branding['name'] ?? 'ApnaMedi' }}</strong>
                <span>Trusted digital diagnostic report</span>
            </div>
        </div>
    </div>
</body>
</html>
