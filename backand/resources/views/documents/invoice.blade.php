<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Invoice {{ $billing->invoice_number }}</title>
    @include('documents.partials.styles')
    <style>
        table { width: 100%; border-collapse: collapse; margin: 16px 0; }
        th, td { text-align: left; padding: 8px 10px; border-bottom: 1px solid #e2e8f0; font-size: 0.875rem; }
        th { background: #f8fafc; font-size: 0.75rem; text-transform: uppercase; color: #64748b; }
        .amount { text-align: right; white-space: nowrap; }
        .totals { margin-top: 16px; text-align: right; }
        .totals p { margin: 4px 0; font-size: 0.875rem; }
        .totals .grand { font-size: 1.125rem; font-weight: 700; color: #0d9488; }
        .totals .due { color: #b91c1c; font-weight: 600; }
    </style>
</head>
<body>
    <button class="no-print doc-print-btn" onclick="window.print()">Print / Save as PDF</button>

    @include('documents.partials.clinic-header', ['branding' => $branding])

    <p class="doc-meta">
        Invoice <strong>{{ $billing->invoice_number }}</strong>
        &middot; {{ $billing->billed_at->format('M d, Y') }}
    </p>

    <table>
        <tr><th>Patient</th><td>{{ $billing->patient->name }} ({{ $billing->patient->patient_code }})</td></tr>
        @if($appointment)
            <tr><th>Doctor</th><td>{{ $appointment->doctor->user->name ?? '—' }} — {{ $appointment->doctor->department->name ?? '—' }}</td></tr>
            <tr><th>Visit date</th><td>{{ $appointment->appointment_date->format('M d, Y h:i A') }}</td></tr>
        @endif
        <tr><th>Payment status</th><td>{{ ucfirst($billing->status) }}</td></tr>
    </table>

    <table>
        <thead>
            <tr><th>Description</th><th class="amount">Amount</th></tr>
        </thead>
        <tbody>
            @if($billing->previous_due > 0)
                <tr>
                    <td>Previous balance due</td>
                    <td class="amount">{{ $currencySymbol }}{{ number_format($billing->previous_due, 2) }}</td>
                </tr>
            @endif
            <tr>
                <td>Doctor charge (this visit)</td>
                <td class="amount">{{ $currencySymbol }}{{ number_format($billing->charge_amount, 2) }}</td>
            </tr>
            <tr>
                <td><strong>Total payable</strong></td>
                <td class="amount"><strong>{{ $currencySymbol }}{{ number_format($billing->total_amount, 2) }}</strong></td>
            </tr>
            <tr>
                <td>Amount paid</td>
                <td class="amount">− {{ $currencySymbol }}{{ number_format($billing->paid_amount, 2) }}</td>
            </tr>
        </tbody>
    </table>

    <div class="totals">
        <p>Previous due: {{ $currencySymbol }}{{ number_format($billing->previous_due, 2) }}</p>
        <p>Doctor charge: {{ $currencySymbol }}{{ number_format($billing->charge_amount, 2) }}</p>
        <p class="grand">Total: {{ $currencySymbol }}{{ number_format($billing->total_amount, 2) }}</p>
        <p>Paid: {{ $currencySymbol }}{{ number_format($billing->paid_amount, 2) }}</p>
        <p class="due">Balance due: {{ $currencySymbol }}{{ number_format($billing->due_amount, 2) }}</p>
    </div>

    @if($billing->notes)
        <p style="margin-top:16px;font-size:0.875rem;"><strong>Notes:</strong> {{ $billing->notes }}</p>
    @endif

    @include('documents.partials.clinic-footer', ['branding' => $branding])
</body>
</html>
