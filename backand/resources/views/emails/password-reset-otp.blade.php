<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Password reset code</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #1f2937; max-width: 600px; margin: 0 auto; padding: 24px;">
    <h1 style="font-size: 22px; margin-bottom: 8px;">Reset your password</h1>

    <p>Hello {{ $user->name }},</p>

    <p>Use this code to reset your {{ $appName }} password. It expires in {{ $expiresInMinutes }} minutes.</p>

    <p style="margin: 24px 0; padding: 16px 20px; background: #f0fdfa; border: 1px solid #99f6e4; border-radius: 8px; font-size: 28px; font-weight: 700; letter-spacing: 0.28em; text-align: center; color: #0f766e;">
        {{ $code }}
    </p>

    <p style="font-size: 14px; color: #6b7280;">
        If you did not ask to reset your password, you can ignore this email. Your password will stay the same.
    </p>
</body>
</html>
