<?php

require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\Company;
use App\Models\Department;
use App\Models\DiagnosticCategory;
use App\Models\DiagnosticTestType;
use App\Models\Doctor;
use App\Models\Patient;
use App\Models\User;
use App\Services\UserRoleService;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;

$company = Company::whereJsonContains('modules', 'diagnostics')
    ->whereHas('doctors')
    ->first();

if (! $company) {
    $company = Company::whereJsonContains('modules', 'diagnostics')->first();
}

if (! $company) {
    echo "No diagnostics company found\n";
    exit(1);
}

$admin = User::where('company_id', $company->id)->where('role', User::ROLE_COMPANY_ADMIN)->first();
if (! $admin) {
    echo "No company admin found\n";
    exit(1);
}

Auth::login($admin);
echo "Company: {$company->name}\n";
echo "Logged in as: {$admin->email}\n";

$doctor = Doctor::where('company_id', $company->id)->first();
if (! $doctor) {
    $dept = Department::firstOrCreate(
        ['company_id' => $company->id, 'name' => 'Radiology'],
        ['is_active' => true]
    );
    $doctorUser = User::updateOrCreate(
        ['email' => 'diag-doctor-test@medeasy.local'],
        [
            'name' => 'Diag Test Doctor',
            'password' => Hash::make('password'),
            'role' => User::ROLE_DOCTOR,
            'company_id' => $company->id,
            'status' => true,
        ]
    );
    app(UserRoleService::class)->assignRole($doctorUser, User::ROLE_DOCTOR);
    $doctor = Doctor::updateOrCreate(
        ['user_id' => $doctorUser->id],
        [
            'company_id' => $company->id,
            'department_id' => $dept->id,
            'doctor_code' => 'DIAG-TEST-001',
            'consultation_fee' => 1000,
        ]
    );
    echo "Created temporary test doctor id={$doctor->id}\n";
}
echo "Doctor: {$doctor->user?->name} (id={$doctor->id})\n";

$category = DiagnosticCategory::firstOrCreate(
    ['company_id' => $company->id, 'name' => 'Binding Test Category'],
    ['is_active' => true, 'sort_order' => 99]
);

$test = DiagnosticTestType::create([
    'company_id' => $company->id,
    'category_id' => $category->id,
    'name' => 'Binding Test Scan',
    'code' => 'BTS-001',
    'modality' => 'other',
    'price' => 1500,
    'is_active' => true,
]);
$test->doctors()->sync([$doctor->id]);
echo "Created test id={$test->id} mapped to doctor id={$doctor->id}\n";

$kernel = $app->make(\Illuminate\Contracts\Http\Kernel::class);

$request = \Illuminate\Http\Request::create('/api/diagnostics/types', 'GET');
$request->headers->set('Accept', 'application/json');
$response = $kernel->handle($request);
$payload = json_decode($response->getContent(), true);
$found = collect($payload)->firstWhere('id', $test->id);
$mapped = collect($found['doctors'] ?? [])->pluck('id')->all();
echo "GET types: {$response->getStatusCode()} doctors on test: ".json_encode($mapped)."\n";

$request = \Illuminate\Http\Request::create("/api/diagnostics/types/{$test->id}", 'PUT', [
    'doctor_ids' => [$doctor->id],
    'name' => 'Binding Test Scan Updated',
]);
$request->headers->set('Accept', 'application/json');
$response = $kernel->handle($request);
echo "PUT update: {$response->getStatusCode()} ".substr($response->getContent(), 0, 120)."\n";

$patient = Patient::where('company_id', $company->id)->first();
if (! $patient) {
    echo "No patient found — skipping order test\n";
    $test->delete();
    exit(0);
}

$request = \Illuminate\Http\Request::create('/api/diagnostics/orders', 'POST', [
    'patient_id' => $patient->id,
    'test_type_id' => $test->id,
    'doctor_id' => $doctor->id,
    'priority' => 'routine',
]);
$request->headers->set('Accept', 'application/json');
$response = $kernel->handle($request);
echo "POST order (mapped doctor): {$response->getStatusCode()} ".substr($response->getContent(), 0, 160)."\n";
$order = json_decode($response->getContent(), true);

if (! empty($order['id'])) {
    \App\Models\DiagnosticOrder::where('id', $order['id'])->delete();
}

$test->delete();
echo "Done\n";
