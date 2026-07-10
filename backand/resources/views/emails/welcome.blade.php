<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Welcome</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #1f2937; max-width: 600px; margin: 0 auto; padding: 24px;">
    <h1 style="font-size: 22px; margin-bottom: 8px;">Welcome to {{ config('app.name') }}</h1>

    <p>Hello {{ $user->name }},</p>

    <p>
        Your staff account has been created
        @if ($user->company)
            for <strong>{{ $user->company->name }}</strong>
        @endif
        with the role <strong>{{ str_replace('_', ' ', $user->role) }}</strong>.
    </p>

    <p>Use the credentials below to sign in:</p>

    <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
        <tr>
            <td style="padding: 8px 12px; border: 1px solid #e5e7eb; background: #f9fafb; width: 120px;"><strong>Email</strong></td>
            <td style="padding: 8px 12px; border: 1px solid #e5e7eb;">{{ $user->email }}</td>
        </tr>
        <tr>
            <td style="padding: 8px 12px; border: 1px solid #e5e7eb; background: #f9fafb;"><strong>Password</strong></td>
            <td style="padding: 8px 12px; border: 1px solid #e5e7eb;">{{ $plainPassword }}</td>
        </tr>
    </table>

    <p>
        <a href="{{ $loginUrl }}" style="display: inline-block; padding: 10px 16px; background: #2563eb; color: #ffffff; text-decoration: none; border-radius: 6px;">
            Sign in
        </a>
    </p>

    <p style="font-size: 14px; color: #6b7280;">
        Please change your password after your first login.
    </p>
</body>
</html>
