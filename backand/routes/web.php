<?php

use App\Http\Controllers\PublicDiagnosticReportController;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

Route::get('/share-report/{token}', [PublicDiagnosticReportController::class, 'show'])
    ->where('token', '[A-Za-z0-9]+')
    ->name('diagnostic.share-report');

Route::get('/share-report/{token}/download', [PublicDiagnosticReportController::class, 'download'])
    ->where('token', '[A-Za-z0-9]+')
    ->name('diagnostic.share-report.download');
