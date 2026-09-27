"""
AWS Lambda (Python 3.12) — call ApnaMedi /api/sendreports

Setup:
1. Create Lambda function (Python 3.x), paste this code.
2. Environment variables:
     REPORTS_API_URL   = https://app.apnamedi.com/api/sendreports
     REPORTS_CRON_SECRET = <same value as REPORTS_CRON_SECRET in Laravel .env>
3. Trigger: EventBridge schedule (e.g. cron(30 18 * * ? *) for 6:30 PM UTC daily)
   or keep as on-demand Test invoke.
4. Timeout: set Lambda timeout to at least 60 seconds.
"""

import json
import os
import urllib.error
import urllib.request


def lambda_handler(event, context):
    url = os.environ.get("REPORTS_API_URL", "https://app.apnamedi.com/api/sendreports")
    secret = os.environ.get("REPORTS_CRON_SECRET", "")

    if not secret:
        return {
            "statusCode": 500,
            "body": "Missing REPORTS_CRON_SECRET environment variable",
        }

    # Optional backfill: pass {"date": "2026-08-17"} in the event
    date = None
    if isinstance(event, dict):
        date = event.get("date")

    if date:
        url = f"{url}?date={date}"

    req = urllib.request.Request(
        url,
        method="GET",
        headers={
            "Accept": "application/json",
            "X-Reports-Secret": secret,
            "User-Agent": "apnamedi-sendreports-lambda/1.0",
        },
    )

    try:
        with urllib.request.urlopen(req, timeout=55) as response:
            body = response.read().decode("utf-8")
            return {
                "statusCode": response.status,
                "body": body,
            }
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8", errors="replace")
        return {
            "statusCode": e.code,
            "body": err_body or str(e),
        }
    except Exception as e:
        return {
            "statusCode": 500,
            "body": str(e),
        }
