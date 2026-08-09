<?php

namespace App\Http\Controllers;

use App\Models\DiagnosticOrder;
use App\Services\DiagnosticReportShareService;
use Illuminate\View\View;

class PublicDiagnosticReportController extends Controller
{
    public function __construct(private DiagnosticReportShareService $shareService) {}

    public function show(string $token): View
    {
        $order = $this->findByShareToken($token);
        $data = $this->shareService->documentData($order);

        return view('documents.diagnostic-share-report', $data);
    }

    public function download(string $token): View
    {
        $order = $this->findByShareToken($token);
        $data = $this->shareService->documentData($order);

        abort_unless($data['hasReport'], 404, 'Report is not available yet.');

        return view('documents.diagnostic-prescription', $data);
    }

    private function findByShareToken(string $token): DiagnosticOrder
    {
        $order = DiagnosticOrder::withoutGlobalScopes()
            ->where('share_token', $token)
            ->whereNull('deleted_at')
            ->where('status', '!=', 'cancelled')
            ->first();

        abort_if(! $order, 404, 'Report not found.');

        return $order;
    }
}
