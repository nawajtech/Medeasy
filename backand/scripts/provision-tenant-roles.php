<?php

require __DIR__.'/../vendor/autoload.php';

$app = require __DIR__.'/../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$service = app(App\Services\TenantRoleProvisioningService::class);

App\Models\Company::query()->each(function (App\Models\Company $company) use ($service) {
    $service->provisionForCompany($company);
    echo "Provisioned: {$company->name}\n";
});

echo "All companies provisioned.\n";
