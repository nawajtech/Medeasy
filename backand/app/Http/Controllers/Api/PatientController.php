<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Concerns\HandlesTenancy;
use App\Http\Controllers\Controller;
use App\Models\DiagnosticOrder;
use App\Models\LabOrder;
use App\Models\Patient;
use App\Models\Appointment;
use App\Models\PlanLimit;
use App\Services\PatientWalletService;
use App\Services\SubscriptionService;
use App\Support\SpreadsheetIO;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\StreamedResponse;

class PatientController extends Controller
{
    use HandlesTenancy;

    public function index(Request $request): JsonResponse
    {
        $query = Patient::with(['company', 'wallet'])->orderByDesc('created_at');

        if ($doctorId = $this->doctorIdForUser()) {
            $query->whereHas('appointments', fn ($q) => $q->where('doctor_id', $doctorId));
        }

        if (auth()->user()->isSuperAdmin() && $request->filled('company_id')) {
            $query->where('company_id', (int) $request->company_id);
        }

        return response()->json($query->get());
    }

    public function store(Request $request): JsonResponse
    {
        $companyId = $this->resolveCompanyId($request);
        $request->merge(['phone' => trim((string) $request->input('phone', ''))]);
        $validated = $request->validate($this->rules(null, $companyId));

        $company = \App\Models\Company::findOrFail($companyId);
        app(SubscriptionService::class)->assertUnderLimit(
            $company,
            PlanLimit::MAX_PATIENTS,
            Patient::where('company_id', $companyId)->count()
        );

        $patient = Patient::create([
            ...$validated,
            'company_id' => $companyId,
            'patient_code' => $this->nextPatientCode($companyId),
            'status' => $request->boolean('status', true),
        ]);

        app(PatientWalletService::class)->ensureWallet($patient);

        return response()->json($patient->load(['company', 'wallet']), 201);
    }

    public function show(string $id): JsonResponse
    {
        $patient = Patient::with('company')->findOrFail($id);
        $this->assertTenantAccess($patient);

        if ($doctorId = $this->doctorIdForUser()) {
            $hasAccess = $patient->appointments()->where('doctor_id', $doctorId)->exists();
            abort_unless($hasAccess, 403, 'You can only view your assigned patients.');
        }

        return response()->json($patient->load(['company', 'wallet']));
    }

    public function wallet(string $id): JsonResponse
    {
        $patient = Patient::with('company')->findOrFail($id);
        $this->assertTenantAccess($patient);

        if ($doctorId = $this->doctorIdForUser()) {
            $hasAccess = $patient->appointments()->where('doctor_id', $doctorId)->exists();
            abort_unless($hasAccess, 403, 'You can only view your assigned patients.');
        }

        return response()->json(app(PatientWalletService::class)->summary($patient));
    }

    public function history(string $id): JsonResponse
    {
        $patient = Patient::with('company')->findOrFail($id);
        $this->assertTenantAccess($patient);

        if ($doctorId = $this->doctorIdForUser()) {
            $hasAccess = $patient->appointments()->where('doctor_id', $doctorId)->exists();
            abort_unless($hasAccess, 403, 'You can only view your assigned patients.');
        }

        $appointments = Appointment::with(['doctor.user', 'doctor.department', 'billing', 'vitals', 'branch'])
            ->where('patient_id', $patient->id)
            ->orderByDesc('appointment_date')
            ->get();

        $labOrders = LabOrder::with([
            'doctor.user',
            'items.test',
            'items.result',
            'results.test',
        ])
            ->where('patient_id', $patient->id)
            ->orderByDesc('ordered_at')
            ->orderByDesc('created_at')
            ->get();

        $diagnosticOrders = DiagnosticOrder::with([
            'doctor.user',
            'testType',
            'report.reporter',
        ])
            ->where('patient_id', $patient->id)
            ->orderByDesc('created_at')
            ->get();

        $appointmentPayload = $appointments->map(fn (Appointment $a) => [
            'id' => $a->id,
            'type' => 'appointment',
            'date' => $a->appointment_date?->toIso8601String(),
            'status' => $a->status,
            'doctor_name' => $a->doctor?->user?->name,
            'department' => $a->doctor?->department?->name,
            'branch' => $a->branch?->name,
            'reason' => $a->reason,
            'notes' => $a->notes,
            'prescription' => $a->prescription,
            'prescription_data' => $a->prescription_data,
            'prescription_type' => $a->prescription_type ?? 'handwritten',
            'prescription_file' => $a->prescription_file,
            'prescription_file_url' => $a->prescription_file_url,
            'duration_minutes' => $a->duration_minutes,
            'vitals' => $a->vitals,
            'billing' => $a->billing ? [
                'total_amount' => $a->billing->total_amount,
                'paid_amount' => $a->billing->paid_amount,
                'due_amount' => $a->billing->due_amount,
                'payment_status' => $a->billing->payment_status,
            ] : null,
        ]);

        $prescriptions = $appointmentPayload
            ->filter(fn ($a) => filled($a['prescription']) || filled($a['prescription_file']))
            ->values();

        $labPayload = $labOrders->map(fn (LabOrder $o) => [
            'id' => $o->id,
            'type' => 'lab_order',
            'date' => ($o->ordered_at ?? $o->created_at)?->toIso8601String(),
            'order_number' => $o->order_number,
            'status' => $o->status,
            'doctor_name' => $o->doctor?->user?->name,
            'net_amount' => $o->net_amount,
            'tests' => $o->items->map(fn ($item) => [
                'name' => $item->test?->name,
                'result' => $item->result ? [
                    'value' => $item->result->value,
                    'unit' => $item->result->unit,
                    'ref_range' => $item->result->ref_range,
                    'flag' => $item->result->flag,
                ] : null,
            ])->values(),
        ]);

        $diagnosticPayload = $diagnosticOrders->map(fn (DiagnosticOrder $o) => [
            'id' => $o->id,
            'type' => 'diagnostic_order',
            'date' => ($o->scheduled_at ?? $o->created_at)?->toIso8601String(),
            'order_number' => $o->order_number,
            'status' => $o->status,
            'test_name' => $o->testType?->name,
            'modality' => $o->testType?->modality,
            'doctor_name' => $o->doctor?->user?->name,
            'priority' => $o->priority,
            'clinical_notes' => $o->clinical_notes,
            'report' => $o->report ? [
                'findings' => $o->report->findings,
                'impression' => $o->report->impression,
                'recommendations' => $o->report->recommendations,
                'reported_by' => $o->report->reporter?->name,
                'approved_at' => $o->report->approved_at?->toIso8601String(),
            ] : null,
        ]);

        $timeline = collect()
            ->merge($appointmentPayload)
            ->merge($labPayload)
            ->merge($diagnosticPayload)
            ->sortByDesc(fn ($item) => Carbon::parse($item['date'] ?? now()))
            ->values();

        return response()->json([
            'patient' => $patient,
            'summary' => [
                'appointments' => $appointments->count(),
                'prescriptions' => $prescriptions->count(),
                'lab_orders' => $labOrders->count(),
                'diagnostic_orders' => $diagnosticOrders->count(),
                'last_visit' => $appointments->first()?->appointment_date?->toIso8601String(),
            ],
            'timeline' => $timeline,
            'appointments' => $appointmentPayload->values(),
            'prescriptions' => $prescriptions,
            'lab_orders' => $labPayload->values(),
            'diagnostic_orders' => $diagnosticPayload->values(),
        ]);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $patient = Patient::findOrFail($id);
        $this->assertTenantAccess($patient);

        if ($this->doctorIdForUser()) {
            abort(403, 'Doctors cannot update patient records.');
        }

        $request->merge(['phone' => trim((string) $request->input('phone', ''))]);
        $validated = $request->validate($this->rules($patient, $patient->company_id));

        if (empty($validated['password'])) {
            unset($validated['password']);
        }

        $patient->update([
            ...$validated,
            'status' => $request->boolean('status', true),
        ]);

        return response()->json($patient->fresh(['company']));
    }

    public function destroy(string $id): JsonResponse
    {
        if ($this->doctorIdForUser()) {
            abort(403, 'Doctors cannot delete patient records.');
        }

        $patient = Patient::findOrFail($id);
        $this->assertTenantAccess($patient);
        $patient->delete();

        return response()->json(['message' => 'Patient deleted successfully']);
    }

    public function export(Request $request): StreamedResponse
    {
        if ($this->doctorIdForUser()) {
            abort(403, 'Doctors cannot export patient records.');
        }

        $query = Patient::query()->orderBy('name');

        if (auth()->user()->isSuperAdmin() && $request->filled('company_id')) {
            $query->where('company_id', (int) $request->company_id);
        } elseif (! auth()->user()->isSuperAdmin()) {
            $query->where('company_id', auth()->user()->company_id);
        }

        $headers = [
            'patient_code',
            'name',
            'email',
            'phone',
            'status',
            'gender',
            'date_of_birth',
            'blood_group',
            'height',
            'weight',
            'address',
            'emergency_contact_name',
            'emergency_contact_phone',
            'allergies',
            'medical_history',
        ];

        $filename = 'patients-'.now()->format('Y-m-d');

        return SpreadsheetIO::exportExcel($filename, $headers, function () use ($query) {
            foreach ($query->cursor() as $patient) {
                yield [
                    $patient->patient_code,
                    $patient->name,
                    $patient->email,
                    $patient->phone,
                    $patient->status ? 'active' : 'inactive',
                    $patient->gender,
                    $patient->date_of_birth?->format('Y-m-d'),
                    $patient->blood_group,
                    $patient->height,
                    $patient->weight,
                    $patient->address,
                    $patient->emergency_contact_name,
                    $patient->emergency_contact_phone,
                    $patient->allergies,
                    $patient->medical_history,
                ];
            }
        });
    }

    public function importTemplate(): StreamedResponse
    {
        if ($this->doctorIdForUser()) {
            abort(403, 'Doctors cannot download patient import templates.');
        }

        $headers = [
            'patient_code',
            'name',
            'email',
            'phone',
            'password',
            'status',
            'gender',
            'date_of_birth',
            'blood_group',
            'height',
            'weight',
            'address',
            'emergency_contact_name',
            'emergency_contact_phone',
            'allergies',
            'medical_history',
        ];

        $sampleRows = [[
            '',
            'John Doe',
            'john.doe@example.com',
            '9876543210',
            'Password@123',
            'active',
            'male',
            '1990-05-15',
            'B+',
            '175',
            '70',
            '123 Main Street, City',
            'Jane Doe',
            '9876543211',
            'Penicillin',
            'Hypertension',
        ]];

        return SpreadsheetIO::exportTemplate('patient-import-sample', $headers, $sampleRows);
    }

    public function import(Request $request): JsonResponse
    {
        if ($this->doctorIdForUser()) {
            abort(403, 'Doctors cannot import patient records.');
        }

        $request->validate([
            'file' => ['required', 'file', 'mimes:csv,txt,xls', 'max:2048'],
            'company_id' => $this->companyIdRules(),
        ]);

        $companyId = $this->resolveCompanyId($request);
        $company = \App\Models\Company::findOrFail($companyId);

        try {
            $sheet = SpreadsheetIO::readUploadedFile($request->file('file'));
        } catch (\Throwable $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        $columnMap = SpreadsheetIO::mapHeaders($sheet['headers'], [
            'name' => ['name', 'patient_name', 'full_name'],
            'email' => ['email', 'email_address'],
            'phone' => ['phone', 'mobile', 'phone_number', 'contact'],
            'password' => ['password', 'pass'],
            'patient_code' => ['patient_code', 'code', 'patient_id'],
            'status' => ['status', 'active'],
            'gender' => ['gender', 'sex'],
            'date_of_birth' => ['date_of_birth', 'dob', 'birth_date'],
            'blood_group' => ['blood_group', 'blood'],
            'height' => ['height'],
            'weight' => ['weight'],
            'address' => ['address'],
            'emergency_contact_name' => ['emergency_contact_name', 'emergency_name'],
            'emergency_contact_phone' => ['emergency_contact_phone', 'emergency_phone'],
            'allergies' => ['allergies'],
            'medical_history' => ['medical_history', 'history'],
        ]);

        if (! isset($columnMap['name'], $columnMap['email'], $columnMap['phone'])) {
            return response()->json(['message' => 'Spreadsheet must include name, email, and phone columns.'], 422);
        }

        $imported = 0;
        $updated = 0;
        $skipped = 0;
        $errors = [];
        $line = 1;
        $walletService = app(PatientWalletService::class);
        $subscriptionService = app(SubscriptionService::class);

        foreach ($sheet['rows'] as $row) {
            $line++;

            if (SpreadsheetIO::isEmptyRow($row)) {
                continue;
            }

            $name = SpreadsheetIO::cell($row, $columnMap, 'name');
            $email = SpreadsheetIO::cell($row, $columnMap, 'email');
            $phone = SpreadsheetIO::cell($row, $columnMap, 'phone');

            if ($name === '' || $email === '' || $phone === '') {
                $skipped++;
                if (count($errors) < 20) {
                    $errors[] = "Line {$line}: name, email, and phone are required.";
                }
                continue;
            }

            $existing = Patient::where('company_id', $companyId)->where('email', $email)->first();
            $password = SpreadsheetIO::cell($row, $columnMap, 'password');

            if (! $existing) {
                $subscriptionService->assertUnderLimit(
                    $company,
                    PlanLimit::MAX_PATIENTS,
                    Patient::where('company_id', $companyId)->count()
                );

                if ($password === '') {
                    $password = 'Password@123';
                }
            } elseif ($password === '') {
                $password = null;
            }

            $payload = [
                'name' => $name,
                'email' => $email,
                'phone' => $phone,
                'status' => $this->parseStatus(SpreadsheetIO::cell($row, $columnMap, 'status'), true),
                'gender' => $this->nullableValue(SpreadsheetIO::cell($row, $columnMap, 'gender'), ['male', 'female', 'other']),
                'date_of_birth' => $this->nullableDate(SpreadsheetIO::cell($row, $columnMap, 'date_of_birth')),
                'blood_group' => $this->nullableString(SpreadsheetIO::cell($row, $columnMap, 'blood_group')),
                'height' => $this->nullableNumber(SpreadsheetIO::cell($row, $columnMap, 'height')),
                'weight' => $this->nullableNumber(SpreadsheetIO::cell($row, $columnMap, 'weight')),
                'address' => $this->nullableString(SpreadsheetIO::cell($row, $columnMap, 'address')),
                'emergency_contact_name' => $this->nullableString(SpreadsheetIO::cell($row, $columnMap, 'emergency_contact_name')),
                'emergency_contact_phone' => $this->nullableString(SpreadsheetIO::cell($row, $columnMap, 'emergency_contact_phone')),
                'allergies' => $this->nullableString(SpreadsheetIO::cell($row, $columnMap, 'allergies')),
                'medical_history' => $this->nullableString(SpreadsheetIO::cell($row, $columnMap, 'medical_history')),
            ];

            if ($password !== null) {
                $payload['password'] = $password;
            }

            $patientCode = SpreadsheetIO::cell($row, $columnMap, 'patient_code');

            try {
                if ($existing) {
                    if ($patientCode !== '') {
                        $payload['patient_code'] = $patientCode;
                    }
                    $existing->update($payload);
                    $updated++;
                } else {
                    $patient = Patient::create([
                        ...$payload,
                        'company_id' => $companyId,
                        'patient_code' => $patientCode !== '' ? $patientCode : $this->nextPatientCode($companyId),
                    ]);
                    $walletService->ensureWallet($patient);
                    $imported++;
                }
            } catch (\Throwable $e) {
                $skipped++;
                if (count($errors) < 20) {
                    $errors[] = "Line {$line}: ".$e->getMessage();
                }
            }
        }

        $message = "Import complete. {$imported} patient(s) created";
        if ($updated > 0) {
            $message .= ", {$updated} updated";
        }
        $message .= '.';

        return response()->json([
            'message' => $message,
            'imported' => $imported,
            'updated' => $updated,
            'skipped' => $skipped,
            'errors' => $errors,
        ]);
    }

    private function parseStatus(string $value, bool $default): bool
    {
        if ($value === '') {
            return $default;
        }

        return in_array(strtolower($value), ['1', 'true', 'yes', 'active', 'y'], true);
    }

    private function nullableString(string $value): ?string
    {
        return $value !== '' ? $value : null;
    }

    private function nullableNumber(string $value): ?float
    {
        if ($value === '') {
            return null;
        }

        return is_numeric($value) ? (float) $value : null;
    }

    private function nullableDate(string $value): ?string
    {
        if ($value === '') {
            return null;
        }

        try {
            return Carbon::parse($value)->format('Y-m-d');
        } catch (\Throwable) {
            return null;
        }
    }

    /** @param  array<int, string>  $allowed */
    private function nullableValue(string $value, array $allowed): ?string
    {
        if ($value === '') {
            return null;
        }

        $normalized = strtolower($value);

        return in_array($normalized, $allowed, true) ? $normalized : null;
    }

    private function rules(?Patient $patient = null, ?int $companyId = null): array
    {
        $patientId = $patient?->id;
        $companyId ??= $patient?->company_id ?? auth()->user()?->company_id;

        return [
            'company_id' => auth()->user()->isSuperAdmin()
                ? ['required', 'exists:companies,id']
                : ['prohibited'],
            'name' => ['required', 'string', 'max:255'],
            'email' => [
                'required',
                'email',
                Rule::unique('patients', 'email')->where('company_id', $companyId)->ignore($patientId),
            ],
            'password' => [$patient ? 'nullable' : 'required', 'string', 'min:8'],
            'phone' => [
                'required',
                'string',
                'max:20',
                Rule::unique('patients', 'phone')->where('company_id', $companyId)->ignore($patientId),
            ],
            'status' => ['boolean'],
            'patient_code' => [
                $patient ? 'required' : 'nullable',
                'string',
                'max:50',
                Rule::unique('patients', 'patient_code')->where('company_id', $companyId)->ignore($patientId),
            ],
            'gender' => ['nullable', Rule::in(['male', 'female', 'other'])],
            'date_of_birth' => ['nullable', 'date'],
            'blood_group' => ['nullable', 'string', 'max:10'],
            'height' => ['nullable', 'numeric', 'min:0'],
            'weight' => ['nullable', 'numeric', 'min:0'],
            'address' => ['nullable', 'string'],
            'emergency_contact_name' => ['nullable', 'string', 'max:255'],
            'emergency_contact_phone' => ['nullable', 'string', 'max:20'],
            'allergies' => ['nullable', 'string'],
            'medical_history' => ['nullable', 'string'],
        ];
    }

    private function nextPatientCode(int $companyId): string
    {
        $num = Patient::withTrashed()->where('company_id', $companyId)->count() + 1;

        return 'PAT-'.str_pad((string) $num, 5, '0', STR_PAD_LEFT);
    }
}
