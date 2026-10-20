<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <style>
        /* Dompdf-safe: tables + simple CSS. Project green. */
        body {
            font-family: DejaVu Sans, sans-serif;
            font-size: 11px;
            color: #1e293b;
            margin: 0;
            padding: 30px 34px;
        }
        table { border-collapse: collapse; }
        .w-full { width: 100%; }
        .muted { color: #64748b; }
        .green { color: #0f766e; }
        .right { text-align: right; }
        .top { vertical-align: top; }

        .logo-cell {
            width: 72px;
            height: 56px;
            background: #0f766e;
            color: #fff;
            text-align: center;
            vertical-align: middle;
            font-size: 16px;
            font-weight: bold;
            letter-spacing: 0.5px;
        }
        .logo-img {
            max-width: 88px;
            max-height: 56px;
            width: auto;
            height: auto;
            display: block;
        }
        .brand {
            font-size: 20px;
            font-weight: bold;
            letter-spacing: 1.5px;
            text-transform: uppercase;
            color: #0f172a;
            padding: 0;
            margin: 0;
        }
        .issuer-line {
            font-size: 9.5px;
            color: #64748b;
            line-height: 1.45;
            margin: 0;
            padding: 0;
        }

        .title {
            font-size: 26px;
            font-weight: bold;
            letter-spacing: 2px;
            color: #0f766e;
            margin: 0 0 8px 0;
            padding: 0;
        }
        .meta td {
            font-size: 10px;
            padding: 2px 0;
            color: #1e293b;
        }
        .meta .k {
            color: #64748b;
            font-weight: bold;
            padding-right: 10px;
            white-space: nowrap;
        }

        .rule {
            border: none;
            border-top: 2px solid #0f766e;
            margin: 14px 0 16px;
        }

        .greeting {
            font-size: 11px;
            color: #334155;
            margin: 0 0 14px 0;
            line-height: 1.5;
        }

        .label {
            font-size: 10px;
            font-weight: bold;
            letter-spacing: 0.8px;
            text-transform: uppercase;
            color: #0f766e;
            margin: 0 0 6px 0;
        }
        .name {
            font-size: 13px;
            font-weight: bold;
            color: #0f172a;
            margin: 0 0 4px 0;
        }
        .lines {
            font-size: 10px;
            color: #475569;
            line-height: 1.55;
        }

        .items {
            width: 100%;
            margin: 16px 0 12px;
            border: 1px solid #0f766e;
        }
        .items th {
            background: #0f766e;
            color: #ffffff;
            font-size: 10px;
            font-weight: bold;
            letter-spacing: 0.6px;
            text-transform: uppercase;
            padding: 8px 10px;
            text-align: left;
            border: 1px solid #0f766e;
        }
        .items td {
            padding: 9px 10px;
            font-size: 10.5px;
            border: 1px solid #99f6e4;
            vertical-align: top;
        }
        .items .sub {
            display: block;
            margin-top: 2px;
            font-size: 9px;
            color: #64748b;
        }

        .summary {
            width: 240px;
            margin-left: auto;
            margin-top: 4px;
        }
        .summary td {
            padding: 6px 8px;
            font-size: 10.5px;
            border-bottom: 1px solid #e2e8f0;
        }
        .summary .k {
            color: #64748b;
            font-weight: bold;
            text-transform: uppercase;
            font-size: 9.5px;
            letter-spacing: 0.4px;
        }
        .summary .v {
            text-align: right;
            font-weight: bold;
            white-space: nowrap;
        }
        .summary tr.total td {
            background: #0f766e;
            color: #ffffff;
            border-bottom: none;
            font-size: 12px;
            padding: 9px 10px;
        }
        .summary tr.total .k { color: #ffffff; font-size: 11px; }

        .pay {
            margin-top: 16px;
            padding: 10px 12px;
            background: #f0fdfa;
            border: 1px solid #99f6e4;
        }
        .pay .label { margin-bottom: 4px; }
        .pay .lines { color: #334155; }

        .thanks {
            text-align: center;
            margin-top: 28px;
            padding-top: 14px;
            border-top: 1px solid #e2e8f0;
            font-size: 15px;
            font-style: italic;
            color: #0f766e;
        }
        .thanks-sub {
            text-align: center;
            margin-top: 4px;
            font-size: 9px;
            color: #64748b;
        }

        .sign-wrap { margin-top: 26px; text-align: right; }
        .sign-line {
            display: inline-block;
            min-width: 190px;
            border-top: 1px solid #94a3b8;
            padding-top: 5px;
            font-size: 10px;
            color: #475569;
            text-align: center;
        }

        .badge {
            display: inline-block;
            padding: 2px 7px;
            font-size: 9px;
            font-weight: bold;
            letter-spacing: 0.4px;
            text-transform: uppercase;
        }
        .badge-paid { background: #dcfce7; color: #166534; }
        .badge-pending { background: #fef3c7; color: #92400e; }
        .badge-other { background: #e2e8f0; color: #334155; }
    </style>
</head>
<body>
@php
    $brand = $issuer['brand_name'] ?? 'ApnaMedi';
    $tagline = $issuer['tagline'] ?? ($issuer['office_name'] ?? null);
    $addressLines = $issuer['address_lines'] ?? array_filter([($issuer['address'] ?? null)]);
    $bank = $issuer['bank'] ?? [];
    $bankRows = collect([
        'Bank' => $bank['bank_name'] ?? null,
        'Account Name' => $bank['account_name'] ?? null,
        'Account Number' => $bank['account_number'] ?? null,
        'IFSC' => $bank['ifsc'] ?? null,
        'UPI' => $bank['upi_id'] ?? null,
    ])->filter(fn ($v) => filled($v))->all();
    $clientName = $company?->name ?? 'Valued Partner';
@endphp

{{-- Header --}}
<table class="w-full" cellpadding="0" cellspacing="0">
    <tr>
        <td class="top" style="width:62%;">
            <table cellpadding="0" cellspacing="0">
                <tr>
                    <td class="top" style="width:92px; padding-right:10px;">
                        @if(!empty($logoDataUri))
                            <img class="logo-img" src="{{ $logoDataUri }}" alt="{{ $brand }}">
                        @else
                            <table cellpadding="0" cellspacing="0" style="width:72px;height:56px;">
                                <tr>
                                    <td class="logo-cell">AM</td>
                                </tr>
                            </table>
                        @endif
                    </td>
                    <td class="top">
                        <div class="brand">{{ $brand }}</div>
                        @if(!empty($tagline))
                            <p class="issuer-line" style="margin-top:2px;">{{ $tagline }}</p>
                        @endif
                        @if(!empty($issuer['udyam_urn']))
                            <p class="issuer-line">Udyam: {{ $issuer['udyam_urn'] }}</p>
                        @endif
                        @foreach($addressLines as $line)
                            <p class="issuer-line">{{ $line }}</p>
                        @endforeach
                        <p class="issuer-line">
                            @if(!empty($issuer['phone'])){{ $issuer['phone'] }}@endif
                            @if(!empty($issuer['email']))
                                @if(!empty($issuer['phone'])) &nbsp;·&nbsp; @endif
                                {{ $issuer['email'] }}
                            @endif
                        </p>
                        @if(!empty($issuer['website']))
                            <p class="issuer-line">{{ $issuer['website'] }}</p>
                        @endif
                    </td>
                </tr>
            </table>
        </td>
        <td class="top right" style="width:38%;">
            <div class="title">INVOICE</div>
            <table class="meta" align="right" cellpadding="0" cellspacing="0">
                <tr>
                    <td class="k">Invoice No.</td>
                    <td>{{ $payment->invoice_number }}</td>
                </tr>
                <tr>
                    <td class="k">Date</td>
                    <td>{{ $invoiceDate }}</td>
                </tr>
                <tr>
                    <td class="k">Period</td>
                    <td>{{ $periodLabel }}</td>
                </tr>
                <tr>
                    <td class="k">Status</td>
                    <td>
                        <span class="badge {{ $isPaid ? 'badge-paid' : ($isPending ? 'badge-pending' : 'badge-other') }}">
                            {{ strtoupper($payment->payment_status) }}
                        </span>
                    </td>
                </tr>
            </table>
        </td>
    </tr>
</table>

<hr class="rule">

<p class="greeting">
    Dear {{ $clientName }},<br>
    Please find below your ApnaMedi subscription invoice. Thank you for your continued trust.
</p>

{{-- Parties --}}
<table class="w-full" cellpadding="0" cellspacing="0">
    <tr>
        <td class="top" style="width:50%; padding-right:16px;">
            <div class="label">Bill To</div>
            <div class="name">{{ $clientName }}</div>
            <div class="lines">
                @if($company?->address){{ $company->address }}<br>@endif
                {{ collect([$company?->city, $company?->state])->filter()->implode(', ') }}
                @if($company?->gst_number)<br>GSTIN: {{ $company->gst_number }}@endif
                @if($company?->email)<br>{{ $company->email }}@endif
                @if($company?->phone)<br>{{ $company->phone }}@endif
            </div>
        </td>
        <td class="top" style="width:50%;">
            <div class="label">Subscription</div>
            <div class="name">{{ $planName }}</div>
            <div class="lines">
                {{ ucfirst($billingCycle) }} plan<br>
                Billing period: {{ $periodLabel }}
            </div>
        </td>
    </tr>
</table>

{{-- Line items --}}
<table class="items" cellpadding="0" cellspacing="0">
    <thead>
        <tr>
            <th style="width:70%;">Description</th>
            <th style="width:10%;" class="right">Qty</th>
            <th style="width:20%;" class="right">Amount</th>
        </tr>
    </thead>
    <tbody>
        <tr>
            <td>
                ApnaMedi Subscription — {{ $planName }}
                <span class="sub">{{ ucfirst($billingCycle) }} access for the billing period</span>
            </td>
            <td class="right">1</td>
            <td class="right">{{ $money($subtotal) }}</td>
        </tr>
    </tbody>
</table>

{{-- Totals --}}
<table class="summary" cellpadding="0" cellspacing="0">
    <tr>
        <td class="k">Subtotal</td>
        <td class="v">{{ $money($subtotal) }}</td>
    </tr>
    @if($payment->tax_enabled && (float) $payment->tax_amount > 0)
        @if((float) $payment->cgst_amount > 0)
            <tr>
                <td class="k">CGST ({{ $payment->cgst_rate }}%)</td>
                <td class="v">{{ $money($payment->cgst_amount) }}</td>
            </tr>
            <tr>
                <td class="k">SGST ({{ $payment->sgst_rate }}%)</td>
                <td class="v">{{ $money($payment->sgst_amount) }}</td>
            </tr>
        @endif
        @if((float) $payment->igst_amount > 0)
            <tr>
                <td class="k">IGST ({{ $payment->igst_rate }}%)</td>
                <td class="v">{{ $money($payment->igst_amount) }}</td>
            </tr>
        @endif
    @endif
    <tr class="total">
        <td class="k">Total</td>
        <td class="v">{{ $money($payment->amount) }}</td>
    </tr>
</table>

{{-- Payment (only useful fields) --}}
<div class="pay">
    <div class="label">Payment Details</div>
    <div class="lines">
        <strong>Method:</strong> {{ $methodLabel }}
        @if($payment->transaction_reference)
            &nbsp;·&nbsp;<strong>Reference:</strong> {{ $payment->transaction_reference }}
        @endif
        @foreach($bankRows as $label => $value)
            <br><strong>{{ $label }}:</strong> {{ $value }}
        @endforeach
        @if($isPending)
            <br><span class="muted">Please complete payment and share the reference with ApnaMedi billing.</span>
        @else
            <br><span class="muted">This is a receipt for a confirmed subscription payment.</span>
        @endif
    </div>
</div>

<div class="thanks">Thank you for choosing {{ $brand }}</div>
<div class="thanks-sub">
    {{ $tagline ?: 'Healthcare Operations, Simplified' }}
    @if(!empty($issuer['email'])) · {{ $issuer['email'] }}@endif
</div>

<div class="sign-wrap">
    <div class="sign-line">{{ $issuer['signatory'] ?? 'Authorized Signatory — ApnaMedi' }}</div>
</div>
</body>
</html>
