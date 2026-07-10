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
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

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
