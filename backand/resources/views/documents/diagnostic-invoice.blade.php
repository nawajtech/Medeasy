<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Bill — {{ $order->order_number }}</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: Arial, Helvetica, sans-serif;
            font-size: 12px;
            color: #111;
            background: #dbeef8;
            padding: 12px;
        }
        .bill-sheet {
            max-width: 820px;
            margin: 0 auto;
            background: #dbeef8;
            border: 1px solid #9cbfd4;
            padding: 14px 16px 18px;
        }
        .no-print {
            margin-bottom: 10px;
            text-align: right;
        }
        .no-print button {
            padding: 6px 14px;
            cursor: pointer;
            border: 1px solid #64748b;
            border-radius: 4px;
            background: #fff;
            font-size: 12px;
        }
        .print-meta {
            font-size: 11px;
            margin-bottom: 6px;
        }
        .bill-header {
            display: grid;
            grid-template-columns: 72px 1fr;
            gap: 10px;
            align-items: start;
            margin-bottom: 8px;
        }
        .bill-logo {
            width: 68px;
            height: 68px;
            object-fit: contain;
            background: #fff;
            border: 1px solid #94a3b8;
        }
        .bill-logo-placeholder {
            width: 68px;
            height: 68px;
            border: 1px solid #94a3b8;
            background: #fff;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 10px;
            color: #64748b;
            text-align: center;
        }
        .bill-org {
            text-align: center;
        }
        .bill-org h1 {
            font-size: 16px;
            font-weight: 700;
            letter-spacing: 0.3px;
            margin-bottom: 2px;
        }
        .bill-org .division {
            font-size: 12px;
            font-weight: 700;
            margin-bottom: 4px;
        }
        .bill-org p {
            font-size: 11px;
            line-height: 1.35;
        }
        .bill-title {
            text-align: center;
            font-size: 13px;
            font-weight: 700;
            margin: 8px 0 10px;
            text-decoration: underline;
        }
        .info-box {
            border: 1px solid #111;
            padding: 8px 10px;
            margin-bottom: 10px;
            background: rgba(255,255,255,0.35);
        }
        .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 6px 12px;
        }
        .info-row {
            display: flex;
            gap: 6px;
            font-size: 11px;
            line-height: 1.35;
        }
        .info-row .label {
            font-weight: 700;
            white-space: nowrap;
        }
        .info-row .value {
            flex: 1;
        }
        .services-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 10px;
            background: rgba(255,255,255,0.25);
        }
        .services-table th,
        .services-table td {
            border: 1px solid #111;
            padding: 5px 6px;
            font-size: 11px;
            text-align: left;
        }
        .services-table th {
            font-weight: 700;
            background: rgba(255,255,255,0.45);
        }
        .services-table .num {
            text-align: right;
            white-space: nowrap;
        }
        .amount-words {
            font-size: 11px;
            font-weight: 700;
            margin: 8px 0 10px;
            text-transform: uppercase;
        }
        .summary-wrap {
            display: grid;
            grid-template-columns: 1fr 240px;
            gap: 12px;
            align-items: start;
        }
        .summary-table {
            width: 100%;
            border-collapse: collapse;
        }
        .summary-table th,
        .summary-table td {
            border: 1px solid #111;
            padding: 5px 8px;
            font-size: 11px;
        }
        .summary-table th {
            text-align: left;
            font-weight: 700;
            background: rgba(255,255,255,0.45);
        }
        .summary-table .num {
            text-align: right;
            font-weight: 700;
        }
        .bill-footer {
            margin-top: 14px;
            font-size: 11px;
            display: flex;
            justify-content: space-between;
            gap: 12px;
        }
        .bill-footer-note {
            margin-top: 8px;
            font-size: 11px;
            font-weight: 700;
            text-align: center;
        }
        @media print {
            body { background: #dbeef8; padding: 0; }
            .no-print { display: none; }
            .bill-sheet { border: none; }
        }
    </style>
</head>
<body>
    <div class="bill-sheet">
        <div class="no-print">
            <button type="button" onclick="window.print()">Print / Save as PDF</button>
        </div>

        <div class="print-meta">Print Date : {{ $printedAt->format('d/m/Y H:i') }}</div>

        <div class="bill-header">
            @if(!empty($branding['logo']))
                <img src="{{ $branding['logo'] }}" alt="{{ $branding['name'] }}" class="bill-logo">
            @else
                <div class="bill-logo-placeholder">LOGO</div>
            @endif
            <div class="bill-org">
                <h1>{{ strtoupper($branding['name']) }}</h1>
                @if(!empty($branding['division']))
                    <div class="division">{{ strtoupper($branding['division']) }}</div>
                @endif
                @if(!empty($branding['address']))
                    <p>{{ $branding['address'] }}</p>
                @endif
                <p>
                    @if(!empty($branding['phone']))
                        {{ $branding['phone'] }}
                    @endif
                    @if(!empty($branding['email']))
                        @if(!empty($branding['phone'])) &nbsp; @endif
                        {{ $branding['email'] }}
                    @endif
                </p>
                @if(!empty($branding['website']))
                    <p>{{ $branding['website'] }}</p>
                @endif
                @if(!empty($branding['gst_number']))
                    <p><strong>GST No. :</strong> {{ $branding['gst_number'] }}</p>
                @endif
            </div>
        </div>

        <div class="bill-title">Bill Cum Receipt</div>

        <div class="info-box">
            <div class="info-grid">
                <div>
                    <div class="info-row"><span class="label">PID :</span><span class="value">{{ $patient->patient_code ?? '—' }}</span></div>
                    <div class="info-row"><span class="label">Patient's Name :</span><span class="value">{{ strtoupper($patient->name) }}</span></div>
                    <div class="info-row"><span class="label">Address :</span><span class="value">{{ $patient->address ?: '—' }}</span></div>
                    <div class="info-row"><span class="label">Referred By :</span><span class="value">{{ $referredBy ?: '—' }}</span></div>
                </div>
                <div>
                    <div class="info-row"><span class="label">Bill No :</span><span class="value">{{ $order->order_number }}</span></div>
                    <div class="info-row"><span class="label">Age :</span><span class="value">{{ $patientAge }}</span></div>
                    <div class="info-row"><span class="label">Ph. No :</span><span class="value">{{ $patient->phone ?: '—' }}</span></div>
                </div>
                <div>
                    <div class="info-row"><span class="label">Bill Date :</span><span class="value">{{ $billDate->format('d/m/Y, H:i') }}</span></div>
                    <div class="info-row"><span class="label">Sex :</span><span class="value">{{ $patientGender }}</span></div>
                    <div class="info-row"><span class="label">Ptn Type :</span><span class="value">GENERAL</span></div>
                </div>
            </div>
        </div>

        <table class="services-table">
            <thead>
                <tr>
                    <th>Service Type/Name</th>
                    <th>Token No</th>
                    <th>Room No</th>
                    <th>Dlv Dt(Expt)</th>
                    <th class="num">Rate({{ $currencySymbol }})</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>{{ strtoupper($serviceName) }}</td>
                    <td>{{ $order->queue_serial ?? '—' }}</td>
                    <td>{{ $order->branch?->name ?? '—' }}</td>
                    <td>{{ $deliveryDate }}</td>
                    <td class="num">{{ number_format($gross, 2) }}</td>
                </tr>
            </tbody>
        </table>

        <div class="amount-words">Amount in Words : {{ $amountInWords }}</div>

        <div class="summary-wrap">
            <div></div>
            <table class="summary-table">
                <tr>
                    <th>Total Amount</th>
                    <td class="num">{{ number_format($gross, 2) }}</td>
                </tr>
                @if($adjusted > 0)
                    <tr>
                        <th>Adjusted Amount</th>
                        <td class="num">{{ number_format($adjusted, 2) }}</td>
                    </tr>
                @endif
                <tr>
                    <th>Payable Amount</th>
                    <td class="num">{{ number_format($payable, 2) }}</td>
                </tr>
                <tr>
                    <th>Paid Amount</th>
                    <td class="num">{{ number_format($paid, 2) }}</td>
                </tr>
                @if($due > 0)
                    <tr>
                        <th>Due Amount</th>
                        <td class="num" style="color:#b45309;font-weight:700">{{ number_format($due, 2) }}</td>
                    </tr>
                @endif
            </table>
        </div>

        <div class="bill-footer">
            <span>Posted By : {{ $postedBy }} {{ $printedAt->format('d/m/Y H:i') }}</span>
            <span>Your User Id: {{ $order->order_number }}</span>
        </div>

        @if(!empty($branding['invoice_footer']))
            <div class="bill-footer-note">{{ $branding['invoice_footer'] }}</div>
        @endif
        @if(!empty($branding['website']))
            <div class="bill-footer-note">Visit {{ $branding['website'] }} to view/download your report</div>
        @endif
    </div>
</body>
</html>
