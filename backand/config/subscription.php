<?php

use App\Models\Feature;
use App\Models\PlanLimit;

/**
 * Maps subscription plan features to permission module keys (see config/permissions.php).
 * Effective access = company enabled modules ∩ subscription feature modules ∩ role permissions.
 */
return [

    /** Available when subscription is active (trial or paid). */
    'core_modules' => [
        'dashboard',
        'settings',
        'users',
        'roles',
        'audit',
    ],

    /** Minimal access when subscription is missing or expired. */
    'fallback_modules' => [
        'settings',
    ],

    'feature_module_map' => [
        Feature::PATIENT_MANAGEMENT => ['patients', 'departments'],
        Feature::APPOINTMENT_MANAGEMENT => ['appointments', 'doctors', 'prescriptions'],
        Feature::BILLING => ['billing', 'finance'],
        Feature::LAB_MODULE => ['lab'],
        Feature::DIAGNOSTICS_MODULE => ['diagnostics'],
        Feature::PHARMACY => ['medicine'],
        Feature::INVENTORY => [],
        Feature::MULTI_BRANCH => ['branches'],
        Feature::API_ACCESS => [],
        Feature::ANALYTICS => ['reports'],
        Feature::AI_OCR => [],
        Feature::AI_REPORT_EXPLANATION => [],
        Feature::VOICE_ASSISTANT => [],
        Feature::AI_CHAT_ASSISTANT => [],
    ],

    'limit_labels' => [
        PlanLimit::MAX_USERS => 'Maximum users',
        PlanLimit::MAX_BRANCHES => 'Maximum branches',
        PlanLimit::MAX_STORAGE_MB => 'Maximum storage (MB)',
        PlanLimit::MAX_PATIENTS => 'Maximum patients',
        PlanLimit::MAX_MONTHLY_REPORTS => 'Maximum monthly reports',
        PlanLimit::MAX_API_REQUESTS => 'Maximum API requests per month',
    ],

    /** Default plan assigned when a company is created without an explicit plan. */
    'default_plan_code' => 'basic',

    'payment_methods' => [
        'upi' => 'UPI',
        'bank_transfer' => 'Bank Transfer',
        'card' => 'Credit / Debit Card',
        'cash' => 'Cash',
    ],

];
