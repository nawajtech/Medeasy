<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Prescription — {{ $patient->name ?? 'Patient' }}</title>
    <style>
        :root {
            --apollo-blue: #0077b6;
            --apollo-dark: #023e8a;
            --apollo-teal: #00b4d8;
            --apollo-green: #06a77d;
            --apollo-gold: #f4a261;
            --apollo-red: #e63946;
            --apollo-bg: #e8f4fc;
            --apollo-soft: #f0f9ff;
            --text: #1e293b;
            --muted: #64748b;
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
            font-size: 13px;
            color: var(--text);
            background: linear-gradient(160deg, #dbeafe 0%, #e0f2fe 40%, #f0fdf4 100%);
            padding: 16px;
            min-height: 100vh;
        }
        .rx-sheet {
            max-width: 820px;
            margin: 0 auto;
            position: relative;
            background: #fff;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 8px 32px rgba(2, 62, 138, 0.15), 0 2px 8px rgba(0,0,0,0.06);
            min-height: 1050px;
        }
        .rx-top-stripe {
            height: 6px;
            background: linear-gradient(90deg, var(--apollo-dark) 0%, var(--apollo-blue) 35%, var(--apollo-teal) 65%, var(--apollo-green) 100%);
        }
        .rx-watermark {
            position: absolute;
            inset: 200px 60px 180px;
            display: flex;
            align-items: center;
            justify-content: center;
            pointer-events: none;
            z-index: 0;
        }
        .rx-watermark img {
            max-width: 340px;
            max-height: 340px;
            opacity: 0.045;
            object-fit: contain;
        }
        .rx-watermark-rx {
            position: absolute;
            top: 280px;
            left: 40px;
            font-size: 120px;
            font-weight: 800;
            color: var(--apollo-teal);
            opacity: 0.07;
            line-height: 1;
            font-family: Georgia, serif;
            z-index: 0;
            pointer-events: none;
        }
        .rx-content { position: relative; z-index: 1; }
        .no-print {
            padding: 10px 16px;
            text-align: right;
            background: var(--apollo-soft);
            border-bottom: 1px solid #bae6fd;
        }
        .no-print button {
            padding: 8px 18px;
            border: none;
            border-radius: 8px;
            background: linear-gradient(135deg, var(--apollo-blue), var(--apollo-dark));
            color: #fff;
            cursor: pointer;
            font-size: 13px;
            font-weight: 600;
            box-shadow: 0 2px 8px rgba(2, 62, 138, 0.3);
        }

        /* ── Header ── */
        .rx-header {
            background: linear-gradient(135deg, var(--apollo-dark) 0%, var(--apollo-blue) 55%, #0096c7 100%);
            color: #fff;
            padding: 18px 20px 16px;
            display: grid;
            grid-template-columns: 96px 1fr auto;
            gap: 16px;
            align-items: center;
        }
        .rx-logo-wrap {
            width: 88px;
            height: 88px;
            background: #fff;
            border-radius: 14px;
            padding: 6px;
            box-shadow: 0 4px 16px rgba(0,0,0,0.2);
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .rx-logo {
            max-width: 100%;
            max-height: 100%;
            object-fit: contain;
        }
        .rx-logo-placeholder {
            width: 100%;
            height: 100%;
            border-radius: 10px;
            background: linear-gradient(135deg, #e0f2fe, #dbeafe);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 11px;
            font-weight: 700;
            color: var(--apollo-blue);
        }
        .rx-clinic h1 {
            font-size: 22px;
            font-weight: 800;
            line-height: 1.15;
            letter-spacing: 0.5px;
            text-shadow: 0 1px 2px rgba(0,0,0,0.15);
        }
        .rx-clinic h1 .accent { color: #90e0ef; }
        .rx-clinic .division {
            display: inline-block;
            margin-top: 4px;
            padding: 2px 10px;
            background: rgba(255,255,255,0.18);
            border-radius: 20px;
            font-size: 11px;
            font-weight: 600;
            letter-spacing: 0.6px;
        }
        .rx-clinic .contact {
            margin-top: 8px;
            font-size: 11px;
            line-height: 1.5;
            opacity: 0.92;
        }
        .rx-clinic .contact span {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            margin-right: 12px;
        }
        .rx-badge {
            text-align: center;
            background: rgba(255,255,255,0.15);
            border: 2px solid rgba(255,255,255,0.35);
            border-radius: 10px;
            padding: 10px 14px;
            min-width: 100px;
        }
        .rx-badge__icon {
            font-size: 28px;
            font-weight: 800;
            font-family: Georgia, serif;
            color: #90e0ef;
            line-height: 1;
        }
        .rx-badge__label {
            font-size: 10px;
            font-weight: 700;
            letter-spacing: 1px;
            margin-top: 4px;
            text-transform: uppercase;
        }

        /* ── Meta bar ── */
        .rx-meta-bar {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 8px 20px;
            background: linear-gradient(90deg, #f0f9ff, #ecfeff);
            border-bottom: 2px solid var(--apollo-teal);
            font-size: 11px;
            color: var(--muted);
        }
        .rx-meta-bar strong { color: var(--apollo-dark); }

        /* ── Patient card ── */
        .rx-patient-card {
            margin: 14px 16px;
            border-radius: 10px;
            overflow: hidden;
            border: 2px solid #bae6fd;
            box-shadow: 0 2px 12px rgba(0, 119, 182, 0.08);
        }
        .rx-patient-card__title {
            background: linear-gradient(90deg, var(--apollo-blue), var(--apollo-teal));
            color: #fff;
            padding: 7px 14px;
            font-size: 11px;
            font-weight: 700;
            letter-spacing: 1.2px;
            text-transform: uppercase;
        }
        .rx-patient-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            background: #fff;
        }
        .rx-patient-cell {
            display: flex;
            border-bottom: 1px solid #e0f2fe;
            border-right: 1px solid #e0f2fe;
            font-size: 12px;
        }
        .rx-patient-cell:nth-child(2n) { border-right: none; }
        .rx-patient-cell.full {
            grid-column: 1 / -1;
            border-right: none;
        }
        .rx-patient-cell:last-child,
        .rx-patient-cell:nth-last-child(2):nth-child(odd) { border-bottom: none; }
        .rx-patient-label {
            min-width: 130px;
            padding: 8px 12px;
            background: linear-gradient(180deg, #f0f9ff, #e0f2fe);
            color: var(--apollo-dark);
            font-weight: 700;
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 0.4px;
            border-right: 1px solid #bae6fd;
            display: flex;
            align-items: center;
        }
        .rx-patient-value {
            flex: 1;
            padding: 8px 12px;
            font-weight: 600;
            color: var(--text);
        }
        .rx-patient-value.highlight {
            color: var(--apollo-dark);
            font-size: 13px;
        }

        /* ── Body ── */
        .rx-body-wrap {
            margin: 0 16px 16px;
            border-radius: 10px;
            border: 1px solid #e0f2fe;
            background: #fff;
            min-height: 380px;
            position: relative;
        }
        .rx-body-wrap__head {
            padding: 8px 14px;
            background: linear-gradient(90deg, var(--apollo-green), #059669);
            color: #fff;
            font-size: 11px;
            font-weight: 700;
            letter-spacing: 1px;
            text-transform: uppercase;
            border-radius: 9px 9px 0 0;
        }
        .rx-body {
            padding: 14px 16px 20px;
            font-family: "Times New Roman", Times, serif;
            font-size: 13.5px;
            line-height: 1.65;
            color: #1a1a2e;
        }
        .rx-section-title {
            margin: 14px 0 6px;
            padding: 4px 10px;
            background: linear-gradient(90deg, #e0f2fe, transparent);
            border-left: 4px solid var(--apollo-blue);
            font-weight: 800;
            text-transform: uppercase;
            font-size: 13px;
            color: var(--apollo-dark);
            font-family: "Segoe UI", sans-serif;
            letter-spacing: 0.3px;
        }
        .rx-section-title:first-child { margin-top: 0; }
        .rx-line {
            margin: 0 0 5px;
            text-align: justify;
            padding-left: 4px;
        }
        .rx-line strong { color: var(--apollo-dark); }

        .rx-callout {
            margin-top: 16px;
            border-radius: 8px;
            overflow: hidden;
            border: 1px solid #bae6fd;
        }
        .rx-callout__title {
            padding: 6px 12px;
            font-size: 11px;
            font-weight: 700;
            letter-spacing: 0.8px;
            text-transform: uppercase;
            color: #fff;
        }
        .rx-callout--impression .rx-callout__title {
            background: linear-gradient(90deg, var(--apollo-gold), #e76f51);
        }
        .rx-callout--recommend .rx-callout__title {
            background: linear-gradient(90deg, var(--apollo-green), #047857);
        }
        .rx-callout__body {
            padding: 10px 14px;
            white-space: pre-wrap;
            line-height: 1.6;
            background: #fffbeb;
            font-size: 13px;
        }
        .rx-callout--recommend .rx-callout__body { background: #f0fdf4; }

        /* ── Signature ── */
        .rx-sign-row {
            margin: 0 16px 16px;
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            gap: 20px;
        }
        .rx-qr-placeholder {
            width: 72px;
            height: 72px;
            border: 2px dashed #bae6fd;
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 9px;
            color: var(--muted);
            text-align: center;
            background: var(--apollo-soft);
        }
        .rx-sign {
            text-align: right;
            flex: 1;
        }
        .rx-sign-line {
            width: 200px;
            margin-left: auto;
            border-top: 2px solid var(--apollo-blue);
            padding-top: 8px;
        }
        .rx-sign strong {
            font-size: 15px;
            color: var(--apollo-dark);
        }
        .rx-sign p {
            font-size: 11px;
            color: var(--muted);
            margin-top: 2px;
        }
        .rx-sign .stamp {
            display: inline-block;
            margin-top: 6px;
            padding: 3px 10px;
            background: linear-gradient(135deg, #fef3c7, #fde68a);
            border: 1px solid #f59e0b;
            border-radius: 4px;
            font-size: 10px;
            font-weight: 700;
            color: #92400e;
            letter-spacing: 0.5px;
        }

        /* ── Footer ── */
        .rx-footer {
            background: linear-gradient(135deg, var(--apollo-dark) 0%, #01579b 100%);
            color: #fff;
            padding: 14px 20px;
            font-size: 10px;
            line-height: 1.5;
        }
        .rx-footer__rich { opacity: 0.95; }
        .rx-footer__rich ul, .rx-footer__rich ol { padding-left: 1.2rem; margin: 4px 0; }
        .rx-footer__rich a { color: #90e0ef; }
        .rx-footer__note {
            margin-top: 8px;
            padding-top: 8px;
            border-top: 1px solid rgba(255,255,255,0.2);
            font-weight: 600;
            color: #90e0ef;
        }
        .rx-bottom-stripe {
            height: 4px;
            background: linear-gradient(90deg, var(--apollo-green), var(--apollo-teal), var(--apollo-blue), var(--apollo-dark));
        }
        .rx-pto {
            text-align: right;
            padding: 6px 16px 10px;
            font-size: 10px;
            color: var(--muted);
            font-weight: 600;
        }

        @media print {
            body { background: #fff; padding: 0; }
            .no-print { display: none; }
            .rx-sheet {
                box-shadow: none;
                border-radius: 0;
                max-width: 100%;
            }
            .rx-header { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .rx-patient-card__title,
            .rx-body-wrap__head,
            .rx-callout__title,
            .rx-footer,
            .rx-top-stripe,
            .rx-bottom-stripe { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
    </style>
</head>
<body>
    <div class="rx-sheet">
        <div class="rx-top-stripe"></div>

        @if(!empty($branding['logo']))
            <div class="rx-watermark">
                <img src="{{ $branding['logo'] }}" alt="">
            </div>
        @endif
        <div class="rx-watermark-rx">℞</div>

        <div class="rx-content">
            <div class="no-print">
                <button type="button" onclick="window.print()">Print / Save as PDF</button>
            </div>

            <header class="rx-header">
                <div class="rx-logo-wrap">
                    @if(!empty($branding['logo']))
                        <img src="{{ $branding['logo'] }}" alt="{{ $branding['name'] }}" class="rx-logo">
                    @else
                        <div class="rx-logo-placeholder">LOGO</div>
                    @endif
                </div>
                <div class="rx-clinic">
                    @php
                        $nameParts = preg_split('/\s+(DIAGNOSTIC|POLYCLINIC|CENTRE|CENTER|HOSPITAL|CLINIC)/i', $branding['name'], 2, PREG_SPLIT_DELIM_CAPTURE);
                    @endphp
                    <h1>
                        @if(count($nameParts) >= 3)
                            {{ strtoupper(trim($nameParts[0])) }} <span class="accent">{{ strtoupper(trim($nameParts[1].' '.$nameParts[2])) }}</span>
                        @else
                            {{ strtoupper($branding['name']) }}
                        @endif
                    </h1>
                    @if(!empty($branding['division']))
                        <div class="division">{{ strtoupper($branding['division']) }}</div>
                    @endif
                    <div class="contact">
                        @if(!empty($branding['address']))
                            <span>{{ $branding['address'] }}</span><br>
                        @endif
                        @if(!empty($branding['phone']))
                            <span>Tel: {{ $branding['phone'] }}</span>
                        @endif
                        @if(!empty($branding['email']))
                            <span>&nbsp;|&nbsp; Email: {{ $branding['email'] }}</span>
                        @endif
                        @if(!empty($branding['website']))
                            <span>&nbsp;|&nbsp; Web: {{ $branding['website'] }}</span>
                        @endif
                    </div>
                </div>
                <div class="rx-badge">
                    <div class="rx-badge__icon">℞</div>
                    <div class="rx-badge__label">Prescription</div>
                </div>
            </header>

            <div class="rx-meta-bar">
                <span>Report ID: <strong>{{ $order->order_number }}</strong></span>
                <span>Date: <strong>{{ $reportDate->format('d M Y, h:i A') }}</strong></span>
                @if(!empty($branding['gst_number']))
                    <span>GST: <strong>{{ $branding['gst_number'] }}</strong></span>
                @endif
            </div>

            <div class="rx-patient-card">
                <div class="rx-patient-card__title">Patient Information</div>
                <div class="rx-patient-grid">
                    <div class="rx-patient-cell">
                        <div class="rx-patient-label">Patient Name</div>
                        <div class="rx-patient-value highlight">{{ strtoupper($patient->name ?? '—') }}</div>
                    </div>
                    <div class="rx-patient-cell">
                        <div class="rx-patient-label">Age / Sex</div>
                        <div class="rx-patient-value">{{ $patientAgeSex }}</div>
                    </div>
                    <div class="rx-patient-cell">
                        <div class="rx-patient-label">Ref. By Dr.</div>
                        <div class="rx-patient-value">{{ $referredBy ?: '—' }}</div>
                    </div>
                    <div class="rx-patient-cell">
                        <div class="rx-patient-label">Patient ID</div>
                        <div class="rx-patient-value">{{ $patient->patient_code ?? '—' }}</div>
                    </div>
                    <div class="rx-patient-cell full">
                        <div class="rx-patient-label">Test / Scan</div>
                        <div class="rx-patient-value highlight">{{ strtoupper($serviceName) }}</div>
                    </div>
                </div>
            </div>

            <div class="rx-body-wrap">
                <div class="rx-body-wrap__head">Clinical Findings & Prescription</div>
                <div class="rx-body">
                    @if(!empty($findingsHtml))
                        {!! $findingsHtml !!}
                    @else
                        <p class="rx-line"><em>No prescription / findings recorded.</em></p>
                    @endif

                    @if(!empty($report?->impression))
                        <div class="rx-callout rx-callout--impression">
                            <div class="rx-callout__title">Impression</div>
                            <div class="rx-callout__body">{{ $report->impression }}</div>
                        </div>
                    @endif

                    @if(!empty($report?->recommendations))
                        <div class="rx-callout rx-callout--recommend">
                            <div class="rx-callout__title">Recommendations & Advice</div>
                            <div class="rx-callout__body">{{ $report->recommendations }}</div>
                        </div>
                    @endif
                </div>
            </div>

            <div class="rx-sign-row">
                <div class="rx-qr-placeholder">Scan for<br>digital copy</div>
                <div class="rx-sign">
                    <div class="rx-sign-line">
                        <strong>{{ $doctorName }}</strong>
                        @if(!empty($doctorQualification))
                            <p>{{ $doctorQualification }}</p>
                        @endif
                        <p>Consultant &amp; Authorized Signatory</p>
                        <span class="stamp">VERIFIED</span>
                    </div>
                </div>
            </div>

            @if(!empty($branding['footer_content']) || !empty($branding['invoice_footer']))
                <footer class="rx-footer">
                    @if(!empty($branding['footer_content']))
                        <div class="rx-footer__rich">{!! $branding['footer_content'] !!}</div>
                    @endif
                    @if(!empty($branding['invoice_footer']))
                        <div class="rx-footer__note">{{ $branding['invoice_footer'] }}</div>
                    @endif
                </footer>
            @endif

            <div class="rx-pto">P.T.O....</div>
            <div class="rx-bottom-stripe"></div>
        </div>
    </div>
</body>
</html>
