<?php

require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\LabTestPackage;
use App\Models\User;
use Illuminate\Support\Facades\Auth;

Auth::login(User::where('role', User::ROLE_SUPER_ADMIN)->first());
$pkg = LabTestPackage::create(['company_id' => 6, 'name' => 'Del', 'price' => 1, 'is_active' => true]);
$id = $pkg->id;

$kernel = $app->make(\Illuminate\Contracts\Http\Kernel::class);
$req = \Illuminate\Http\Request::create("/api/lab/packages/{$id}", 'DELETE');
$req->headers->set('Accept', 'application/json');
$res = $kernel->handle($req);
echo "DELETE status: {$res->getStatusCode()}\n";
echo 'Still exists: ' . (LabTestPackage::find($id) ? 'yes' : 'no') . "\n";
