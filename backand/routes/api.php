<?php

use App\Http\Controllers\Api\AppointmentController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BillingController;
use App\Http\Controllers\Api\BranchController;
use App\Http\Controllers\Api\CompanyController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\DepartmentController;
use App\Http\Controllers\Api\DiagnosticCategoryController;
use App\Http\Controllers\Api\DiagnosticOrderController;
use App\Http\Controllers\Api\DiagnosticTestTypeController;
use App\Http\Controllers\Api\DoctorAvailabilityController;
use App\Http\Controllers\Api\DoctorController;
use App\Http\Controllers\Api\FinancialReportController;
use App\Http\Controllers\Api\LabOrderController;
use App\Http\Controllers\Api\LabTestCategoryController;
use App\Http\Controllers\Api\LabTestController;
use App\Http\Controllers\Api\LabTestPackageController;
use App\Http\Controllers\Api\MedicineController;
use App\Http\Controllers\Api\PatientController;
use App\Http\Controllers\Api\PermissionController;
use App\Http\Controllers\Api\ReferralPartnerController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\RoleController;
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

    // ── Roles & Permissions ─────────────────────────────────────
    Route::middleware('permission:role.view')->group(function () {
        Route::get('permissions', [PermissionController::class, 'index']);
        Route::get('roles/assignable', [RoleController::class, 'assignable']);
        Route::get('roles', [RoleController::class, 'index']);
        Route::get('roles/{role}', [RoleController::class, 'show']);
    });

    Route::middleware('permission:role.create')->post('roles', [RoleController::class, 'store']);
    Route::middleware('permission:role.edit')->put('roles/{role}', [RoleController::class, 'update']);
    Route::middleware('permission:role.delete')->delete('roles/{role}', [RoleController::class, 'destroy']);
    Route::middleware('permission:role.assign_permissions')->put('roles/{role}/permissions', [RoleController::class, 'syncPermissions']);

    // ── Companies (super admin) ─────────────────────────────────
    Route::middleware('permission:company.view')->get('companies', [CompanyController::class, 'index']);
    Route::middleware('permission:company.view')->get('companies/{company}', [CompanyController::class, 'show']);
    Route::middleware('permission:company.create')->post('companies', [CompanyController::class, 'store']);
    Route::middleware('permission:company.edit')->put('companies/{company}', [CompanyController::class, 'update']);
    Route::middleware('permission:company.delete')->delete('companies/{company}', [CompanyController::class, 'destroy']);

    // ── Users & admin ───────────────────────────────────────────
    Route::middleware('permission:users.view')->get('users/assignable-roles', [UserController::class, 'assignableRoles']);
    Route::middleware('permission:users.view')->get('users', [UserController::class, 'index']);
    Route::middleware('permission:users.view')->get('users/{user}', [UserController::class, 'show']);
    Route::middleware('permission:users.create')->post('users', [UserController::class, 'store']);
    Route::middleware('permission:users.edit')->put('users/{user}', [UserController::class, 'update']);
    Route::middleware('permission:users.delete')->delete('users/{user}', [UserController::class, 'destroy']);

    Route::middleware('permission:department.view')->get('departments', [DepartmentController::class, 'index']);
    Route::middleware('permission:department.view')->get('departments/{department}', [DepartmentController::class, 'show']);
    Route::middleware('permission:department.create')->post('departments', [DepartmentController::class, 'store']);
    Route::middleware('permission:department.edit')->put('departments/{department}', [DepartmentController::class, 'update']);
    Route::middleware('permission:department.delete')->delete('departments/{department}', [DepartmentController::class, 'destroy']);

    Route::middleware('permission:report.view')->get('reports', [ReportController::class, 'index']);
    Route::middleware('permission:report.view')->get('reports/{report}', [ReportController::class, 'show']);
    Route::middleware('permission:report.export')->post('reports', [ReportController::class, 'store']);

    Route::middleware('permission:settings.view')->get('settings/form', [SettingController::class, 'form']);
    Route::middleware('permission:settings.view')->get('settings', [SettingController::class, 'index']);
    Route::middleware('permission:settings.view')->get('settings/{setting}', [SettingController::class, 'show']);
    Route::middleware('permission:settings.edit')->post('settings/upload-image', [SettingController::class, 'uploadImage']);
    Route::middleware('permission:settings.edit')->put('settings/bulk', [SettingController::class, 'bulkUpdate']);
    Route::middleware('permission:settings.edit')->post('settings', [SettingController::class, 'store']);
    Route::middleware('permission:settings.edit')->put('settings/{setting}', [SettingController::class, 'update']);
    Route::middleware('permission:settings.edit')->delete('settings/{setting}', [SettingController::class, 'destroy']);

    Route::middleware('permission:branch.view')->get('branches', [BranchController::class, 'index']);
    Route::middleware('permission:branch.create')->post('branches', [BranchController::class, 'store']);
    Route::middleware('permission:branch.edit')->put('branches/{branch}', [BranchController::class, 'update']);
    Route::middleware('permission:branch.delete')->delete('branches/{branch}', [BranchController::class, 'destroy']);

    // ── Dashboard ───────────────────────────────────────────────
    Route::middleware('permission:dashboard.view')->get('dashboard', [DashboardController::class, 'index']);

    // ── Pharmacy / Medicine ───────────────────────────────────────
    Route::middleware('permission:medicine.view')->get('pharmacy/medicines', [MedicineController::class, 'index']);
    Route::middleware('permission:medicine.view')->get('pharmacy/medicines/export', [MedicineController::class, 'export']);
    Route::middleware('permission:medicine.create')->post('pharmacy/medicines', [MedicineController::class, 'store']);
    Route::middleware('permission:medicine.create')->post('pharmacy/medicines/import', [MedicineController::class, 'import']);
    Route::middleware('permission:medicine.edit')->put('pharmacy/medicines/{medicine}', [MedicineController::class, 'update']);
    Route::middleware('permission:medicine.delete')->delete('pharmacy/medicines/{medicine}', [MedicineController::class, 'destroy']);

    // ── Patients ──────────────────────────────────────────────────
    Route::middleware('permission:patient.view')->group(function () {
        Route::get('patients', [PatientController::class, 'index']);
        Route::get('patients/{patient}', [PatientController::class, 'show']);
        Route::get('patients/{patient}/history', [PatientController::class, 'history']);
        Route::get('patients/{patient}/wallet', [PatientController::class, 'wallet']);
        Route::get('patients/{patient}/billing-balance', [BillingController::class, 'patientBalance']);
    });
    Route::middleware('permission:patient.create')->post('patients', [PatientController::class, 'store']);
    Route::middleware('permission:patient.edit')->put('patients/{patient}', [PatientController::class, 'update']);
    Route::middleware('permission:patient.delete')->delete('patients/{patient}', [PatientController::class, 'destroy']);

    // ── Doctors ─────────────────────────────────────────────────
    Route::middleware('permission:doctor.view')->group(function () {
        Route::get('doctors', [DoctorController::class, 'index']);
        Route::get('doctors/{doctor}', [DoctorController::class, 'show']);
        Route::get('doctors/{doctor}/availabilities', [DoctorAvailabilityController::class, 'index']);
        Route::post('doctors/{doctor}/availability/check', [DoctorAvailabilityController::class, 'check']);
    });
    Route::middleware('permission:doctor.create')->post('doctors', [DoctorController::class, 'store']);
    Route::middleware('permission:doctor.edit')->group(function () {
        Route::put('doctors/{doctor}', [DoctorController::class, 'update']);
        Route::put('doctors/{doctor}/availabilities', [DoctorAvailabilityController::class, 'sync']);
    });
    Route::middleware('permission:doctor.delete')->delete('doctors/{doctor}', [DoctorController::class, 'destroy']);

    // ── Appointments & prescriptions ──────────────────────────────
    Route::middleware('permission:appointment.view')->group(function () {
        Route::get('appointments', [AppointmentController::class, 'index']);
        Route::get('appointments/{appointment}', [AppointmentController::class, 'show']);
        Route::get('appointments/{appointment}/vitals', [AppointmentController::class, 'showVitals']);
    });
    Route::middleware('permission:appointment.create')->post('appointments', [AppointmentController::class, 'store']);
    Route::middleware('permission:appointment.edit')->group(function () {
        Route::put('appointments/{appointment}', [AppointmentController::class, 'update']);
        Route::put('appointments/{appointment}/vitals', [AppointmentController::class, 'updateVitals']);
    });
    Route::middleware('permission:appointment.delete')->delete('appointments/{appointment}', [AppointmentController::class, 'destroy']);

    Route::middleware('permission:prescription.view')->get('appointments/{appointment}/prescription', [AppointmentController::class, 'prescription']);
    Route::middleware('permission:prescription.create')->post('appointments/{appointment}/prescription/upload', [AppointmentController::class, 'uploadPrescription']);

    // ── Billing ───────────────────────────────────────────────────
    Route::middleware('permission:billing.view')->group(function () {
        Route::get('billings', [BillingController::class, 'index']);
        Route::get('billings/{billing}', [BillingController::class, 'show']);
        Route::get('billings/{billing}/invoice', [BillingController::class, 'invoice']);
    });
    Route::middleware('permission:billing.create')->post('billings', [BillingController::class, 'store']);
    Route::middleware('permission:billing.edit')->put('billings/{billing}', [BillingController::class, 'update']);
    Route::middleware('permission:billing.delete')->delete('billings/{billing}', [BillingController::class, 'destroy']);

    // ── Finance & P&L (company admin only) ────────────────────────
    Route::middleware('role:company_admin')->group(function () {
        Route::middleware('permission:financial.view')->get('financials/summary', [FinancialReportController::class, 'summary']);
        Route::middleware('permission:financial.view')->get('financials/expenses', [FinancialReportController::class, 'expenses']);
        Route::middleware('permission:financial.create')->post('financials/expenses', [FinancialReportController::class, 'storeExpense']);
        Route::middleware('permission:financial.delete')->delete('financials/expenses/{expense}', [FinancialReportController::class, 'destroyExpense']);
    });

    // ── Lab module ────────────────────────────────────────────────
    Route::middleware('permission:lab.view')->group(function () {
        Route::get('lab/categories', [LabTestCategoryController::class, 'index']);
        Route::get('lab/tests', [LabTestController::class, 'index']);
        Route::get('lab/packages', [LabTestPackageController::class, 'index']);
        Route::get('lab/orders', [LabOrderController::class, 'index']);
        Route::get('lab/orders/{labOrder}', [LabOrderController::class, 'show']);
    });
    Route::middleware('permission:lab.create')->group(function () {
        Route::post('lab/categories', [LabTestCategoryController::class, 'store']);
        Route::post('lab/tests', [LabTestController::class, 'store']);
        Route::post('lab/packages', [LabTestPackageController::class, 'store']);
        Route::post('lab/orders', [LabOrderController::class, 'store']);
        Route::post('lab/orders/{labOrder}/collect', [LabOrderController::class, 'collect']);
        Route::post('lab/orders/{labOrder}/results', [LabOrderController::class, 'results']);
    });
    Route::middleware('permission:lab.edit')->group(function () {
        Route::put('lab/categories/{category}', [LabTestCategoryController::class, 'update']);
        Route::put('lab/tests/{test}', [LabTestController::class, 'update']);
        Route::put('lab/packages/{package}', [LabTestPackageController::class, 'update']);
    });
    Route::middleware('permission:lab.delete')->group(function () {
        Route::delete('lab/categories/{category}', [LabTestCategoryController::class, 'destroy']);
        Route::delete('lab/tests/{test}', [LabTestController::class, 'destroy']);
        Route::delete('lab/packages/{package}', [LabTestPackageController::class, 'destroy']);
        Route::patch('lab/orders/{labOrder}/cancel', [LabOrderController::class, 'cancel']);
    });
    Route::middleware('permission:lab.verify')->patch('lab/orders/{labOrder}/verify', [LabOrderController::class, 'verify']);
    Route::middleware('permission:lab.approve')->patch('lab/orders/{labOrder}/approve', [LabOrderController::class, 'approve']);

    // ── Diagnostic module ─────────────────────────────────────────
    Route::middleware('permission:diagnostic.view')->group(function () {
        Route::get('diagnostics/categories', [DiagnosticCategoryController::class, 'index']);
        Route::get('diagnostics/types', [DiagnosticTestTypeController::class, 'index']);
        Route::get('diagnostics/referral-partners', [ReferralPartnerController::class, 'index']);
        Route::get('diagnostics/referral-partners/{referralPartner}/ledger', [ReferralPartnerController::class, 'ledger']);
        Route::get('diagnostics/orders', [DiagnosticOrderController::class, 'index']);
        Route::get('diagnostics/today-queue', [DiagnosticOrderController::class, 'todayQueue']);
        Route::get('diagnostics/orders/{diagnosticOrder}', [DiagnosticOrderController::class, 'show']);
        Route::get('diagnostics/orders/{diagnosticOrder}/invoice', [DiagnosticOrderController::class, 'invoice']);
        Route::get('diagnostics/orders/{diagnosticOrder}/prescription', [DiagnosticOrderController::class, 'prescription']);
    });
    Route::middleware('permission:diagnostic.create')->group(function () {
        Route::post('diagnostics/categories', [DiagnosticCategoryController::class, 'store']);
        Route::post('diagnostics/types', [DiagnosticTestTypeController::class, 'store']);
        Route::post('diagnostics/referral-partners', [ReferralPartnerController::class, 'store']);
        Route::post('diagnostics/orders', [DiagnosticOrderController::class, 'store']);
        Route::post('diagnostics/orders/{diagnosticOrder}/report', [DiagnosticOrderController::class, 'uploadReport']);
    });
    Route::middleware('permission:diagnostic.edit')->group(function () {
        Route::put('diagnostics/categories/{diagnosticCategory}', [DiagnosticCategoryController::class, 'update']);
        Route::put('diagnostics/types/{type}', [DiagnosticTestTypeController::class, 'update']);
        Route::put('diagnostics/referral-partners/{referralPartner}', [ReferralPartnerController::class, 'update']);
        Route::post('diagnostics/referral-partners/{referralPartner}/payouts', [ReferralPartnerController::class, 'storePayout']);
        Route::patch('diagnostics/orders/{diagnosticOrder}/schedule', [DiagnosticOrderController::class, 'schedule']);
        Route::patch('diagnostics/orders/{diagnosticOrder}/start', [DiagnosticOrderController::class, 'start']);
        Route::patch('diagnostics/orders/{diagnosticOrder}/visit-status', [DiagnosticOrderController::class, 'updateVisitStatus']);
        Route::patch('diagnostics/orders/{diagnosticOrder}/prescription', [DiagnosticOrderController::class, 'savePrescription']);
        Route::post('diagnostics/orders/{diagnosticOrder}/payments', [DiagnosticOrderController::class, 'recordPayment']);
        Route::post('diagnostics/orders/{diagnosticOrder}/refunds', [DiagnosticOrderController::class, 'processRefund']);
    });
    Route::middleware('permission:diagnostic.delete')->group(function () {
        Route::delete('diagnostics/categories/{diagnosticCategory}', [DiagnosticCategoryController::class, 'destroy']);
        Route::delete('diagnostics/types/{type}', [DiagnosticTestTypeController::class, 'destroy']);
        Route::delete('diagnostics/referral-partners/{referralPartner}', [ReferralPartnerController::class, 'destroy']);
        Route::patch('diagnostics/orders/{diagnosticOrder}/cancel', [DiagnosticOrderController::class, 'cancel']);
    });
    Route::middleware('permission:diagnostic.approve')->patch('diagnostics/orders/{diagnosticOrder}/approve', [DiagnosticOrderController::class, 'approveReport']);

    Route::get('companies-list', fn () => response()->json(
        \App\Models\Company::orderBy('name')->get(['id', 'name', 'code', 'type', 'is_active'])
    ))->middleware('permission:dashboard.view');
});
