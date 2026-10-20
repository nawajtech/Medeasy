<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Invoice {{ $billing->invoice_number }}</title>
    <style>
        :root {
            --accent: #0d9488;
            --accent-dark: #0f766e;
            --text: #1e293b;
            --muted: #64748b;
            --line: #99f6e4;
            --soft: #f0fdfa;
            --danger: #b91c1c;
        }

        * { box-sizing: border-box; margin: 0; padding: 0; }

        body {
            font-family: "Segoe UI", Arial, Helvetica, sans-serif;
            font-size: 13px;
            color: var(--text);
            background: #e2e8f0;
            padding: 20px;
        }

        .sheet {
            max-width: 820px;
            margin: 0 auto;
            background: #fff;
            padding: 36px 40px 28px;
            box-shadow: 0 8px 28px rgba(15, 23, 42, 0.08);
        }

        .no-print { margin-bottom: 14px; text-align: right; }
        .no-print button {
            padding: 8px 16px;
            cursor: pointer;
            border: 1px solid #cbd5e1;
            border-radius: 6px;
            background: #fff;
            color: var(--text);
            font-size: 13px;
        }

        .header {
            display: grid;
            grid-template-columns: 1fr auto;
            gap: 24px;
            align-items: start;
            margin-bottom: 28px;
            padding-bottom: 22px;
            border-bottom: 2px solid var(--accent);
        }

        .brand { display: flex; align-items: center; gap: 14px; }

        .brand-logo {
            width: 72px;
            height: 72px;
            object-fit: contain;
            border-radius: 10px;
            background: #fff;
            border: 1px solid #e2e8f0;
            flex-shrink: 0;
        }

        .brand-logo-fallback {
            width: 72px;
            height: 72px;
            border-radius: 10px;
            background: linear-gradient(145deg, var(--accent), var(--accent-dark));
            color: #fff;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 22px;
            font-weight: 700;
            flex-shrink: 0;
        }

        .brand-name {
            font-size: 22px;
            font-weight: 700;
            letter-spacing: 0.06em;
            text-transform: uppercase;
            color: var(--text);
        }

        .brand-contact {
            margin-top: 6px;
            font-size: 11px;
            color: var(--muted);
            line-height: 1.45;
        }

        .invoice-meta {
            display: flex;
            gap: 16px;
            text-align: right;
        }

        .invoice-meta__divider {
            width: 2px;
            background: var(--accent);
            border-radius: 2px;
            align-self: stretch;
        }

        .invoice-title {
            font-size: 34px;
            font-weight: 800;
            letter-spacing: 0.08em;
            color: var(--accent);
            line-height: 1;
            margin-bottom: 12px;
        }

        .meta-row {
            display: flex;
            justify-content: flex-end;
            gap: 8px;
            font-size: 12px;
            line-height: 1.55;
        }

        .meta-row span:first-child { color: var(--muted); font-weight: 600; }

        .parties {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 28px;
            margin-bottom: 26px;
        }

        .party-label {
            font-size: 12px;
            font-weight: 700;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            color: var(--accent);
            margin-bottom: 8px;
        }

        .party-name {
            font-size: 15px;
            font-weight: 700;
            margin-bottom: 4px;
        }

        .party-lines {
            font-size: 12px;
            color: var(--muted);
            line-height: 1.55;
        }

        .party-lines strong { color: var(--text); font-weight: 600; }

        .items {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 22px;
            border: 1.5px solid var(--accent);
        }

        .items th {
            background: var(--accent);
            color: #fff;
            font-size: 11px;
            font-weight: 700;
            letter-spacing: 0.06em;
            text-transform: uppercase;
            padding: 10px 12px;
            text-align: left;
            border: 1px solid var(--accent-dark);
        }

        .items th.num,
        .items td.num { text-align: right; white-space: nowrap; }

        .items td {
            padding: 10px 12px;
            font-size: 12px;
            border: 1px solid var(--line);
        }

        .items tbody tr:nth-child(even) td { background: var(--soft); }

        .bottom {
            display: grid;
            grid-template-columns: 1.15fr 0.85fr;
            gap: 28px;
            align-items: start;
            margin-bottom: 22px;
        }

        .pay-label {
            font-size: 12px;
            font-weight: 700;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            color: var(--accent);
            margin-bottom: 8px;
        }

        .pay-body {
            font-size: 12px;
            color: var(--muted);
            line-height: 1.6;
        }

        .pay-body strong { color: var(--text); }

        .summary { width: 100%; border-collapse: collapse; }

        .summary td {
            padding: 7px 10px;
            font-size: 12px;
            border-bottom: 1px solid #e2e8f0;
        }

        .summary td:first-child {
            color: var(--muted);
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.04em;
            font-size: 11px;
        }

        .summary td:last-child {
            text-align: right;
            font-weight: 600;
            white-space: nowrap;
        }

        .summary tr.total td {
            background: var(--accent);
            color: #fff;
            font-size: 14px;
            font-weight: 700;
            border-bottom: none;
            padding: 11px 12px;
        }

        .summary tr.total td:first-child { color: #fff; text-transform: uppercase; }
        .summary tr.due td:last-child { color: var(--danger); }

        .thanks {
            text-align: center;
            margin-top: 10px;
            padding-top: 18px;
            border-top: 1px solid #e2e8f0;
            font-family: "Segoe Script", "Brush Script MT", "Apple Chancery", cursive;
            font-size: 26px;
            color: var(--accent);
        }

        .thanks-sub {
            text-align: center;
            margin-top: 6px;
            font-size: 11px;
            color: var(--muted);
            font-family: "Segoe UI", Arial, Helvetica, sans-serif;
        }

        @media print {
            body { background: #fff; padding: 0; }
            .no-print { display: none; }
            .sheet { box-shadow: none; max-width: none; padding: 18px 22px; }
        }

        @media (max-width: 640px) {
            .header, .parties, .bottom { grid-template-columns: 1fr; }
            .invoice-meta { text-align: left; }
            .meta-row { justify-content: flex-start; }
            .invoice-meta__divider { display: none; }
        }
    </style>
</head>
<body>
    <div class="no-print">
        <button type="button" onclick="window.print()">Print / Save as PDF</button>
    </div>

    <div class="sheet">
        <div class="header">
            <div class="brand">
                @if(!empty($branding['logo']))
                    <img src="{{ $branding['logo'] }}" alt="{{ $branding['name'] }}" class="brand-logo">
                @else
                    <div class="brand-logo-fallback">
                        {{ strtoupper(substr(preg_replace('/[^A-Za-z]/', '', $branding['name'] ?? 'AM') ?: 'AM', 0, 2)) }}
                    </div>
                @endif
                <div>
                    <div class="brand-name">{{ $branding['name'] }}</div>
                    <div class="brand-contact">
                        @if(!empty($branding['address'])){{ $branding['address'] }}<br>@endif
                        @if(!empty($branding['phone'])){{ $branding['phone'] }}@endif
                        @if(!empty($branding['email']))
                            @if(!empty($branding['phone'])) · @endif
                            {{ $branding['email'] }}
                        @endif
                    </div>
                </div>
            </div>

            <div class="invoice-meta">
                <div class="invoice-meta__divider" aria-hidden="true"></div>
                <div>
                    <div class="invoice-title">INVOICE</div>
                    <div class="meta-row"><span>Invoice Number:</span><span>{{ $billing->invoice_number }}</span></div>
                    <div class="meta-row"><span>Date:</span><span>{{ $billing->billed_at->format('jS M, Y') }}</span></div>
                    <div class="meta-row"><span>Status:</span><span>{{ ucfirst($billing->status) }}</span></div>
                </div>
            </div>
        </div>

        <div class="parties">
            <div>
                <div class="party-label">Bill To</div>
                <div class="party-name">{{ $billing->patient->name }}</div>
                <div class="party-lines">
                    <strong>PID:</strong> {{ $billing->patient->patient_code }}<br>
                    @if(!empty($billing->patient->phone))Phone: {{ $billing->patient->phone }}<br>@endif
                    @if(!empty($billing->patient->email))Email: {{ $billing->patient->email }}@endif
                </div>
            </div>
            <div>
                <div class="party-label">Visit Details</div>
                @if($appointment)
                    <div class="party-name">{{ $appointment->doctor->user->name ?? 'Doctor' }}</div>
                    <div class="party-lines">
                        {{ $appointment->doctor->department->name ?? 'Consultation' }}<br>
                        <strong>Visit:</strong> {{ $appointment->appointment_date->format('jS M, Y h:i A') }}
                    </div>
                @else
                    <div class="party-name">Clinic visit</div>
                    <div class="party-lines">Consultation billing</div>
                @endif
            </div>
        </div>

        <table class="items">
            <thead>
                <tr>
                    <th>Description</th>
                    <th class="num">Amount</th>
                </tr>
            </thead>
            <tbody>
                @if($billing->previous_due > 0)
                    <tr>
                        <td>Previous balance due</td>
                        <td class="num">{{ $currencySymbol }}{{ number_format($billing->previous_due, 2) }}</td>
                    </tr>
                @endif
                <tr>
                    <td>Doctor charge (this visit)</td>
                    <td class="num">{{ $currencySymbol }}{{ number_format($billing->charge_amount, 2) }}</td>
                </tr>
            </tbody>
        </table>

        <div class="bottom">
            <div>
                <div class="pay-label">Payment Details</div>
                <div class="pay-body">
                    <strong>Payment Status:</strong> {{ ucfirst($billing->status) }}<br>
                    <strong>Paid Amount:</strong> {{ $currencySymbol }}{{ number_format($billing->paid_amount, 2) }}<br>
                    @if($billing->due_amount > 0)
                        <strong>Balance Due:</strong> {{ $currencySymbol }}{{ number_format($billing->due_amount, 2) }}<br>
                    @endif
                    @if($billing->notes)
                        <br><strong>Notes:</strong> {{ $billing->notes }}
                    @endif
                    @if(!empty($branding['invoice_footer']))
                        <br><br>{{ $branding['invoice_footer'] }}
                    @endif
                </div>
            </div>

            <table class="summary">
                <tr>
                    <td>Previous Due</td>
                    <td>{{ $currencySymbol }}{{ number_format($billing->previous_due, 2) }}</td>
                </tr>
                <tr>
                    <td>Doctor Charge</td>
                    <td>{{ $currencySymbol }}{{ number_format($billing->charge_amount, 2) }}</td>
                </tr>
                <tr>
                    <td>Paid</td>
                    <td>−{{ $currencySymbol }}{{ number_format($billing->paid_amount, 2) }}</td>
                </tr>
                @if($billing->due_amount > 0)
                    <tr class="due">
                        <td>Due</td>
                        <td>{{ $currencySymbol }}{{ number_format($billing->due_amount, 2) }}</td>
                    </tr>
                @endif
                <tr class="total">
                    <td>Total</td>
                    <td>{{ $currencySymbol }}{{ number_format($billing->total_amount, 2) }}</td>
                </tr>
            </table>
        </div>

        <div class="thanks">Thank you for choosing us</div>
        <div class="thanks-sub">
            We appreciate your trust in {{ $branding['name'] ?: 'ApnaMedi' }}. Wishing you good health.
        </div>
    </div>
</body>
</html>
