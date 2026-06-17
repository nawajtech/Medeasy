<?php

use App\Http\Controllers\Api\AppointmentController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BillingController;
use App\Http\Controllers\Api\CompanyController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\DepartmentController;
use App\Http\Controllers\Api\DoctorAvailabilityController;
use App\Http\Controllers\Api\DoctorController;
use App\Http\Controllers\Api\PatientController;
use App\Http\Controllers\Api\ReportController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\SettingController;
use App\Http\Controllers\Api\UserController;
use Illuminate\Support\Facades\Route;

Route::post('auth/login', [AuthController::class, 'login']);

Route::middleware('auth:sanctum')->group(function () {
    Route::get('auth/me', [AuthController::class, 'me']);
    Route::post('auth/logout', [AuthController::class, 'logout']);

    Route::post('notifications/token', [NotificationController::class, 'registerToken']);
    Route::delete('notifications/token', [NotificationController::class, 'removeToken']);
    Route::get('notifications', [NotificationController::class, 'index']);
    Route::post('notifications/read-all', [NotificationController::class, 'markAllAsRead']);
    Route::patch('notifications/{id}/read', [NotificationController::class, 'markAsRead']);
    Route::post('notifications/test', [NotificationController::class, 'test']);

    Route::middleware('role:super_admin')->group(function () {
        Route::apiResource('companies', CompanyController::class);
    });

    Route::middleware('role:super_admin,company_admin,staff')->group(function () {
        Route::apiResource('users', UserController::class);
        Route::apiResource('departments', DepartmentController::class);
        Route::apiResource('reports', ReportController::class);
        Route::apiResource('settings', SettingController::class);
    });

    Route::middleware('role:super_admin,company_admin,staff,doctor')->group(function () {
        Route::get('dashboard', [DashboardController::class, 'index']);

        Route::get('patients/{patient}/billing-balance', [BillingController::class, 'patientBalance']);
        Route::get('billings/{billing}/invoice', [BillingController::class, 'invoice']);
        Route::get('appointments/{appointment}/prescription', [AppointmentController::class, 'prescription']);
        Route::get('appointments/{appointment}/vitals', [AppointmentController::class, 'showVitals']);
        Route::put('appointments/{appointment}/vitals', [AppointmentController::class, 'updateVitals']);

        Route::get('doctors/{doctor}/availabilities', [DoctorAvailabilityController::class, 'index']);
        Route::put('doctors/{doctor}/availabilities', [DoctorAvailabilityController::class, 'sync']);
        Route::post('doctors/{doctor}/availability/check', [DoctorAvailabilityController::class, 'check']);

        Route::apiResource('patients', PatientController::class);
        Route::apiResource('doctors', DoctorController::class);
        Route::apiResource('appointments', AppointmentController::class);
        Route::apiResource('billings', BillingController::class);
    });

    Route::get('companies-list', fn () => response()->json(
        \App\Models\Company::orderBy('name')->get(['id', 'name', 'code', 'is_active'])
    ))->middleware('role:super_admin,company_admin,staff');
});
