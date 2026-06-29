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

$test = LabTest::where('company_id', $companyId)->first();
$pkg = LabTestPackage::create([
    'company_id' => $companyId,
    'name' => 'Before Update',
    'price' => 100,
    'is_active' => true,
]);
$pkg->tests()->sync([$test->id]);
echo "Created id={$pkg->id} name={$pkg->name}\n";

$kernel = $app->make(\Illuminate\Contracts\Http\Kernel::class);
$request = \Illuminate\Http\Request::create("/api/lab/packages/{$pkg->id}", 'PUT', [
    'name' => 'After Update',
    'price' => 200,
]);
$request->headers->set('Accept', 'application/json');
$response = $kernel->handle($request);
echo "PUT status: {$response->getStatusCode()}\n";
echo "PUT body: {$response->getContent()}\n";

$pkg->refresh();
echo "DB after PUT: id={$pkg->id} name={$pkg->name} price={$pkg->price}\n";

$pkg->forceDelete();
