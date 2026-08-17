<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\SendDailyReportsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SendReportsController extends Controller
{
    /**
     * Lambda / cron entry: email today's approved diagnostic reports to patients.
     *
     * Auth: header X-Reports-Secret or ?secret= must match REPORTS_CRON_SECRET.
     */
    public function __invoke(Request $request, SendDailyReportsService $service): JsonResponse
    {
        $configured = (string) config('services.reports_cron.secret', '');
        $provided = (string) ($request->header('X-Reports-Secret')
            ?? $request->query('secret')
            ?? '');

        if ($configured === '' || ! hash_equals($configured, $provided)) {
            return response()->json([
                'message' => 'Unauthorized.',
            ], 401);
        }

        $date = $request->query('date'); // optional YYYY-MM-DD for backfill
        $result = $service->sendTodaysApprovedReports(is_string($date) && $date !== '' ? $date : null);

        return response()->json([
            'message' => 'Report email job finished.',
            'result' => $result,
        ]);
    }
}
