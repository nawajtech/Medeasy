<?php

use App\Http\Controllers\Api\AppointmentController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BillingController;
use App\Http\Controllers\Api\BranchController;
use App\Http\Controllers\Api\CompanyController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\DepartmentController;
use App\Http\Controllers\Api\DiagnosticOrderController;
use App\Http\Controllers\Api\DiagnosticTestTypeController;
use App\Http\Controllers\Api\DoctorAvailabilityController;
use App\Http\Controllers\Api\DoctorController;
use App\Http\Controllers\Api\LabOrderController;
use App\Http\Controllers\Api\LabTestCategoryController;
use App\Http\Controllers\Api\LabTestController;
use App\Http\Controllers\Api\LabTestPackageController;
use App\Http\Controllers\Api\MedicineController;
use App\Http\Controllers\Api\PatientController;
use App\Http\Controllers\Api\ReportController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\SettingController;
use App\Http\Controllers\Api\UserController;
use Illuminate\Support\Facades\Route;

Route::post('auth/login', [AuthController::class, 'login']);

Route::middleware('auth:sanctum')->group(function () {
    Route::get('auth/me', [AuthController::class, 'me']);
    Route::put('auth/profile', [AuthController::class, 'updateProfile']);
    Route::put('auth/password', [AuthController::class, 'changePassword']);
    Route::post('auth/logout', [AuthController::class, 'logout']);

    Route::post('notifications/token', [NotificationController::class, 'registerToken']);
    Route::delete('notifications/token', [NotificationController::class, 'removeToken']);
    Route::get('notifications', [NotificationController::class, 'index']);
    Route::delete('notifications', [NotificationController::class, 'destroyAll']);
    Route::post('notifications/read-all', [NotificationController::class, 'markAllAsRead']);
    Route::delete('notifications/{id}', [NotificationController::class, 'destroy']);
    Route::patch('notifications/{id}/read', [NotificationController::class, 'markAsRead']);
    Route::post('notifications/test', [NotificationController::class, 'test']);

    Route::middleware('role:super_admin')->group(function () {
        Route::apiResource('companies', CompanyController::class);
    });

    // Admin + staff + new specialized roles
    $adminRoles = 'super_admin,company_admin,staff,lab_technician,radiologist,receptionist,pharmacist';

    Route::middleware("role:{$adminRoles}")->group(function () {
        Route::apiResource('users', UserController::class);
        Route::apiResource('departments', DepartmentController::class);
        Route::apiResource('reports', ReportController::class);
        Route::get('settings/form', [SettingController::class, 'form']);
        Route::post('settings/upload-image', [SettingController::class, 'uploadImage']);
        Route::put('settings/bulk', [SettingController::class, 'bulkUpdate']);
        Route::apiResource('settings', SettingController::class);
        Route::apiResource('branches', BranchController::class)->only(['index', 'store', 'update', 'destroy']);
    });

    // Clinical + lab + diagnostics — all non-super-only roles
    Route::middleware("role:{$adminRoles},doctor")->group(function () {
        Route::get('pharmacy/medicines/export', [MedicineController::class, 'export']);
        Route::post('pharmacy/medicines/import', [MedicineController::class, 'import']);
        Route::apiResource('pharmacy/medicines', MedicineController::class)->except(['show']);

        Route::get('dashboard', [DashboardController::class, 'index']);

        Route::get('patients/{patient}/history', [PatientController::class, 'history']);
        Route::get('patients/{patient}/billing-balance', [BillingController::class, 'patientBalance']);
        Route::get('billings/{billing}/invoice', [BillingController::class, 'invoice']);
        Route::get('appointments/{appointment}/prescription', [AppointmentController::class, 'prescription']);
        Route::post('appointments/{appointment}/prescription/upload', [AppointmentController::class, 'uploadPrescription']);
        Route::get('appointments/{appointment}/vitals', [AppointmentController::class, 'showVitals']);
        Route::put('appointments/{appointment}/vitals', [AppointmentController::class, 'updateVitals']);

        Route::get('doctors/{doctor}/availabilities', [DoctorAvailabilityController::class, 'index']);
        Route::put('doctors/{doctor}/availabilities', [DoctorAvailabilityController::class, 'sync']);
        Route::post('doctors/{doctor}/availability/check', [DoctorAvailabilityController::class, 'check']);

        Route::apiResource('patients', PatientController::class);
        Route::apiResource('doctors', DoctorController::class);
        Route::apiResource('appointments', AppointmentController::class);
        Route::apiResource('billings', BillingController::class);

        // ── Lab module ────────────────────────────────────
        Route::apiResource('lab/categories', LabTestCategoryController::class)
            ->except(['show']);
        Route::apiResource('lab/tests', LabTestController::class)
            ->except(['show']);
        Route::apiResource('lab/packages', LabTestPackageController::class)
            ->except(['show']);

        Route::get('lab/orders', [LabOrderController::class, 'index']);
        Route::post('lab/orders', [LabOrderController::class, 'store']);
        Route::get('lab/orders/{labOrder}', [LabOrderController::class, 'show']);
        Route::post('lab/orders/{labOrder}/collect', [LabOrderController::class, 'collect']);
        Route::post('lab/orders/{labOrder}/results', [LabOrderController::class, 'results']);
        Route::patch('lab/orders/{labOrder}/verify', [LabOrderController::class, 'verify']);
        Route::patch('lab/orders/{labOrder}/approve', [LabOrderController::class, 'approve']);
        Route::patch('lab/orders/{labOrder}/cancel', [LabOrderController::class, 'cancel']);

        // ── Diagnostic module ─────────────────────────────
        Route::apiResource('diagnostics/types', DiagnosticTestTypeController::class)
            ->except(['show']);
        Route::get('diagnostics/orders', [DiagnosticOrderController::class, 'index']);
        Route::post('diagnostics/orders', [DiagnosticOrderController::class, 'store']);
        Route::get('diagnostics/orders/{diagnosticOrder}', [DiagnosticOrderController::class, 'show']);
        Route::patch('diagnostics/orders/{diagnosticOrder}/schedule', [DiagnosticOrderController::class, 'schedule']);
        Route::patch('diagnostics/orders/{diagnosticOrder}/start', [DiagnosticOrderController::class, 'start']);
        Route::post('diagnostics/orders/{diagnosticOrder}/report', [DiagnosticOrderController::class, 'uploadReport']);
        Route::patch('diagnostics/orders/{diagnosticOrder}/approve', [DiagnosticOrderController::class, 'approveReport']);
        Route::patch('diagnostics/orders/{diagnosticOrder}/cancel', [DiagnosticOrderController::class, 'cancel']);
    });

    Route::get('companies-list', fn () => response()->json(
        \App\Models\Company::orderBy('name')->get(['id', 'name', 'code', 'type', 'is_active'])
    ))->middleware("role:{$adminRoles},doctor");
});
