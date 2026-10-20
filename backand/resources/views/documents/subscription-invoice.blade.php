<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <style>
        * { box-sizing: border-box; }
        body { font-family: DejaVu Sans, sans-serif; font-size: 11px; color: #1e293b; margin: 0; padding: 28px 32px; }
        .top { width: 100%; border-bottom: 2px solid #0f766e; padding-bottom: 12px; margin-bottom: 16px; }
        .brand { font-size: 18px; font-weight: bold; color: #0f766e; }
        .muted { color: #64748b; font-size: 10px; line-height: 1.45; }
        .badge { display: inline-block; padding: 4px 10px; border-radius: 4px; font-weight: bold; letter-spacing: 0.06em; font-size: 11px; }
        .badge-paid { background: #dcfce7; color: #166534; }
        .badge-pending { background: #fef3c7; color: #92400e; }
        .badge-other { background: #e2e8f0; color: #334155; }
        h1 { font-size: 16px; margin: 0 0 4px; }
        table { width: 100%; border-collapse: collapse; }
        .meta td { vertical-align: top; padding: 0; }
        .box { border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px 12px; }
        .label { font-size: 9px; text-transform: uppercase; letter-spacing: 0.04em; color: #64748b; margin-bottom: 3px; }
        .items { margin-top: 16px; }
        .items th { text-align: left; background: #f8fafc; border-bottom: 1px solid #cbd5e1; padding: 7px 8px; font-size: 10px; }
        .items td { border-bottom: 1px solid #e2e8f0; padding: 8px; }
        .right { text-align: right; }
        .totals { width: 240px; margin-left: auto; margin-top: 8px; }
        .totals td { padding: 3px 0; }
        .grand { font-size: 13px; font-weight: bold; border-top: 1px solid #0f766e; padding-top: 6px; }
        .pay { margin-top: 16px; background: #f8fafc; border: 1px solid #e2e8f0; padding: 10px 12px; }
        .footer { margin-top: 22px; border-top: 1px solid #e2e8f0; padding-top: 10px; font-size: 10px; color: #475569; }
        .sign { margin-top: 28px; text-align: right; }
        .sign .line { margin-top: 28px; border-top: 1px solid #94a3b8; display: inline-block; min-width: 180px; padding-top: 4px; }
    </style>
</head>
<body>
    <table class="top">
        <tr>
            <td>
                <div class="brand">{{ $issuer['legal_name'] }}</div>
                <div class="muted">
                    Udyam URN: {{ $issuer['udyam_urn'] }}<br>
                    {{ $issuer['email'] }} · {{ $issuer['phone'] }}<br>
                    {{ $issuer['address'] }}
                </div>
            </td>
            <td style="text-align:right; width: 180px;">
                <h1>TAX INVOICE</h1>
                <span class="badge {{ $isPaid ? 'badge-paid' : ($isPending ? 'badge-pending' : 'badge-other') }}">
                    {{ strtoupper($payment->payment_status) }}
                </span>
            </td>
        </tr>
    </table>

    <table class="meta">
        <tr>
            <td style="width: 50%; padding-right: 10px;">
                <div class="box">
                    <div class="label">Invoice</div>
                    <strong>{{ $payment->invoice_number }}</strong><br>
                    <span class="muted">Date: {{ $invoiceDate }}</span><br>
                    <span class="muted">Billing period: {{ $periodLabel }}</span>
                </div>
            </td>
            <td style="width: 50%; padding-left: 10px;">
                <div class="box">
                    <div class="label">Billed to</div>
                    <strong>{{ $company?->name ?? '—' }}</strong><br>
                    <span class="muted">
                        @if($company?->code) {{ $company->code }}<br>@endif
                        @if($company?->address) {{ $company->address }}<br>@endif
                        {{ collect([$company?->city, $company?->state])->filter()->implode(', ') }}
                        @if($company?->gst_number)<br>GSTIN: {{ $company->gst_number }}@endif
                        @if($company?->email)<br>{{ $company->email }}@endif
                    </span>
                </div>
            </td>
        </tr>
    </table>

    <table class="items">
        <thead>
            <tr>
                <th>Description</th>
                <th>Plan</th>
                <th class="right">Amount</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td>
                    ApnaMedi Subscription — {{ $planName }}
                    <div class="muted">{{ ucfirst($billingCycle) }} plan access</div>
                </td>
                <td>{{ $planName }}</td>
                <td class="right">{{ $money($subtotal) }}</td>
            </tr>
        </tbody>
    </table>

    <table class="totals">
        <tr>
            <td>Subtotal</td>
            <td class="right">{{ $money($subtotal) }}</td>
        </tr>
        @if($payment->tax_enabled && (float) $payment->tax_amount > 0)
            @if((float) $payment->cgst_amount > 0)
                <tr>
                    <td>CGST ({{ $payment->cgst_rate }}%)</td>
                    <td class="right">{{ $money($payment->cgst_amount) }}</td>
                </tr>
                <tr>
                    <td>SGST ({{ $payment->sgst_rate }}%)</td>
                    <td class="right">{{ $money($payment->sgst_amount) }}</td>
                </tr>
            @endif
            @if((float) $payment->igst_amount > 0)
                <tr>
                    <td>IGST ({{ $payment->igst_rate }}%)</td>
                    <td class="right">{{ $money($payment->igst_amount) }}</td>
                </tr>
            @endif
        @else
            <tr>
                <td>Tax</td>
                <td class="right">{{ $money(0) }}</td>
            </tr>
        @endif
        <tr>
            <td class="grand">Total</td>
            <td class="right grand">{{ $money($payment->amount) }}</td>
        </tr>
    </table>

    <div class="pay">
        <div class="label">Payment</div>
        Method: {{ $methodLabel }}<br>
        Reference: {{ $payment->transaction_reference ?: '—' }}
        @if($isPending)
            <div style="margin-top:8px;">
                <strong>Payment instructions</strong><br>
                Transfer the total to the account below and share the reference with ApnaMedi billing.
                This invoice stays pending until payment is confirmed.
            </div>
        @else
            <div style="margin-top:8px;">This document is a receipt for a confirmed subscription payment.</div>
        @endif
    </div>

    <div class="footer">
        <strong>Bank details</strong><br>
        Account name: {{ $issuer['bank']['account_name'] }}<br>
        Bank: {{ $issuer['bank']['bank_name'] }}<br>
        Account number: {{ $issuer['bank']['account_number'] }}<br>
        IFSC: {{ $issuer['bank']['ifsc'] }}<br>
        UPI: {{ $issuer['bank']['upi_id'] }}
        <div class="sign">
            <div class="line">{{ $issuer['signatory'] }}</div>
        </div>
    </div>
</body>
</html>
