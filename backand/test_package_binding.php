<?php

require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\LabTest;
use App\Models\LabTestPackage;
use App\Models\User;
use Illuminate\Support\Facades\Auth;

$companyId = LabTest::value('company_id');
$user = User::where('role', User::ROLE_SUPER_ADMIN)->first();

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

// Test POST create
$request = \Illuminate\Http\Request::create('/api/lab/packages', 'POST', [
    'company_id' => $companyId,
    'name' => 'API Test Pkg',
    'price' => 777,
    'test_ids' => [$test->id],
    'is_active' => true,
]);
$request->headers->set('Accept', 'application/json');
$response = $kernel->handle($request);
echo "POST create: {$response->getStatusCode()} " . substr($response->getContent(), 0, 200) . "\n";
$created = json_decode($response->getContent(), true);
$newId = $created['id'] ?? $pkg->id;

// Test GET index
$request = \Illuminate\Http\Request::create('/api/lab/packages', 'GET');
$request->headers->set('Accept', 'application/json');
$response = $kernel->handle($request);
echo "GET index: {$response->getStatusCode()} " . substr($response->getContent(), 0, 100) . "\n";

// Test PUT update (route model binding)
$request = \Illuminate\Http\Request::create("/api/lab/packages/{$newId}", 'PUT', [
    'name' => 'Updated Pkg',
    'price' => 888,
]);
$request->headers->set('Accept', 'application/json');
$response = $kernel->handle($request);
echo "PUT update: {$response->getStatusCode()} {$response->getContent()}\n";

LabTestPackage::whereIn('id', [$pkg->id, $newId])->delete();
echo "Done\n";
