<?php

use App\Models\Appointment;
use App\Models\Billing;
use App\Models\Branch;
use App\Models\Company;
use App\Models\Department;
use App\Models\DiagnosticCategory;
use App\Models\DiagnosticOrder;
use App\Models\DiagnosticPackage;
use App\Models\DiagnosticReport;
use App\Models\DiagnosticTestType;
use App\Models\Doctor;
use App\Models\Expense;
use App\Models\LabOrder;
use App\Models\LabTest;
use App\Models\LabTestCategory;
use App\Models\LabTestPackage;
use App\Models\Medicine;
use App\Models\Patient;
use App\Models\Plan;
use App\Models\ReferralCommissionPayout;
use App\Models\ReferralPartner;
use App\Models\Report;
use App\Models\Role;
use App\Models\Setting;
use App\Models\Subscription;
use App\Models\User;

return [

    /** Fields never stored in old_values / new_values. */
    'hidden_fields' => [
        'password',
        'remember_token',
        'created_at',
        'updated_at',
        'deleted_at',
        'email_verified_at',
        'last_login_at',
    ],

    /**
     * Models automatically audited via model events (create / update / delete).
     * module: sidebar module key; label: attribute used for human-readable record name.
     */
    'models' => [
        Patient::class => ['module' => 'patients', 'label' => 'name'],
        Appointment::class => ['module' => 'appointments', 'label' => 'id'],
        Billing::class => ['module' => 'billing', 'label' => 'id'],
        Doctor::class => ['module' => 'doctors', 'label' => 'id'],
        Department::class => ['module' => 'departments', 'label' => 'name'],
        Branch::class => ['module' => 'branches', 'label' => 'name'],
        User::class => ['module' => 'users', 'label' => 'name'],
        Role::class => ['module' => 'roles', 'label' => 'name'],
        Setting::class => ['module' => 'settings', 'label' => 'key'],
        Report::class => ['module' => 'reports', 'label' => 'title'],
        Expense::class => ['module' => 'finance', 'label' => 'description'],
        LabTestCategory::class => ['module' => 'lab', 'label' => 'name'],
        LabTest::class => ['module' => 'lab', 'label' => 'name'],
        LabTestPackage::class => ['module' => 'lab', 'label' => 'name'],
        LabOrder::class => ['module' => 'lab', 'label' => 'order_number'],
        DiagnosticCategory::class => ['module' => 'diagnostics', 'label' => 'name'],
        DiagnosticTestType::class => ['module' => 'diagnostics', 'label' => 'name'],
        DiagnosticPackage::class => ['module' => 'diagnostics', 'label' => 'package_name'],
        DiagnosticOrder::class => ['module' => 'diagnostics', 'label' => 'order_number'],
        DiagnosticReport::class => ['module' => 'diagnostics', 'label' => 'id'],
        ReferralPartner::class => ['module' => 'diagnostics', 'label' => 'name'],
        ReferralCommissionPayout::class => ['module' => 'diagnostics', 'label' => 'id'],
        Medicine::class => ['module' => 'medicine', 'label' => 'name'],
        Company::class => ['module' => 'companies', 'label' => 'name'],
        Plan::class => ['module' => 'companies', 'label' => 'name'],
        Subscription::class => ['module' => 'subscription', 'label' => 'id'],
    ],

    /** Route name patterns → audit action for document access (print / download). */
    'document_routes' => [
        'invoice' => 'print',
        'prescription' => 'print',
    ],

];
