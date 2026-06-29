<?php

require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\LabTest;
use App\Models\LabTestCategory;
use App\Models\User;
use Illuminate\Support\Facades\Auth;

$user = User::where('role', User::ROLE_SUPER_ADMIN)->first();
Auth::login($user);

$cat = LabTestCategory::first();
$test = LabTest::first();

$kernel = $app->make(\Illuminate\Contracts\Http\Kernel::class);

$request = \Illuminate\Http\Request::create("/api/lab/tests/{$test->id}", 'PUT', ['name' => 'Updated Test Name']);
$request->headers->set('Accept', 'application/json');
$response = $kernel->handle($request);
$test->refresh();
echo "Test PUT: status={$response->getStatusCode()} db_name={$test->name}\n";

$request = \Illuminate\Http\Request::create("/api/lab/categories/{$cat->id}", 'PUT', ['name' => 'Updated Cat Name']);
$request->headers->set('Accept', 'application/json');
$response = $kernel->handle($request);
$cat->refresh();
echo "Cat PUT: status={$response->getStatusCode()} db_name={$cat->name}\n";
