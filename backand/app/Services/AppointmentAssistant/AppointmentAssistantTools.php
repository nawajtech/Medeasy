<?php

namespace App\Services\AppointmentAssistant;

use App\Models\Branch;
use App\Models\Company;
use App\Models\DiagnosticOrder;
use App\Models\DiagnosticPackage;
use App\Models\DiagnosticTestType;
use App\Models\Doctor;
use App\Models\DoctorAvailability;
use App\Models\Patient;
use App\Models\ReferralPartner;
use App\Services\DiagnosticOrderBillingService;
use App\Services\DiagnosticPaymentService;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class AppointmentAssistantTools
{
    public function __construct(
        private DiagnosticOrderBillingService $billing,
        private DiagnosticPaymentService $paymentService,
    ) {}

    /** OpenAI-style tool defs (kept for reference / future dual-provider use). */
    public function definitions(): array
    {
        return [
            [
                'type' => 'function',
                'function' => [
                    'name' => 'findPatient',
                    'description' => 'Find or confirm the logged-in patient. Optionally verify by phone number.',
                    'parameters' => [
                        'type' => 'object',
                        'properties' => [
                            'phone' => [
                                'type' => 'string',
                                'description' => 'Patient phone number to verify or look up',
                            ],
                        ],
                    ],
                ],
            ],
            [
                'type' => 'function',
                'function' => [
                    'name' => 'checkServiceAvailability',
                    'description' => 'Check whether a diagnostic service/test (e.g. USG, CBC, X-Ray, ECG) is available. Optionally limit to a centre.',
                    'parameters' => [
                        'type' => 'object',
                        'properties' => [
                            'service' => [
                                'type' => 'string',
                                'description' => 'Service or test name, code, or modality',
                            ],
                            'company_id' => [
                                'type' => 'integer',
                                'description' => 'Optional diagnostic centre id',
                            ],
                        ],
                        'required' => ['service'],
                    ],
                ],
            ],
            [
                'type' => 'function',
                'function' => [
                    'name' => 'checkDoctorAvailability',
                    'description' => 'Check which doctors (or centres) are available for a service on a date/time range. Never invent availability.',
                    'parameters' => [
                        'type' => 'object',
                        'properties' => [
                            'service' => ['type' => 'string'],
                            'date' => [
                                'type' => 'string',
                                'description' => 'YYYY-MM-DD or relative like tomorrow',
                            ],
                            'time_from' => [
                                'type' => 'string',
                                'description' => 'HH:mm start of preferred window',
                            ],
                            'time_to' => [
                                'type' => 'string',
                                'description' => 'HH:mm end of preferred window',
                            ],
                            'company_id' => ['type' => 'integer'],
                            'test_type_id' => ['type' => 'integer'],
                        ],
                        'required' => ['date'],
                    ],
                ],
            ],
            [
                'type' => 'function',
                'function' => [
                    'name' => 'getAvailableSlots',
                    'description' => 'Return real available appointment slots for a centre/service/date. Never invent slots.',
                    'parameters' => [
                        'type' => 'object',
                        'properties' => [
                            'company_id' => ['type' => 'integer'],
                            'date' => ['type' => 'string'],
                            'time_from' => ['type' => 'string'],
                            'time_to' => ['type' => 'string'],
                            'doctor_id' => ['type' => 'integer'],
                            'test_type_id' => ['type' => 'integer'],
                        ],
                        'required' => ['company_id', 'date'],
                    ],
                ],
            ],
            [
                'type' => 'function',
                'function' => [
                    'name' => 'bookAppointment',
                    'description' => 'Create the appointment after patient, service, date, and slot are confirmed. Only report success if this returns success=true.',
                    'parameters' => [
                        'type' => 'object',
                        'properties' => [
                            'company_id' => ['type' => 'integer'],
                            'test_type_id' => ['type' => 'integer'],
                            'package_id' => ['type' => 'integer'],
                            'scheduled_at' => [
                                'type' => 'string',
                                'description' => 'Exact slot datetime from getAvailableSlots (ISO or Y-m-d H:i:s)',
                            ],
                            'doctor_id' => ['type' => 'integer'],
                            'branch_id' => ['type' => 'integer'],
                            'notes' => ['type' => 'string'],
                            'payment_option' => [
                                'type' => 'string',
                                'enum' => ['pay_on_visit', 'online'],
                            ],
                            'online_method' => [
                                'type' => 'string',
                                'enum' => ['upi', 'card'],
                            ],
                            'referral_code' => ['type' => 'string'],
                        ],
                        'required' => ['company_id', 'scheduled_at'],
                    ],
                ],
            ],
            [
                'type' => 'function',
                'function' => [
                    'name' => 'getAppointmentDetails',
                    'description' => 'Get details of an existing appointment (diagnostic order) for the logged-in patient.',
                    'parameters' => [
                        'type' => 'object',
                        'properties' => [
                            'appointment_id' => [
                                'type' => 'integer',
                                'description' => 'Diagnostic order / appointment id',
                            ],
                        ],
                        'required' => ['appointment_id'],
                    ],
                ],
            ],
            [
                'type' => 'function',
                'function' => [
                    'name' => 'cancelAppointment',
                    'description' => 'Cancel an existing appointment after the patient confirms.',
                    'parameters' => [
                        'type' => 'object',
                        'properties' => [
                            'appointment_id' => ['type' => 'integer'],
                            'confirmed' => [
                                'type' => 'boolean',
                                'description' => 'Must be true after patient confirms cancellation',
                            ],
                        ],
                        'required' => ['appointment_id', 'confirmed'],
                    ],
                ],
            ],
        ];
    }

    /** Gemini functionDeclarations converted from OpenAI-style defs. */
    public function geminiDeclarations(): array
    {
        return array_map(function (array $tool) {
            $fn = $tool['function'];

            return [
                'name' => $fn['name'],
                'description' => $fn['description'],
                'parameters' => $this->toGeminiSchema($fn['parameters'] ?? ['type' => 'object', 'properties' => (object) []]),
            ];
        }, $this->definitions());
    }

    /** @param array<string, mixed> $schema */
    private function toGeminiSchema(array $schema): array
    {
        $type = strtoupper((string) ($schema['type'] ?? 'OBJECT'));
        $out = ['type' => $type === 'OBJECT' || $type === 'ARRAY' || $type === 'STRING' || $type === 'NUMBER' || $type === 'INTEGER' || $type === 'BOOLEAN' ? $type : 'OBJECT'];

        if (isset($schema['description'])) {
            $out['description'] = $schema['description'];
        }

        if (isset($schema['enum']) && is_array($schema['enum'])) {
            $out['enum'] = array_values($schema['enum']);
        }

        if (($schema['type'] ?? '') === 'object' || $type === 'OBJECT') {
            $properties = [];
            foreach ($schema['properties'] ?? [] as $key => $prop) {
                $properties[$key] = $this->toGeminiSchema(is_array($prop) ? $prop : ['type' => 'string']);
            }
            $out['properties'] = $properties === [] ? (object) [] : $properties;
            if (! empty($schema['required']) && is_array($schema['required'])) {
                $out['required'] = array_values($schema['required']);
            }
        }

        return $out;
    }

    /** @param array<string, mixed> $arguments */
    public function call(string $name, array $arguments, Patient $patient): array
    {
        return match ($name) {
            'findPatient' => $this->findPatient($patient, $arguments),
            'checkServiceAvailability' => $this->checkServiceAvailability($arguments),
            'checkDoctorAvailability' => $this->checkDoctorAvailability($arguments),
            'getAvailableSlots' => $this->getAvailableSlots($arguments),
            'bookAppointment' => $this->bookAppointment($patient, $arguments),
            'getAppointmentDetails' => $this->getAppointmentDetails($patient, $arguments),
            'cancelAppointment' => $this->cancelAppointment($patient, $arguments),
            default => ['success' => false, 'error' => "Unknown tool: {$name}"],
        };
    }

    /** @param array<string, mixed> $args */
    private function findPatient(Patient $patient, array $args): array
    {
        $phone = $this->normalizePhone((string) ($args['phone'] ?? ''));

        if ($phone !== '') {
            $patientPhone = $this->normalizePhone((string) $patient->phone);
            if ($patientPhone !== '' && $patientPhone !== $phone) {
                $other = Patient::query()
                    ->whereRaw("REPLACE(REPLACE(REPLACE(phone, ' ', ''), '-', ''), '+', '') LIKE ?", ['%'.$phone])
                    ->first();

                if (! $other) {
                    return [
                        'success' => false,
                        'found' => false,
                        'message' => 'No patient found with that phone. Booking will use the logged-in account. Ask for name only if creating a new profile is needed outside this chat.',
                        'logged_in_patient' => $this->patientPayload($patient),
                    ];
                }

                return [
                    'success' => true,
                    'found' => true,
                    'matches_logged_in' => false,
                    'message' => 'A different patient record matched that phone. Bookings in this chat can only be created for the logged-in patient.',
                    'matched_patient' => $this->patientPayload($other),
                    'logged_in_patient' => $this->patientPayload($patient),
                ];
            }
        }

        return [
            'success' => true,
            'found' => true,
            'matches_logged_in' => true,
            'patient' => $this->patientPayload($patient),
        ];
    }

    /** @param array<string, mixed> $args */
    private function checkServiceAvailability(array $args): array
    {
        $service = trim((string) ($args['service'] ?? ''));
        if ($service === '') {
            return ['success' => false, 'available' => false, 'error' => 'service is required'];
        }

        $companyId = isset($args['company_id']) ? (int) $args['company_id'] : null;
        $matches = $this->findServices($service, $companyId);

        if ($matches->isEmpty()) {
            return [
                'success' => true,
                'available' => false,
                'service' => $service,
                'message' => "{$service} is not available".($companyId ? ' at this centre' : '').'.',
                'matches' => [],
            ];
        }

        return [
            'success' => true,
            'available' => true,
            'service' => $service,
            'matches' => $matches->values()->all(),
            'message' => $matches->count().' matching service(s) found.',
        ];
    }

    /** @param array<string, mixed> $args */
    private function checkDoctorAvailability(array $args): array
    {
        $date = $this->resolveDate((string) ($args['date'] ?? ''));
        if (! $date) {
            return ['success' => false, 'error' => 'Could not understand date. Use YYYY-MM-DD or tomorrow.'];
        }

        $service = trim((string) ($args['service'] ?? ''));
        $companyId = isset($args['company_id']) ? (int) $args['company_id'] : null;
        $testTypeId = isset($args['test_type_id']) ? (int) $args['test_type_id'] : null;
        $timeFrom = $this->normalizeClock($args['time_from'] ?? null);
        $timeTo = $this->normalizeClock($args['time_to'] ?? null);

        $tests = collect();
        if ($testTypeId) {
            $test = DiagnosticTestType::withoutGlobalScopes()
                ->with(['doctors.user', 'company:id,name'])
                ->where('is_active', true)
                ->find($testTypeId);
            if ($test) {
                $tests = collect([$test]);
            }
        } elseif ($service !== '') {
            $tests = DiagnosticTestType::withoutGlobalScopes()
                ->with(['doctors.user', 'company:id,name'])
                ->where('is_active', true)
                ->when($companyId, fn ($q) => $q->where('company_id', $companyId))
                ->where(function ($q) use ($service) {
                    $term = '%'.mb_strtolower($service).'%';
                    $q->whereRaw('LOWER(name) LIKE ?', [$term])
                        ->orWhereRaw('LOWER(COALESCE(code, "")) LIKE ?', [$term])
                        ->orWhereRaw('LOWER(COALESCE(modality, "")) LIKE ?', [$term]);
                })
                ->limit(20)
                ->get();
        }

        $doctors = [];
        $centresWithoutDoctors = [];

        foreach ($tests as $test) {
            $linked = $test->doctors;
            if ($linked->isEmpty()) {
                $centresWithoutDoctors[] = [
                    'company_id' => $test->company_id,
                    'company_name' => $test->company?->name,
                    'test_type_id' => $test->id,
                    'test_name' => $test->name,
                    'note' => 'No specific doctor assigned; centre slots can be used.',
                ];
                continue;
            }

            foreach ($linked as $doctor) {
                if ($companyId && (int) $doctor->company_id !== $companyId) {
                    continue;
                }

                $window = $this->doctorWindowOnDate($doctor, $date);
                if (! $window['available']) {
                    continue;
                }

                if ($timeFrom && $timeTo && ! $this->windowsOverlap(
                    $window['start_time'],
                    $window['end_time'],
                    $timeFrom,
                    $timeTo
                )) {
                    continue;
                }

                $doctors[] = [
                    'doctor_id' => $doctor->id,
                    'doctor_name' => $doctor->user?->name ?? ('Doctor #'.$doctor->id),
                    'company_id' => $doctor->company_id,
                    'company_name' => $test->company?->name,
                    'test_type_id' => $test->id,
                    'test_name' => $test->name,
                    'available_from' => $window['start_time'],
                    'available_to' => $window['end_time'],
                    'slot_duration' => $window['slot_duration'],
                ];
            }
        }

        $uniqueDoctors = collect($doctors)->unique('doctor_id')->values()->all();

        return [
            'success' => true,
            'date' => $date->toDateString(),
            'time_from' => $timeFrom,
            'time_to' => $timeTo,
            'doctors' => $uniqueDoctors,
            'centres_without_assigned_doctor' => $centresWithoutDoctors,
            'available' => count($uniqueDoctors) > 0 || count($centresWithoutDoctors) > 0,
            'message' => count($uniqueDoctors) > 0
                ? count($uniqueDoctors).' doctor(s) available.'
                : (count($centresWithoutDoctors) > 0
                    ? 'Service is offered; use centre slots (no doctor assignment required).'
                    : 'No doctors available for the requested window.'),
        ];
    }

    /** @param array<string, mixed> $args */
    private function getAvailableSlots(array $args): array
    {
        $companyId = (int) ($args['company_id'] ?? 0);
        $date = $this->resolveDate((string) ($args['date'] ?? ''));
        if (! $companyId || ! $date) {
            return ['success' => false, 'error' => 'company_id and date are required'];
        }

        try {
            $this->resolveCentre($companyId);
        } catch (\Throwable $e) {
            return ['success' => false, 'error' => 'Diagnostic centre not found.'];
        }

        if ($date->isSunday()) {
            return [
                'success' => true,
                'date' => $date->toDateString(),
                'slots' => [],
                'message' => 'No slots available on Sundays.',
            ];
        }

        $timeFrom = $this->normalizeClock($args['time_from'] ?? null);
        $timeTo = $this->normalizeClock($args['time_to'] ?? null);
        $doctorId = isset($args['doctor_id']) ? (int) $args['doctor_id'] : null;

        $doctorWindow = null;
        if ($doctorId) {
            $doctor = Doctor::with('user')->find($doctorId);
            if (! $doctor) {
                return ['success' => false, 'error' => 'Doctor not found.'];
            }
            $doctorWindow = $this->doctorWindowOnDate($doctor, $date);
            if (! $doctorWindow['available']) {
                return [
                    'success' => true,
                    'date' => $date->toDateString(),
                    'doctor_id' => $doctorId,
                    'slots' => [],
                    'message' => $doctorWindow['message'] ?? 'Doctor not available on this date.',
                ];
            }
        }

        $startHour = 9;
        $endHour = 17;
        $intervalMinutes = 30;
        $now = now(config('app.timezone'));

        $booked = DiagnosticOrder::withoutGlobalScopes()
            ->where('company_id', $companyId)
            ->whereNotIn('status', ['cancelled'])
            ->whereDate('scheduled_at', $date->toDateString())
            ->pluck('scheduled_at')
            ->map(fn ($dt) => Carbon::parse($dt)->format('H:i'))
            ->countBy();

        $slots = [];
        for ($minutes = $startHour * 60; $minutes < $endHour * 60; $minutes += $intervalMinutes) {
            $slot = $date->copy()->addMinutes($minutes);
            if ($slot->lte($now)) {
                continue;
            }

            $key = $slot->format('H:i');

            if ($timeFrom && $key < $timeFrom) {
                continue;
            }
            if ($timeTo && $key >= $timeTo) {
                continue;
            }

            if ($doctorWindow) {
                if ($key < $doctorWindow['start_time'] || $key >= $doctorWindow['end_time']) {
                    continue;
                }
            }

            $count = (int) ($booked[$key] ?? 0);
            $capacity = 8;
            if ($count >= $capacity) {
                continue;
            }

            $slots[] = [
                'time' => $key,
                'datetime' => $slot->format('Y-m-d H:i:s'),
                'datetime_iso' => $slot->toIso8601String(),
                'available' => true,
                'remaining' => $capacity - $count,
                'doctor_id' => $doctorId,
            ];
        }

        return [
            'success' => true,
            'date' => $date->toDateString(),
            'company_id' => $companyId,
            'doctor_id' => $doctorId,
            'slots' => $slots,
            'message' => count($slots) ? count($slots).' slot(s) available.' : 'No slots available for that window.',
        ];
    }

    /** @param array<string, mixed> $args */
    private function bookAppointment(Patient $patient, array $args): array
    {
        $companyId = (int) ($args['company_id'] ?? 0);
        $scheduledRaw = (string) ($args['scheduled_at'] ?? '');
        $testTypeId = isset($args['test_type_id']) ? (int) $args['test_type_id'] : null;
        $packageId = isset($args['package_id']) ? (int) $args['package_id'] : null;

        if (! $companyId || $scheduledRaw === '') {
            return ['success' => false, 'error' => 'company_id and scheduled_at are required'];
        }
        if (! $testTypeId && ! $packageId) {
            return ['success' => false, 'error' => 'test_type_id or package_id is required'];
        }

        try {
            $company = $this->resolveCentre($companyId);
        } catch (\Throwable $e) {
            return ['success' => false, 'error' => 'Diagnostic centre not found.'];
        }

        $scheduledAt = Carbon::parse($scheduledRaw, config('app.timezone'));
        if ($scheduledAt->lte(now(config('app.timezone')))) {
            return ['success' => false, 'error' => 'scheduled_at must be in the future'];
        }

        // Re-check slot capacity before booking
        $slotCheck = $this->getAvailableSlots([
            'company_id' => $companyId,
            'date' => $scheduledAt->toDateString(),
            'doctor_id' => $args['doctor_id'] ?? null,
        ]);
        $stillOpen = collect($slotCheck['slots'] ?? [])->contains(function ($s) use ($scheduledAt) {
            return ($s['time'] ?? null) === $scheduledAt->format('H:i');
        });
        if (! $stillOpen) {
            return [
                'success' => false,
                'error' => 'Selected slot is no longer available. Call getAvailableSlots again.',
            ];
        }

        if (! empty($args['branch_id'])) {
            $branchOk = Branch::withoutGlobalScopes()
                ->where('id', (int) $args['branch_id'])
                ->where('company_id', $company->id)
                ->exists();
            if (! $branchOk) {
                return ['success' => false, 'error' => 'Invalid branch for this centre.'];
            }
        }

        $partner = null;
        if (filled($args['referral_code'] ?? null)) {
            $partner = ReferralPartner::withoutGlobalScopes()
                ->where('company_id', $company->id)
                ->whereRaw('UPPER(referral_code) = ?', [strtoupper(trim((string) $args['referral_code']))])
                ->first();
            if (! $partner) {
                return ['success' => false, 'error' => 'Referral doctor code not found for this centre.'];
            }
        }

        $paymentOption = in_array(($args['payment_option'] ?? 'pay_on_visit'), ['pay_on_visit', 'online'], true)
            ? ($args['payment_option'] ?? 'pay_on_visit')
            : 'pay_on_visit';
        $doctorId = isset($args['doctor_id']) ? (int) $args['doctor_id'] : null;

        if ($patient->company_id === null) {
            $patient->update(['company_id' => $company->id]);
            app(\App\Services\PatientWalletService::class)->ensureWallet($patient->fresh());
        }

        try {
            $orders = DB::transaction(function () use (
                $args,
                $patient,
                $company,
                $partner,
                $scheduledAt,
                $testTypeId,
                $packageId,
                $paymentOption,
                $doctorId
            ) {
                $created = [];
                $data = [
                    'branch_id' => $args['branch_id'] ?? null,
                    'notes' => $args['notes'] ?? null,
                    'payment_option' => $paymentOption,
                    'online_method' => $args['online_method'] ?? 'upi',
                    'doctor_id' => $doctorId,
                ];

                if ($packageId) {
                    $package = DiagnosticPackage::withoutGlobalScopes()
                        ->where('company_id', $company->id)
                        ->findOrFail($packageId);
                    if (! $package->is_active) {
                        throw new \RuntimeException('This diagnostic package is not active.');
                    }
                    $tests = DiagnosticTestType::withoutGlobalScopes()
                        ->where('company_id', $company->id)
                        ->whereIn('id', array_values(array_filter($package->test_ids ?? [])))
                        ->orderBy('name')
                        ->get();
                    if ($tests->isEmpty()) {
                        throw new \RuntimeException('Package has no tests configured.');
                    }
                    foreach ($tests as $testType) {
                        $created[] = $this->createOrderLine($patient, $company, $testType, $package, $partner, $scheduledAt, $data);
                    }

                    return $created;
                }

                $testType = DiagnosticTestType::withoutGlobalScopes()
                    ->where('company_id', $company->id)
                    ->where('is_active', true)
                    ->findOrFail($testTypeId);
                $created[] = $this->createOrderLine($patient, $company, $testType, null, $partner, $scheduledAt, $data);

                return $created;
            });
        } catch (\Throwable $e) {
            return ['success' => false, 'error' => $e->getMessage()];
        }

        $first = $orders[0] ?? null;
        $serviceName = $first?->package?->package_name
            ?? $first?->testType?->name
            ?? 'Appointment';

        return [
            'success' => true,
            'appointment_id' => $first?->id,
            'appointment_ids' => collect($orders)->pluck('id')->all(),
            'service' => $serviceName,
            'company_id' => $company->id,
            'company_name' => $company->name,
            'scheduled_at' => $scheduledAt->format('Y-m-d H:i:s'),
            'doctor_id' => $doctorId,
            'message' => 'Appointment booked successfully.',
        ];
    }

    /** @param array<string, mixed> $args */
    private function getAppointmentDetails(Patient $patient, array $args): array
    {
        $id = (int) ($args['appointment_id'] ?? 0);
        if (! $id) {
            return ['success' => false, 'error' => 'appointment_id is required'];
        }

        $order = DiagnosticOrder::withoutGlobalScopes()
            ->with([
                'testType:id,name,code,modality',
                'package:id,package_name',
                'company:id,name,address,city,phone',
                'branch:id,name',
                'doctor.user:id,name',
            ])
            ->where('patient_id', $patient->id)
            ->find($id);

        if (! $order) {
            return ['success' => false, 'error' => 'Appointment not found.'];
        }

        return [
            'success' => true,
            'appointment' => [
                'appointment_id' => $order->id,
                'status' => $order->status,
                'service' => $order->package?->package_name ?? $order->testType?->name,
                'company_name' => $order->company?->name,
                'scheduled_at' => optional($order->scheduled_at)->format('Y-m-d H:i:s'),
                'doctor_name' => $order->doctor?->user?->name,
                'can_cancel' => in_array($order->status, ['booked', 'scheduled'], true),
            ],
        ];
    }

    /** @param array<string, mixed> $args */
    private function cancelAppointment(Patient $patient, array $args): array
    {
        if (! ($args['confirmed'] ?? false)) {
            return [
                'success' => false,
                'error' => 'Patient confirmation required. Ask the patient to confirm, then call again with confirmed=true.',
            ];
        }

        $id = (int) ($args['appointment_id'] ?? 0);
        $order = DiagnosticOrder::withoutGlobalScopes()
            ->where('patient_id', $patient->id)
            ->find($id);

        if (! $order) {
            return ['success' => false, 'error' => 'Appointment not found.'];
        }
        if ($order->status === 'completed') {
            return ['success' => false, 'error' => 'Completed appointments cannot be cancelled.'];
        }
        if ($order->status === 'cancelled') {
            return ['success' => false, 'error' => 'This appointment is already cancelled.'];
        }
        if (! in_array($order->status, ['booked', 'scheduled'], true)) {
            return ['success' => false, 'error' => 'This appointment can no longer be cancelled.'];
        }

        $order->update(['status' => 'cancelled']);

        return [
            'success' => true,
            'appointment_id' => $order->id,
            'message' => 'Appointment cancelled.',
        ];
    }

    /** @return \Illuminate\Support\Collection<int, array<string, mixed>> */
    private function findServices(string $service, ?int $companyId)
    {
        $term = '%'.mb_strtolower($service).'%';

        $tests = DiagnosticTestType::withoutGlobalScopes()
            ->with('company:id,name,city')
            ->where('is_active', true)
            ->when($companyId, fn ($q) => $q->where('company_id', $companyId))
            ->where(function ($q) use ($term) {
                $q->whereRaw('LOWER(name) LIKE ?', [$term])
                    ->orWhereRaw('LOWER(COALESCE(code, "")) LIKE ?', [$term])
                    ->orWhereRaw('LOWER(COALESCE(modality, "")) LIKE ?', [$term]);
            })
            ->limit(25)
            ->get()
            ->map(fn (DiagnosticTestType $t) => [
                'type' => 'test',
                'test_type_id' => $t->id,
                'name' => $t->name,
                'code' => $t->code,
                'modality' => $t->modality,
                'price' => $t->price,
                'company_id' => $t->company_id,
                'company_name' => $t->company?->name,
                'city' => $t->company?->city,
            ]);

        $packages = DiagnosticPackage::withoutGlobalScopes()
            ->with('company:id,name,city')
            ->where('is_active', true)
            ->when($companyId, fn ($q) => $q->where('company_id', $companyId))
            ->whereRaw('LOWER(package_name) LIKE ?', [$term])
            ->limit(10)
            ->get()
            ->map(fn (DiagnosticPackage $p) => [
                'type' => 'package',
                'package_id' => $p->id,
                'name' => $p->package_name,
                'company_id' => $p->company_id,
                'company_name' => $p->company?->name,
                'city' => $p->company?->city,
            ]);

        return $tests->concat($packages);
    }

    private function doctorWindowOnDate(Doctor $doctor, Carbon $date): array
    {
        $availability = DoctorAvailability::where('doctor_id', $doctor->id)
            ->where('day_of_week', $date->dayOfWeek)
            ->where('is_active', true)
            ->first();

        if (! $availability) {
            return [
                'available' => false,
                'message' => 'Doctor is not available on '.$date->format('l').'.',
            ];
        }

        return [
            'available' => true,
            'start_time' => substr((string) $availability->start_time, 0, 5),
            'end_time' => substr((string) $availability->end_time, 0, 5),
            'slot_duration' => (int) $availability->slot_duration,
        ];
    }

    private function windowsOverlap(string $aStart, string $aEnd, string $bStart, string $bEnd): bool
    {
        return $aStart < $bEnd && $bStart < $aEnd;
    }

    private function resolveDate(string $raw): ?Carbon
    {
        $raw = trim(mb_strtolower($raw));
        if ($raw === '') {
            return null;
        }

        $tz = config('app.timezone');
        $today = Carbon::now($tz)->startOfDay();

        if (in_array($raw, ['today'], true)) {
            return $today;
        }
        if (in_array($raw, ['tomorrow'], true)) {
            return $today->copy()->addDay();
        }
        if (preg_match('/^(\d{4})-(\d{2})-(\d{2})$/', $raw)) {
            return Carbon::parse($raw, $tz)->startOfDay();
        }

        try {
            return Carbon::parse($raw, $tz)->startOfDay();
        } catch (\Throwable) {
            return null;
        }
    }

    private function normalizeClock(mixed $value): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }
        $s = trim((string) $value);
        if (preg_match('/^(\d{1,2}):(\d{2})$/', $s, $m)) {
            return sprintf('%02d:%02d', (int) $m[1], (int) $m[2]);
        }
        if (preg_match('/^(\d{1,2})\s*(am|pm)$/i', $s, $m)) {
            $h = (int) $m[1];
            $ampm = strtolower($m[2]);
            if ($ampm === 'pm' && $h < 12) {
                $h += 12;
            }
            if ($ampm === 'am' && $h === 12) {
                $h = 0;
            }

            return sprintf('%02d:00', $h);
        }

        return null;
    }

    private function normalizePhone(string $phone): string
    {
        return preg_replace('/\D+/', '', $phone) ?? '';
    }

    private function resolveCentre(int $companyId): Company
    {
        $company = Company::query()
            ->where('id', $companyId)
            ->where('is_active', true)
            ->firstOrFail();

        $hasDiagnostics = $company->hasModule(Company::MODULE_DIAGNOSTICS)
            || in_array($company->type, ['diagnostic_center', 'hospital', 'multi'], true);

        abort_unless($hasDiagnostics, 404, 'Diagnostic centre not found.');

        return $company;
    }

    private function patientPayload(Patient $patient): array
    {
        return [
            'id' => $patient->id,
            'name' => $patient->name,
            'phone' => $patient->phone,
            'email' => $patient->email,
        ];
    }

    /** @param array<string, mixed> $data */
    private function createOrderLine(
        Patient $patient,
        Company $company,
        DiagnosticTestType $testType,
        ?DiagnosticPackage $package,
        ?ReferralPartner $partner,
        Carbon $scheduledAt,
        array $data
    ): DiagnosticOrder {
        $originalGross = (float) $testType->price;
        $packageDiscount = $package ? $package->discountForTestPrice($originalGross) : 0;
        $grossForBilling = $package ? $package->discountedPriceForTest($originalGross) : $originalGross;

        $amounts = $this->billing->calculate(
            $grossForBilling,
            (float) ($testType->referral_commission ?? 0),
            $partner,
            false,
            (int) $company->id,
            0,
        );

        $payload = array_merge($amounts, [
            'company_id' => $company->id,
            'branch_id' => $data['branch_id'] ?? null,
            'patient_id' => $patient->id,
            'doctor_id' => $data['doctor_id'] ?? null,
            'test_type_id' => $testType->id,
            'package_id' => $package?->id,
            'package_discount' => $packageDiscount,
            'gross_amount' => $originalGross,
            'order_number' => $this->generateOrderNumber((int) $company->id),
            'status' => 'scheduled',
            'scheduled_at' => $scheduledAt,
            'priority' => 'routine',
            'notes' => $data['notes'] ?? null,
            'doctor_commission_amount' => round((float) ($testType->doctor_commission ?? 0), 2),
            'deduct_commission_from_bill' => false,
        ]);

        if ($partner) {
            $payload['referral_partner_id'] = $partner->id;
            $payload['referral_partner_name'] = $partner->name;
            $payload['referral_partner_mobile'] = $partner->mobile;
            $payload['referral_partner_address'] = $partner->address;
            $payload['referral_partner_type'] = $partner->type;
        }

        $order = DiagnosticOrder::create($payload);

        $paymentOption = $data['payment_option'] ?? 'pay_on_visit';
        if ($paymentOption === 'online') {
            $method = ($data['online_method'] ?? 'upi') === 'card' ? 'card' : 'upi';
            $payable = round((float) ($order->grand_total ?? $order->net_amount ?? 0), 2);
            $reference = 'ONLINE-'.strtoupper(Str::random(8));
            $this->paymentService->applyInitialPayment(
                $order,
                $payable,
                $method,
                $reference,
                'Paid online via patient portal'
            );
        } else {
            $this->paymentService->applyInitialPayment($order, 0, null, null, null);
            $order->update(['payment_method' => 'pay_on_visit']);
        }

        return $order->fresh(['testType', 'package']);
    }

    private function generateOrderNumber(int $companyId): string
    {
        $date = now()->format('Ymd');
        $prefix = "DGN-{$date}-";

        $last = DiagnosticOrder::withoutGlobalScopes()
            ->where('order_number', 'like', $prefix.'%')
            ->where('company_id', $companyId)
            ->orderByDesc('id')
            ->value('order_number');

        $seq = $last ? ((int) substr($last, -4) + 1) : 1;

        return $prefix.str_pad($seq, 4, '0', STR_PAD_LEFT);
    }
}
