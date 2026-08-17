<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Report ready</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #0f172a; max-width: 600px; margin: 0 auto; padding: 24px; background: #f8fafc;">
    <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px;">
        <p style="margin: 0 0 4px; font-size: 12px; letter-spacing: 0.04em; color: #0f766e; font-weight: 700; text-transform: uppercase;">
            ApnaMedi
        </p>
        <h1 style="font-size: 22px; margin: 0 0 16px; color: #0f766e;">Your report is ready</h1>

        <p>Hello {{ $patientName }},</p>

        <p>
            Your diagnostic report from <strong>{{ $centreName }}</strong> is ready to view.
        </p>

        <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
            <tr>
                <td style="padding: 8px 12px; border: 1px solid #e5e7eb; background: #f9fafb; width: 140px;"><strong>Test</strong></td>
                <td style="padding: 8px 12px; border: 1px solid #e5e7eb;">{{ $testName }}</td>
            </tr>
            <tr>
                <td style="padding: 8px 12px; border: 1px solid #e5e7eb; background: #f9fafb;"><strong>Order</strong></td>
                <td style="padding: 8px 12px; border: 1px solid #e5e7eb;">{{ $orderNumber }}</td>
            </tr>
            @if ($approvedAt)
            <tr>
                <td style="padding: 8px 12px; border: 1px solid #e5e7eb; background: #f9fafb;"><strong>Approved</strong></td>
                <td style="padding: 8px 12px; border: 1px solid #e5e7eb;">{{ $approvedAt }}</td>
            </tr>
            @endif
        </table>

        <p style="margin: 24px 0;">
            <a href="{{ $shareUrl }}"
               style="display: inline-block; padding: 12px 18px; background: #0d9488; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 700;">
                View report
            </a>
        </p>

        <p style="font-size: 13px; color: #64748b; word-break: break-all;">
            Or open this link:<br>
            <a href="{{ $shareUrl }}" style="color: #0f766e;">{{ $shareUrl }}</a>
        </p>

        <p style="font-size: 12px; color: #94a3b8; margin-top: 28px; margin-bottom: 0;">
            This is an automated message from ApnaMedi. Please do not reply to this email.
        </p>
    </div>
</body>
</html>
