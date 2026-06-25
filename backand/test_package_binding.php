<?php

require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\LabTest;
use App\Models\LabTestPackage;
use App\Models\User;
use Illuminate\Support\Facades\Auth;

$companyId = LabTest::value('company_id');
$user = User::where('company_id', $companyId)->first()
    ?? User::whereNotNull('company_id')->first();

if (! $user) {
    echo "No user found\n";
    exit(1);
}

Auth::login($user);
echo "Logged in as: {$user->email}\n";

$test = LabTest::where('company_id', $companyId)->first();
if (! $test) {
    echo "No lab test found\n";
    exit(1);
}

$pkg = LabTestPackage::create([
    'company_id' => $companyId,
    'name' => 'Binding Test Pkg',
    'price' => 999,
    'is_active' => true,
]);
$pkg->tests()->sync([$test->id]);
echo "Created package id={$pkg->id}\n";

$kernel = $app->make(\Illuminate\Contracts\Http\Kernel::class);

// Test GET index
$request = \Illuminate\Http\Request::create('/api/lab/packages', 'GET');
$request->headers->set('Accept', 'application/json');
$response = $kernel->handle($request);
echo "GET index: {$response->getStatusCode()} " . substr($response->getContent(), 0, 100) . "\n";

// Test PUT update (route model binding)
$request = \Illuminate\Http\Request::create("/api/lab/packages/{$pkg->id}", 'PUT', [
    'name' => 'Updated Pkg',
    'price' => 888,
]);
$request->headers->set('Accept', 'application/json');
$response = $kernel->handle($request);
echo "PUT update: {$response->getStatusCode()} {$response->getContent()}\n";

$pkg->delete();
echo "Done\n";
