<?php

namespace App\Services;

use App\Models\Appointment;
use App\Models\Doctor;
use App\Models\DoctorAvailability;
use Carbon\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Validation\ValidationException;

class DoctorAvailabilityService
{
    public function weeklySchedule(Doctor $doctor): array
    {
        $existing = DoctorAvailability::where('doctor_id', $doctor->id)
            ->orderBy('day_of_week')
            ->get()
            ->keyBy('day_of_week');

        $days = [];
        foreach (DoctorAvailability::DAY_LABELS as $dow => $label) {
            $row = $existing->get($dow);
            $days[] = [
                'id' => $row?->id,
                'day_of_week' => $dow,
                'day_label' => $label,
                'start_time' => $row ? substr((string) $row->start_time, 0, 5) : '09:00',
                'end_time' => $row ? substr((string) $row->end_time, 0, 5) : '17:00',
                'slot_duration' => $row?->slot_duration ?? 30,
                'max_patients' => $row?->max_patients ?? 10,
                'is_active' => $row ? (bool) $row->is_active : ($dow >= 1 && $dow <= 5),
            ];
        }

        return $days;
    }

    public function syncSchedule(Doctor $doctor, array $schedules): Collection
    {
        DoctorAvailability::where('doctor_id', $doctor->id)->delete();

        $created = collect();

        foreach ($schedules as $item) {
            if (! ($item['is_active'] ?? false)) {
                continue;
            }

            $created->push(DoctorAvailability::create([
                'company_id' => $doctor->company_id,
                'doctor_id' => $doctor->id,
                'day_of_week' => (int) $item['day_of_week'],
                'start_time' => $item['start_time'],
                'end_time' => $item['end_time'],
                'slot_duration' => (int) $item['slot_duration'],
                'max_patients' => (int) $item['max_patients'],
                'is_active' => true,
            ]));
        }

        return $created;
    }

    public function assertAvailable(
        Doctor $doctor,
        Carbon $appointmentAt,
        int $durationMinutes,
        ?int $excludeAppointmentId = null
    ): void {
        $check = $this->check($doctor, $appointmentAt, $durationMinutes, $excludeAppointmentId);

        if (! $check['available']) {
            throw ValidationException::withMessages([
                'appointment_date' => [$check['message']],
            ]);
        }
    }

    public function check(
        Doctor $doctor,
        Carbon $appointmentAt,
        int $durationMinutes,
        ?int $excludeAppointmentId = null
    ): array {
        $dayOfWeek = $appointmentAt->dayOfWeek;
        $availability = DoctorAvailability::where('doctor_id', $doctor->id)
            ->where('day_of_week', $dayOfWeek)
            ->where('is_active', true)
            ->first();

        if (! $availability) {
            return [
                'available' => false,
                'message' => 'Doctor is not available on '.$appointmentAt->format('l').'.',
            ];
        }

        $start = Carbon::parse($appointmentAt->format('Y-m-d').' '.$availability->start_time);
        $end = Carbon::parse($appointmentAt->format('Y-m-d').' '.$availability->end_time);
        $slotEnd = $appointmentAt->copy()->addMinutes($durationMinutes);

        if ($appointmentAt->lt($start) || $slotEnd->gt($end)) {
            return [
                'available' => false,
                'message' => sprintf(
                    'Appointment must be within %s–%s on %s.',
                    substr((string) $availability->start_time, 0, 5),
                    substr((string) $availability->end_time, 0, 5),
                    $availability->day_label
                ),
            ];
        }

        if ($durationMinutes > $availability->slot_duration) {
            return [
                'available' => false,
                'message' => sprintf(
                    'Maximum slot duration for this day is %d minutes.',
                    $availability->slot_duration
                ),
            ];
        }

        $dayStart = $appointmentAt->copy()->startOfDay();
        $dayEnd = $appointmentAt->copy()->endOfDay();

        $sameDayCount = Appointment::where('doctor_id', $doctor->id)
            ->whereBetween('appointment_date', [$dayStart, $dayEnd])
            ->whereNotIn('status', ['cancelled'])
            ->when($excludeAppointmentId, fn ($q) => $q->where('id', '!=', $excludeAppointmentId))
            ->count();

        if ($sameDayCount >= $availability->max_patients) {
            return [
                'available' => false,
                'message' => sprintf(
                    'Maximum %d patient(s) allowed on %s for this doctor.',
                    $availability->max_patients,
                    $availability->day_label
                ),
            ];
        }

        $candidates = Appointment::where('doctor_id', $doctor->id)
            ->whereNotIn('status', ['cancelled'])
            ->when($excludeAppointmentId, fn ($q) => $q->where('id', '!=', $excludeAppointmentId))
            ->get(['appointment_date', 'duration_minutes']);

        $overlap = $candidates->contains(function (Appointment $apt) use ($appointmentAt, $slotEnd) {
            $aptStart = Carbon::parse($apt->appointment_date);
            $aptEnd = $aptStart->copy()->addMinutes((int) ($apt->duration_minutes ?: 30));

            return $appointmentAt->lt($aptEnd) && $slotEnd->gt($aptStart);
        });

        if ($overlap) {
            return [
                'available' => false,
                'message' => 'Doctor already has an appointment in this time slot.',
            ];
        }

        return [
            'available' => true,
            'message' => 'Doctor is available at this time.',
            'availability' => [
                'start_time' => substr((string) $availability->start_time, 0, 5),
                'end_time' => substr((string) $availability->end_time, 0, 5),
                'slot_duration' => $availability->slot_duration,
                'max_patients' => $availability->max_patients,
            ],
        ];
    }

    public function seedDefaultWeek(Doctor $doctor): void
    {
        $defaults = [];
        foreach ([1, 2, 3, 4, 5] as $dow) {
            $defaults[] = [
                'day_of_week' => $dow,
                'start_time' => '09:00',
                'end_time' => '17:00',
                'slot_duration' => 30,
                'max_patients' => 10,
                'is_active' => true,
            ];
        }

        $this->syncSchedule($doctor, $defaults);
    }
}
