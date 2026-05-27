<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Concerns\HandlesTenancy;
use App\Http\Controllers\Controller;
use App\Models\Patient;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class PatientController extends Controller
{
    use HandlesTenancy;

    public function index(Request $request): JsonResponse
    {
        $query = Patient::with('company')->orderByDesc('created_at');

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
        $validated = $request->validate($this->rules(null, $companyId));

        $patient = Patient::create([
            ...$validated,
            'company_id' => $companyId,
            'patient_code' => $this->nextPatientCode($companyId),
            'status' => $request->boolean('status', true),
        ]);

        return response()->json($patient->load('company'), 201);
    }

    public function show(string $id): JsonResponse
    {
        $patient = Patient::with('company')->findOrFail($id);
        $this->assertTenantAccess($patient);

        if ($doctorId = $this->doctorIdForUser()) {
            $hasAccess = $patient->appointments()->where('doctor_id', $doctorId)->exists();
            abort_unless($hasAccess, 403, 'You can only view your assigned patients.');
        }

        return response()->json($patient);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $patient = Patient::findOrFail($id);
        $this->assertTenantAccess($patient);

        if ($this->doctorIdForUser()) {
            abort(403, 'Doctors cannot update patient records.');
        }

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
                'nullable',
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
