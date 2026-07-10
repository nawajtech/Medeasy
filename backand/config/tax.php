<?php

/**
 * Platform-wide tax defaults (subscription billing to hospitals).
 * Per-clinic diagnostic tax is configured in Settings → Billing.
 */
return [

    'subscription' => [
        'enabled' => env('SUBSCRIPTION_TAX_ENABLED', true),
        'mode' => env('SUBSCRIPTION_TAX_MODE', 'igst'), // cgst_sgst | igst
        'rate' => (float) env('SUBSCRIPTION_TAX_RATE', 18),
        'inclusive' => (bool) env('SUBSCRIPTION_TAX_INCLUSIVE', false),
    ],

];
