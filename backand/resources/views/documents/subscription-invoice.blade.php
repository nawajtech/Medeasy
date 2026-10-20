<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <style>
        /* Dompdf-safe layout (tables). Accent matches ApnaMedi invoice sample. */
        * { box-sizing: border-box; }
        body {
            font-family: DejaVu Sans, sans-serif;
            font-size: 11px;
            color: #1e293b;
            margin: 0;
            padding: 28px 32px 24px;
            background: #ffffff;
        }
        .accent { color: #c2185b; }
        .muted { color: #64748b; font-size: 10px; line-height: 1.45; }
        .strong { font-weight: bold; color: #1e293b; }

        .header { width: 100%; margin-bottom: 22px; border-bottom: 2px solid #c2185b; padding-bottom: 16px; }
        .header td { vertical-align: top; }

        .logo-mark {
            width: 52px;
            height: 52px;
            background: #c2185b;
            color: #ffffff;
            text-align: center;
            line-height: 52px;
            font-size: 16px;
            font-weight: bold;
            letter-spacing: 0.5px;
        }
        .brand-name {
            font-size: 18px;
            font-weight: bold;
            letter-spacing: 2px;
            text-transform: uppercase;
            color: #1e293b;
            padding-top: 4px;
        }
        .brand-sub { font-size: 9px; color: #64748b; margin-top: 3px; line-height: 1.4; }

        .invoice-title {
            font-size: 28px;
            font-weight: bold;
            letter-spacing: 3px;
            color: #c2185b;
            text-align: right;
            line-height: 1;
            padding-bottom: 10px;
        }
        .meta-table { width: 100%; }
        .meta-table td { font-size: 10px; padding: 1px 0; text-align: right; color: #1e293b; }
        .meta-table .k { color: #64748b; font-weight: bold; padding-right: 8px; }
        .vbar {
            width: 2px;
            background: #c2185b;
        }

        .parties { width: 100%; margin: 18px 0 20px; }
        .parties td { width: 50%; vertical-align: top; padding-right: 18px; }
        .parties td + td { padding-right: 0; padding-left: 18px; }
        .party-label {
            font-size: 11px;
            font-weight: bold;
            letter-spacing: 1px;
            text-transform: uppercase;
            color: #c2185b;
            margin-bottom: 6px;
        }
        .party-name { font-size: 13px; font-weight: bold; margin-bottom: 4px; }
        .party-lines { font-size: 10px; color: #475569; line-height: 1.55; }

        .items { width: 100%; border-collapse: collapse; margin-bottom: 18px; border: 1.5px solid #c2185b; }
        .items th {
            background: #c2185b;
            color: #ffffff;
            font-size: 10px;
            font-weight: bold;
            letter-spacing: 0.8px;
            text-transform: uppercase;
            padding: 8px 10px;
            text-align: left;
            border: 1px solid #9f1449;
        }
        .items td {
            padding: 9px 10px;
            font-size: 10px;
            border: 1px solid #f5c6d6;
            vertical-align: top;
            color: #1e293b;
        }
        .items .right { text-align: right; white-space: nowrap; }
        .items .desc-sub { color: #64748b; font-size: 9px; margin-top: 2px; }

        .bottom { width: 100%; margin-top: 6px; }
        .bottom td { vertical-align: top; }
        .pay-col { width: 55%; padding-right: 20px; }
        .sum-col { width: 45%; }

        .pay-label {
            font-size: 11px;
            font-weight: bold;
            letter-spacing: 1px;
            text-transform: uppercase;
            color: #c2185b;
            margin-bottom: 6px;
        }
        .pay-body { font-size: 10px; color: #475569; line-height: 1.6; }
        .pay-body .strong { color: #1e293b; }

        .summary { width: 100%; border-collapse: collapse; }
        .summary td {
            padding: 7px 10px;
            font-size: 10px;
            border-bottom: 1px solid #e2e8f0;
        }
        .summary .k {
            color: #64748b;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            font-size: 9px;
        }
        .summary .v { text-align: right; font-weight: bold; white-space: nowrap; }
        .summary tr.total td {
            background: #c2185b;
            color: #ffffff;
            font-size: 12px;
            font-weight: bold;
            border-bottom: none;
            padding: 10px 12px;
        }
        .summary tr.total .k { color: #ffffff; font-size: 11px; }

        .badge {
            display: inline-block;
            padding: 2px 8px;
            font-size: 9px;
            font-weight: bold;
            letter-spacing: 0.5px;
            text-transform: uppercase;
        }
        .badge-paid { background: #dcfce7; color: #166534; }
        .badge-pending { background: #fef3c7; color: #92400e; }
        .badge-other { background: #e2e8f0; color: #334155; }

        .thanks {
            text-align: center;
            margin-top: 26px;
            padding-top: 14px;
            border-top: 1px solid #e2e8f0;
            font-size: 16px;
            font-style: italic;
            color: #c2185b;
        }
        .thanks-sub {
            text-align: center;
            margin-top: 4px;
            font-size: 9px;
            color: #64748b;
            font-style: normal;
        }
        .sign {
            margin-top: 22px;
            text-align: right;
            font-size: 10px;
            color: #475569;
        }
        .sign .line {
            margin-top: 30px;
            border-top: 1px solid #94a3b8;
            display: inline-block;
            min-width: 180px;
            padding-top: 4px;
        }
        .note {
            margin-top: 8px;
            font-size: 9px;
            color: #64748b;
            line-height: 1.45;
        }
    </style>
</head>
<body>
    <table class="header" cellpadding="0" cellspacing="0">
        <tr>
            <td style="width: 58%;">
                <table cellpadding="0" cellspacing="0">
                    <tr>
                        <td style="width: 58px; vertical-align: middle;">
                            @if(!empty($logoDataUri))
                                <img src="{{ $logoDataUri }}" alt="ApnaMedi" style="width:52px;height:52px;object-fit:contain;">
                            @else
                                <div class="logo-mark">AM</div>
                            @endif
                        </td>
                        <td style="padding-left: 12px; vertical-align: middle;">
                            <div class="brand-name">ApnaMedi</div>
                            <div class="brand-sub">
                                {{ $issuer['legal_name'] }}<br>
                                @if(!empty($issuer['udyam_urn']))
                                    Udyam: {{ $issuer['udyam_urn'] }}<br>
                                @endif
                                {{ $issuer['email'] }} · {{ $issuer['phone'] }}<br>
                                {{ $issuer['address'] }}
                            </div>
                        </td>
                    </tr>
                </table>
            </td>
            <td style="width: 10px;" class="vbar">&nbsp;</td>
            <td style="width: 38%; padding-left: 14px;">
                <div class="invoice-title">INVOICE</div>
                <table class="meta-table" cellpadding="0" cellspacing="0">
                    <tr>
                        <td class="k">Invoice Number:</td>
                        <td>{{ $payment->invoice_number }}</td>
                    </tr>
                    <tr>
                        <td class="k">Date:</td>
                        <td>{{ $invoiceDate }}</td>
                    </tr>
                    <tr>
                        <td class="k">Billing Period:</td>
                        <td>{{ $periodLabel }}</td>
                    </tr>
                    <tr>
                        <td class="k">Status:</td>
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

    <table class="parties" cellpadding="0" cellspacing="0">
        <tr>
            <td>
                <div class="party-label">Bill To</div>
                <div class="party-name">{{ $company?->name ?? '—' }}</div>
                <div class="party-lines">
                    @if($company?->code) Code: {{ $company->code }}<br>@endif
                    @if($company?->address) {{ $company->address }}<br>@endif
                    {{ collect([$company?->city, $company?->state])->filter()->implode(', ') }}
                    @if($company?->gst_number)<br>GSTIN: {{ $company->gst_number }}@endif
                    @if($company?->phone)<br>Phone: {{ $company->phone }}@endif
                    @if($company?->email)<br>Email: {{ $company->email }}@endif
                </div>
            </td>
            <td>
                <div class="party-label">Subscription</div>
                <div class="party-name">{{ $planName }}</div>
                <div class="party-lines">
                    Cycle: {{ ucfirst($billingCycle) }}<br>
                    Period: {{ $periodLabel }}<br>
                    Currency: {{ $payment->currency ?: 'INR' }}
                </div>
            </td>
        </tr>
    </table>

    <table class="items" cellpadding="0" cellspacing="0">
        <thead>
            <tr>
                <th style="width: 48%;">Description</th>
                <th style="width: 14%;">Qty</th>
                <th class="right" style="width: 19%;">Unit Price</th>
                <th class="right" style="width: 19%;">Amount</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td>
                    ApnaMedi Subscription — {{ $planName }}
                    <div class="desc-sub">{{ ucfirst($billingCycle) }} plan access for the billing period above</div>
                </td>
                <td>1</td>
                <td class="right">{{ $money($subtotal) }}</td>
                <td class="right">{{ $money($subtotal) }}</td>
            </tr>
        </tbody>
    </table>

    <table class="bottom" cellpadding="0" cellspacing="0">
        <tr>
            <td class="pay-col">
                <div class="pay-label">Payment Details</div>
                <div class="pay-body">
                    <span class="strong">Payment Method:</span> {{ $methodLabel }}<br>
                    <span class="strong">Bank:</span> {{ $issuer['bank']['bank_name'] }}<br>
                    <span class="strong">Account Name:</span> {{ $issuer['bank']['account_name'] }}<br>
                    <span class="strong">Account Number:</span> {{ $issuer['bank']['account_number'] }}<br>
                    <span class="strong">IFSC:</span> {{ $issuer['bank']['ifsc'] }}<br>
                    <span class="strong">UPI:</span> {{ $issuer['bank']['upi_id'] }}<br>
                    <span class="strong">Reference:</span> {{ $payment->transaction_reference ?: '—' }}
                    @if($isPending)
                        <div class="note">
                            Transfer the total using the bank details above and share the payment reference with ApnaMedi billing.
                            This invoice stays pending until payment is confirmed.
                        </div>
                    @else
                        <div class="note">This document is a receipt for a confirmed subscription payment.</div>
                    @endif
                </div>
            </td>
            <td class="sum-col">
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
                    @else
                        <tr>
                            <td class="k">Tax</td>
                            <td class="v">{{ $money(0) }}</td>
                        </tr>
                    @endif
                    <tr class="total">
                        <td class="k">Total</td>
                        <td class="v">{{ $money($payment->amount) }}</td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>

    <div class="thanks">Thank you for choosing ApnaMedi</div>
    <div class="thanks-sub">We appreciate your partnership. Looking forward to serving you.</div>

    <div class="sign">
        <div class="line">{{ $issuer['signatory'] }}</div>
    </div>
</body>
</html>
