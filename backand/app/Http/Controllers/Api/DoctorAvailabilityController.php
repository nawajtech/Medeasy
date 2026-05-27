<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Concerns\HandlesTenancy;
use App\Http\Controllers\Controller;
use App\Models\Doctor;
use App\Models\DoctorAvailability;
use App\Services\DoctorAvailabilityService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class DoctorAvailabilityController extends Controller
{
    use HandlesTenancy;

    public function __construct(
        private DoctorAvailabilityService $availabilityService
    ) {}

    public function index(string $doctorId): JsonResponse
    {
        $doctor = $this->resolveDoctor($doctorId);

        return response()->json([
            'doctor' => $this->doctorPayload($doctor),
            'days' => $this->availabilityService->weeklySchedule($doctor),
            'slot_duration_options' => DoctorAvailability::SLOT_DURATIONS,
        ]);
    }

    public function sync(Request $request, string $doctorId): JsonResponse
    {
        $doctor = $this->resolveDoctor($doctorId);
        $this->assertCanManageSchedule($doctor);

        $validated = $request->validate([
            'schedules' => ['required', 'array', 'min:1'],
            'schedules.*.day_of_week' => ['required', 'integer', 'between:0,6'],
            'schedules.*.is_active' => ['boolean'],
            'schedules.*.start_time' => ['required_if:schedules.*.is_active,true', 'date_format:H:i'],
            'schedules.*.end_time' => ['required_if:schedules.*.is_active,true', 'date_format:H:i', 'after:schedules.*.start_time'],
            'schedules.*.slot_duration' => [
                'required_if:schedules.*.is_active,true',
                'integer',
                Rule::in(DoctorAvailability::SLOT_DURATIONS),
            ],
            'schedules.*.max_patients' => ['required_if:schedules.*.is_active,true', 'integer', 'min:1', 'max:100'],
        ]);

        foreach ($validated['schedules'] as $item) {
            if (! ($item['is_active'] ?? false)) {
                continue;
            }
            if ($item['start_time'] >= $item['end_time']) {
                throw ValidationException::withMessages([
                    'schedules' => ['End time must be after start time for each active day.'],
                ]);
            }
        }

        $this->availabilityService->syncSchedule($doctor, $validated['schedules']);

        return response()->json([
            'message' => 'Doctor schedule saved successfully.',
            'doctor' => $this->doctorPayload($doctor),
            'days' => $this->availabilityService->weeklySchedule($doctor),
        ]);
    }

    public function check(Request $request, string $doctorId): JsonResponse
    {
        $doctor = $this->resolveDoctor($doctorId);

        $validated = $request->validate([
            'appointment_date' => ['required', 'date'],
            'duration_minutes' => ['nullable', 'integer', 'min:5', 'max:480'],
            'exclude_appointment_id' => ['nullable', 'integer', 'exists:appointments,id'],
        ]);

        $at = Carbon::parse($validated['appointment_date']);
        $duration = (int) ($validated['duration_minutes'] ?? 30);

        return response()->json(
            $this->availabilityService->check(
                $doctor,
                $at,
                $duration,
                $validated['exclude_appointment_id'] ?? null
            )
        );
    }

    private function resolveDoctor(string $doctorId): Doctor
    {
        $doctor = Doctor::with(['user', 'department', 'company'])->findOrFail($doctorId);
        $this->assertTenantAccess($doctor);

        if ($ownDoctorId = $this->doctorIdForUser()) {
            abort_unless((int) $doctor->id === $ownDoctorId, 403, 'You can only view your own schedule.');
        }

        return $doctor;
    }

    private function assertCanManageSchedule(Doctor $doctor): void
    {
        $user = auth()->user();

        if ($user->isDoctor()) {
            abort_unless($user->doctor?->id === $doctor->id, 403, 'You can only edit your own schedule.');
        }

        if (! $user->isSuperAdmin() && (int) $doctor->company_id !== (int) $user->company_id) {
            abort(403, 'You cannot manage this doctor\'s schedule.');
        }

        if ($user->isStaff() && ! $user->isCompanyAdmin()) {
            abort(403, 'Only company admins can manage doctor schedules.');
        }
    }

    private function doctorPayload(Doctor $doctor): array
    {
        return [
            'id' => $doctor->id,
            'doctor_code' => $doctor->doctor_code,
            'name' => $doctor->user?->name,
            'department' => $doctor->department?->name,
            'company_id' => $doctor->company_id,
            'company_name' => $doctor->company?->name,
        ];
    }
}
