<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Concerns\HandlesTenancy;
use App\Http\Controllers\Controller;
use App\Models\Appointment;
use App\Models\AppointmentVital;
use App\Models\Doctor;
use App\Models\Patient;
use App\Models\Setting;
use App\Services\DoctorAvailabilityService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\View\View;

class AppointmentController extends Controller
{
    use HandlesTenancy;

    public function __construct(
        private DoctorAvailabilityService $availabilityService
    ) {}

    private const STATUSES = ['scheduled', 'confirmed', 'completed', 'cancelled'];

    public function index(Request $request): JsonResponse
    {
        $query = Appointment::with(['patient', 'doctor.user', 'doctor.department', 'billing', 'vitals', 'company', 'branch'])
            ->orderByDesc('appointment_date');

        if ($doctorId = $this->doctorIdForUser()) {
            $query->where('doctor_id', $doctorId);
        }

        if (auth()->user()->isSuperAdmin() && $request->filled('company_id')) {
            $query->where('company_id', (int) $request->company_id);
        }

        if ($request->filled('branch_id')) {
            $query->where('branch_id', (int) $request->branch_id);
        }

        return response()->json($query->get());
    }

    public function store(Request $request): JsonResponse
    {
        $appointmentData = $request->validate($this->appointmentRules());
        $billingData = $request->validate($this->billingRules());

        $patient = Patient::findOrFail($appointmentData['patient_id']);
        $doctor = Doctor::findOrFail($appointmentData['doctor_id']);
        $this->assertTenantAccess($patient);
        $this->assertTenantAccess($doctor);
        $this->assertSameCompany($patient, $doctor);

        if ($doctorId = $this->doctorIdForUser()) {
            abort_unless((int) $doctor->id === $doctorId, 403);
        }

        $appointmentData['company_id'] = $patient->company_id;

        $this->availabilityService->assertAvailable(
            $doctor,
            Carbon::parse($appointmentData['appointment_date']),
            (int) ($appointmentData['duration_minutes'] ?? 30)
        );

        $appointment = DB::transaction(function () use ($appointmentData, $billingData) {
            $appointment = Appointment::create($appointmentData);

            BillingController::syncForAppointment(
                $appointment->id,
                $appointment->patient_id,
                $appointment->company_id,
                $billingData
            );

            return $appointment;
        });

        return response()->json(
            $appointment->load(['patient', 'doctor.user', 'doctor.department', 'billing', 'vitals', 'company']),
            201
        );
    }

    public function show(string $id): JsonResponse
    {
        $appointment = Appointment::with(['patient', 'doctor.user', 'doctor.department', 'billing', 'vitals', 'company'])
            ->findOrFail($id);
        $this->assertTenantAccess($appointment);

        if ($doctorId = $this->doctorIdForUser()) {
            abort_unless((int) $appointment->doctor_id === $doctorId, 403);
        }

        return response()->json($appointment);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $appointment = Appointment::with('billing')->findOrFail($id);
        $this->assertTenantAccess($appointment);

        if ($doctorId = $this->doctorIdForUser()) {
            abort_unless((int) $appointment->doctor_id === $doctorId, 403);
        }

        $appointmentData = $request->validate($this->appointmentRules());
        $billingData = $request->validate($this->billingRules());

        $patient = Patient::findOrFail($appointmentData['patient_id']);
        $doctor = Doctor::findOrFail($appointmentData['doctor_id']);
        $this->assertSameCompany($patient, $doctor);

        $appointmentData['company_id'] = $patient->company_id;

        $this->availabilityService->assertAvailable(
            $doctor,
            Carbon::parse($appointmentData['appointment_date']),
            (int) ($appointmentData['duration_minutes'] ?? 30),
            (int) $appointment->id
        );

        DB::transaction(function () use ($appointment, $appointmentData, $billingData) {
            $appointment->update($appointmentData);

            BillingController::syncForAppointment(
                $appointment->id,
                $appointment->patient_id,
                $appointment->company_id,
                $billingData,
                $appointment->billing
            );
        });

        return response()->json($appointment->fresh(['patient', 'doctor.user', 'doctor.department', 'billing', 'vitals', 'company']));
    }

    public function destroy(string $id): JsonResponse
    {
        if ($this->doctorIdForUser()) {
            abort(403, 'Doctors cannot delete appointments.');
        }

        $appointment = Appointment::with('billing')->findOrFail($id);
        $this->assertTenantAccess($appointment);

        DB::transaction(function () use ($appointment) {
            $appointment->billing?->delete();
            $appointment->delete();
        });

        return response()->json(['message' => 'Appointment deleted successfully']);
    }

    public function prescription(string $id): View
    {
        $appointment = Appointment::with(['patient', 'doctor.user', 'doctor.department', 'company'])->findOrFail($id);
        $this->assertTenantAccess($appointment);

        $clinicName = Setting::where('company_id', $appointment->company_id)
            ->where('key', 'clinic_name')
            ->value('value') ?? $appointment->company?->name ?? 'MedEasy Clinic';

        return view('documents.prescription', [
            'appointment' => $appointment,
            'clinicName' => $clinicName,
        ]);
    }

    public function showVitals(string $id): JsonResponse
    {
        $appointment = Appointment::with('vitals')->findOrFail($id);
        $this->assertTenantAccess($appointment);

        if ($doctorId = $this->doctorIdForUser()) {
            abort_unless((int) $appointment->doctor_id === $doctorId, 403);
        }

        return response()->json($appointment->vitals);
    }

    public function updateVitals(Request $request, string $id): JsonResponse
    {
        $appointment = Appointment::findOrFail($id);
        $this->assertTenantAccess($appointment);

        if ($doctorId = $this->doctorIdForUser()) {
            abort_unless((int) $appointment->doctor_id === $doctorId, 403);
        }

        $validated = $request->validate($this->vitalsRules());

        $vitals = AppointmentVital::updateOrCreate(
            ['appointment_id' => $appointment->id],
            $validated
        );

        return response()->json($vitals);
    }

    private function vitalsRules(): array
    {
        return [
            'blood_pressure' => ['nullable', 'string', 'max:20', 'regex:/^\d{2,3}-\d{2,3}$/'],
            'heart_rate' => ['nullable', 'integer', 'min:0', 'max:300'],
            'body_temperature' => ['nullable', 'numeric', 'min:30', 'max:45'],
            'oxygen_saturation' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'respiratory_rate' => ['nullable', 'integer', 'min:0', 'max:100'],
            'blood_sugar' => ['nullable', 'numeric', 'min:0', 'max:1000'],
        ];
    }

    private function appointmentRules(): array
    {
        return [
            'patient_id' => ['required', 'exists:patients,id'],
            'doctor_id' => ['required', 'exists:doctors,id'],
            'branch_id' => ['nullable', 'exists:branches,id'],
            'appointment_date' => ['required', 'date'],
            'duration_minutes' => ['nullable', 'integer', 'min:5', 'max:480'],
            'status' => ['required', Rule::in(self::STATUSES)],
            'reason' => ['nullable', 'string', 'max:255'],
            'notes' => ['nullable', 'string'],
            'prescription' => ['nullable', 'string'],
        ];
    }

    private function billingRules(): array
    {
        return [
            'previous_due' => ['nullable', 'numeric', 'min:0'],
            'charge_amount' => ['required', 'numeric', 'min:0'],
            'paid_amount' => ['required', 'numeric', 'min:0'],
            'payment_method' => ['nullable', 'string', 'max:50'],
            'billed_at' => ['nullable', 'date'],
            'notes' => ['nullable', 'string'],
        ];
    }
}
