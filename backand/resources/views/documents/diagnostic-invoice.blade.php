<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Invoice — {{ $order->order_number }}</title>
    <style>
        :root {
            --accent: #0d9488;
            --accent-dark: #0f766e;
            --text: #1e293b;
            --muted: #64748b;
            --line: #99f6e4;
            --soft: #f0fdfa;
            --danger: #b45309;
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
        .no-print button:hover { border-color: var(--accent); color: var(--accent-dark); }

        /* ── Header ── */
        .header {
            display: grid;
            grid-template-columns: 1fr auto;
            gap: 24px;
            align-items: start;
            margin-bottom: 28px;
            padding-bottom: 22px;
            border-bottom: 2px solid var(--accent);
        }

        .brand {
            display: flex;
            align-items: center;
            gap: 14px;
        }

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
            letter-spacing: 0.04em;
            flex-shrink: 0;
        }

        .brand-name {
            font-size: 22px;
            font-weight: 700;
            letter-spacing: 0.06em;
            text-transform: uppercase;
            color: var(--text);
            line-height: 1.15;
        }

        .brand-tag {
            margin-top: 4px;
            font-size: 12px;
            color: var(--muted);
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
            align-items: stretch;
            text-align: right;
        }

        .invoice-meta__divider {
            width: 2px;
            background: var(--accent);
            border-radius: 2px;
            align-self: stretch;
        }

        .invoice-meta__body { min-width: 168px; }

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
            color: var(--text);
        }

        .meta-row span:first-child {
            color: var(--muted);
            font-weight: 600;
        }

        /* ── Parties ── */
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
            color: var(--text);
            margin-bottom: 4px;
        }

        .party-lines {
            font-size: 12px;
            color: var(--muted);
            line-height: 1.55;
        }

        .party-lines strong { color: var(--text); font-weight: 600; }

        /* ── Items table ── */
        .items {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 18px;
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
        .items td.num {
            text-align: right;
            white-space: nowrap;
        }

        .items td {
            padding: 10px 12px;
            font-size: 12px;
            border: 1px solid var(--line);
            vertical-align: top;
            color: var(--text);
        }

        .items tbody tr:nth-child(even) td { background: var(--soft); }

        .amount-words {
            font-size: 12px;
            color: var(--muted);
            margin-bottom: 22px;
        }

        .amount-words strong { color: var(--text); }

        /* ── Footer grid ── */
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

        .summary {
            width: 100%;
            border-collapse: collapse;
        }

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
            letter-spacing: 0.03em;
        }

        .summary tr.total td:first-child {
            color: #fff;
            text-transform: uppercase;
        }

        .summary tr.due td:last-child { color: var(--danger); }

        .thanks {
            text-align: center;
            margin-top: 10px;
            padding-top: 18px;
            border-top: 1px solid #e2e8f0;
            font-family: "Segoe Script", "Brush Script MT", "Apple Chancery", cursive;
            font-size: 26px;
            color: var(--accent);
            line-height: 1.2;
        }

        .thanks-sub {
            text-align: center;
            margin-top: 6px;
            font-size: 11px;
            color: var(--muted);
            font-family: "Segoe UI", Arial, Helvetica, sans-serif;
        }

        .posted {
            margin-top: 14px;
            display: flex;
            justify-content: space-between;
            gap: 12px;
            font-size: 11px;
            color: var(--muted);
        }

        @media print {
            body { background: #fff; padding: 0; }
            .no-print { display: none; }
            .sheet { box-shadow: none; max-width: none; padding: 18px 22px; }
        }

        @media (max-width: 640px) {
            .sheet { padding: 22px 18px; }
            .header, .parties, .bottom { grid-template-columns: 1fr; }
            .invoice-meta { justify-content: flex-start; text-align: left; }
            .meta-row { justify-content: flex-start; }
            .invoice-meta__divider { display: none; }
            .posted { flex-direction: column; }
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
                        {{ strtoupper(substr(preg_replace('/[^A-Za-z]/', '', $branding['name'] ?: 'AM') ?: 'AM', 0, 2)) }}
                    </div>
                @endif
                <div>
                    <div class="brand-name">{{ $branding['name'] }}</div>
                    @if(!empty($branding['division']))
                        <div class="brand-tag">{{ $branding['division'] }}</div>
                    @endif
                    <div class="brand-contact">
                        @if(!empty($branding['address']))
                            {{ $branding['address'] }}<br>
                        @endif
                        @if(!empty($branding['phone'])) {{ $branding['phone'] }} @endif
                        @if(!empty($branding['email']))
                            @if(!empty($branding['phone'])) · @endif
                            {{ $branding['email'] }}
                        @endif
                        @if(!empty($branding['gst_number']))
                            <br>GSTIN: {{ $branding['gst_number'] }}
                        @endif
                    </div>
                </div>
            </div>

            <div class="invoice-meta">
                <div class="invoice-meta__divider" aria-hidden="true"></div>
                <div class="invoice-meta__body">
                    <div class="invoice-title">INVOICE</div>
                    <div class="meta-row"><span>Invoice Number:</span><span>{{ $order->order_number }}</span></div>
                    <div class="meta-row"><span>Date:</span><span>{{ $billDate->format('jS M, Y') }}</span></div>
                    @if($deliveryDate && $deliveryDate !== '—')
                        <div class="meta-row"><span>Report Due:</span><span>{{ $deliveryDate }}</span></div>
                    @endif
                    <div class="meta-row"><span>Status:</span><span>{{ ucfirst(str_replace('_', ' ', $paymentStatus ?? 'pending')) }}</span></div>
                </div>
            </div>
        </div>

        <div class="parties">
            <div>
                <div class="party-label">Bill To</div>
                <div class="party-name">{{ $patient->name ?? '—' }}</div>
                <div class="party-lines">
                    @if(!empty($patient->patient_code))
                        <strong>PID:</strong> {{ $patient->patient_code }}<br>
                    @endif
                    @if(!empty($patient->address))
                        {{ $patient->address }}<br>
                    @endif
                    Age / Sex: {{ $patientAge }} / {{ $patientGender }}<br>
                    @if(!empty($patient->phone))
                        Phone: {{ $patient->phone }}<br>
                    @endif
                    @if(!empty($patient->email))
                        Email: {{ $patient->email }}
                    @endif
                </div>
            </div>
            <div>
                <div class="party-label">Service Details</div>
                <div class="party-name">{{ $serviceName }}</div>
                <div class="party-lines">
                    @if(!empty($referredBy))
                        <strong>Referred By:</strong> {{ $referredBy }}<br>
                    @endif
                    @if($order->branch?->name)
                        <strong>Branch / Room:</strong> {{ $order->branch->name }}<br>
                    @endif
                    @if($order->queue_serial)
                        <strong>Token No:</strong> {{ $order->queue_serial }}<br>
                    @endif
                    @if(!empty($branding['website']))
                        Reports: {{ $branding['website'] }}
                    @endif
                </div>
            </div>
        </div>

        <table class="items">
            <thead>
                <tr>
                    <th>Description</th>
                    <th>Token</th>
                    <th>Branch</th>
                    <th>Report Due</th>
                    <th class="num">Amount</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>{{ $serviceName }}</td>
                    <td>{{ $order->queue_serial ?? '—' }}</td>
                    <td>{{ $order->branch?->name ?? '—' }}</td>
                    <td>{{ $deliveryDate }}</td>
                    <td class="num">{{ $currencySymbol }}{{ number_format($gross, 2) }}</td>
                </tr>
            </tbody>
        </table>

        <div class="amount-words">
            <strong>Amount in words:</strong> {{ $amountInWords }}
        </div>

        <div class="bottom">
            <div>
                <div class="pay-label">Payment Details</div>
                <div class="pay-body">
                    <strong>Payment Status:</strong> {{ ucfirst(str_replace('_', ' ', $paymentStatus ?? 'pending')) }}<br>
                    <strong>Paid Amount:</strong> {{ $currencySymbol }}{{ number_format($paid, 2) }}<br>
                    @if($due > 0)
                        <strong>Balance Due:</strong> {{ $currencySymbol }}{{ number_format($due, 2) }}<br>
                    @endif
                    <strong>Posted By:</strong> {{ $postedBy }}
                    @if(!empty($branding['invoice_footer']))
                        <br><br>{{ $branding['invoice_footer'] }}
                    @endif
                </div>
            </div>

            <table class="summary">
                <tr>
                    <td>Subtotal</td>
                    <td>{{ $currencySymbol }}{{ number_format($gross, 2) }}</td>
                </tr>
                @if(($packageAdjusted ?? 0) > 0)
                    <tr>
                        <td>Package Discount{{ !empty($packageName) ? ' ('.$packageName.')' : '' }}</td>
                        <td>−{{ $currencySymbol }}{{ number_format($packageAdjusted, 2) }}</td>
                    </tr>
                @endif
                @if($adjusted > 0)
                    <tr>
                        <td>Referral Discount</td>
                        <td>−{{ $currencySymbol }}{{ number_format($adjusted, 2) }}</td>
                    </tr>
                @endif
                @if(($extraDiscount ?? 0) > 0)
                    <tr>
                        <td>Extra Discount</td>
                        <td>−{{ $currencySymbol }}{{ number_format($extraDiscount, 2) }}</td>
                    </tr>
                @endif
                @if(($taxable ?? $payable) != $payable || !empty($tax['enabled']))
                    <tr>
                        <td>Taxable Amount</td>
                        <td>{{ $currencySymbol }}{{ number_format($taxable ?? $payable, 2) }}</td>
                    </tr>
                @endif
                @if(!empty($tax['enabled']) && ($tax['cgst_amount'] ?? 0) > 0)
                    <tr>
                        <td>CGST @ {{ number_format($tax['cgst_rate'], 2) }}%</td>
                        <td>{{ $currencySymbol }}{{ number_format($tax['cgst_amount'], 2) }}</td>
                    </tr>
                    <tr>
                        <td>SGST @ {{ number_format($tax['sgst_rate'], 2) }}%</td>
                        <td>{{ $currencySymbol }}{{ number_format($tax['sgst_amount'], 2) }}</td>
                    </tr>
                @endif
                @if(!empty($tax['enabled']) && ($tax['igst_amount'] ?? 0) > 0)
                    <tr>
                        <td>IGST @ {{ number_format($tax['igst_rate'], 2) }}%</td>
                        <td>{{ $currencySymbol }}{{ number_format($tax['igst_amount'], 2) }}</td>
                    </tr>
                @endif
                @if(!empty($tax['enabled']) && ($tax['tax_amount'] ?? 0) > 0)
                    <tr>
                        <td>Total Tax</td>
                        <td>{{ $currencySymbol }}{{ number_format($tax['tax_amount'], 2) }}</td>
                    </tr>
                @endif
                <tr>
                    <td>Paid</td>
                    <td>{{ $currencySymbol }}{{ number_format($paid, 2) }}</td>
                </tr>
                @if($due > 0)
                    <tr class="due">
                        <td>Due</td>
                        <td>{{ $currencySymbol }}{{ number_format($due, 2) }}</td>
                    </tr>
                @endif
                <tr class="total">
                    <td>Total</td>
                    <td>{{ $currencySymbol }}{{ number_format($payable, 2) }}</td>
                </tr>
            </table>
        </div>

        <div class="thanks">Thank you for choosing us</div>
        <div class="thanks-sub">
            We appreciate your trust in {{ $branding['name'] ?: 'ApnaMedi' }}. Wishing you good health.
            @if(!empty($branding['website']))
                · Visit {{ $branding['website'] }} to view or download your report
            @endif
        </div>

        <div class="posted">
            <span>Printed: {{ $printedAt->format('d/m/Y H:i') }}</span>
            <span>Ref: {{ $order->order_number }}</span>
        </div>
    </div>
</body>
</html>
