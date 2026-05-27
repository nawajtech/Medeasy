<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Concerns\HandlesTenancy;
use App\Http\Controllers\Controller;
use App\Models\Billing;
use App\Models\Patient;
use App\Models\Setting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\View\View;

class BillingController extends Controller
{
    use HandlesTenancy;

    private const STATUSES = ['pending', 'partial', 'paid', 'overdue', 'cancelled'];

    public function index(Request $request): JsonResponse
    {
        $query = Billing::with(['patient', 'appointment.doctor.user', 'appointment.doctor.department'])
            ->orderByDesc('billed_at');

        if ($doctorId = $this->doctorIdForUser()) {
            $query->whereHas('appointment', fn ($q) => $q->where('doctor_id', $doctorId));
        }

        if (auth()->user()->isSuperAdmin() && $request->filled('company_id')) {
            $query->where('company_id', (int) $request->company_id);
        }

        return response()->json($query->get());
    }

    public function patientBalance(int $patientId): JsonResponse
    {
        $patient = Patient::findOrFail($patientId);
        $this->assertTenantAccess($patient);

        if ($doctorId = $this->doctorIdForUser()) {
            $hasAccess = $patient->appointments()->where('doctor_id', $doctorId)->exists();
            abort_unless($hasAccess, 403);
        }

        return response()->json([
            'patient_id' => $patientId,
            'previous_due' => Billing::outstandingForPatient($patientId),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        if ($this->doctorIdForUser()) {
            abort(403, 'Doctors cannot create billing records.');
        }

        $validated = $request->validate($this->rules());
        $patient = Patient::findOrFail($validated['patient_id']);
        $this->assertTenantAccess($patient);

        $billing = Billing::create($this->buildBillingData($validated, null, $patient->company_id));

        return response()->json(
            $billing->load(['patient', 'appointment']),
            201
        );
    }

    public function show(string $id): JsonResponse
    {
        $billing = Billing::with(['patient', 'appointment.doctor.user', 'appointment.doctor.department'])->findOrFail($id);
        $this->assertTenantAccess($billing);

        return response()->json($billing);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        if ($this->doctorIdForUser()) {
            abort(403, 'Doctors cannot update billing records.');
        }

        $billing = Billing::findOrFail($id);
        $this->assertTenantAccess($billing);
        $validated = $request->validate($this->rules($billing->id, $billing->patient_id));
        $billing->update($this->buildBillingData($validated, $billing, $billing->company_id));

        return response()->json($billing->fresh(['patient', 'appointment']));
    }

    public function destroy(string $id): JsonResponse
    {
        if ($this->doctorIdForUser()) {
            abort(403, 'Doctors cannot delete billing records.');
        }

        $billing = Billing::findOrFail($id);
        $this->assertTenantAccess($billing);
        $billing->delete();

        return response()->json(['message' => 'Billing record deleted successfully']);
    }

    public function invoice(string $id): View
    {
        $billing = Billing::with(['patient', 'appointment.doctor.user', 'company'])->findOrFail($id);
        $this->assertTenantAccess($billing);

        $clinicName = Setting::where('company_id', $billing->company_id)
            ->where('key', 'clinic_name')
            ->value('value') ?? $billing->company?->name ?? 'MedEasy Clinic';

        return view('documents.invoice', [
            'billing' => $billing,
            'appointment' => $billing->appointment,
            'clinicName' => $clinicName,
        ]);
    }

    public static function syncForAppointment(
        int $appointmentId,
        int $patientId,
        int $companyId,
        array $data,
        ?Billing $existing = null
    ): Billing {
        $payload = array_merge($data, [
            'patient_id' => $patientId,
            'appointment_id' => $appointmentId,
            'company_id' => $companyId,
            'billed_at' => $data['billed_at'] ?? now()->toDateString(),
        ]);

        $controller = new self;
        $built = $controller->buildBillingData($payload, $existing, $companyId);

        if ($existing) {
            $existing->update($built);

            return $existing->fresh();
        }

        return Billing::create($built);
    }

    private function buildBillingData(array $validated, ?Billing $existing = null, ?int $companyId = null): array
    {
        $patientId = (int) $validated['patient_id'];
        if (array_key_exists('previous_due', $validated)) {
            $previousDue = (float) $validated['previous_due'];
        } elseif ($existing) {
            $previousDue = (float) $existing->previous_due;
        } else {
            $previousDue = Billing::outstandingForPatient($patientId);
        }

        $totals = Billing::computeTotals(
            $previousDue,
            (float) $validated['charge_amount'],
            (float) ($validated['paid_amount'] ?? 0)
        );

        $paidAt = $validated['paid_at'] ?? null;
        if ($totals['due_amount'] <= 0 && ! $paidAt) {
            $paidAt = now()->toDateString();
        }

        $companyId ??= $existing?->company_id ?? Patient::find($patientId)?->company_id;

        return [
            'company_id' => $companyId,
            'patient_id' => $patientId,
            'appointment_id' => $validated['appointment_id'] ?? $existing?->appointment_id,
            'invoice_number' => $validated['invoice_number']
                ?? $existing?->invoice_number
                ?? $this->nextInvoiceNumber($companyId),
            'previous_due' => $totals['previous_due'],
            'charge_amount' => $totals['charge_amount'],
            'paid_amount' => $totals['paid_amount'],
            'total_amount' => $totals['total_amount'],
            'due_amount' => $totals['due_amount'],
            'status' => $validated['status'] ?? $totals['status'],
            'payment_method' => $validated['payment_method'] ?? null,
            'billed_at' => $validated['billed_at'] ?? now()->toDateString(),
            'paid_at' => $paidAt,
            'notes' => $validated['notes'] ?? null,
        ];
    }

    private function rules(?int $billingId = null, ?int $patientId = null): array
    {
        return [
            'patient_id' => ['required', 'exists:patients,id'],
            'appointment_id' => ['nullable', 'exists:appointments,id'],
            'invoice_number' => [
                'nullable',
                'string',
                'max:50',
                Rule::unique('billings', 'invoice_number')->ignore($billingId),
            ],
            'previous_due' => ['nullable', 'numeric', 'min:0'],
            'charge_amount' => ['required', 'numeric', 'min:0'],
            'paid_amount' => ['required', 'numeric', 'min:0'],
            'status' => ['nullable', Rule::in(self::STATUSES)],
            'payment_method' => ['nullable', 'string', 'max:50'],
            'billed_at' => ['nullable', 'date'],
            'paid_at' => ['nullable', 'date'],
            'notes' => ['nullable', 'string'],
        ];
    }

    private function nextInvoiceNumber(?int $companyId): string
    {
        $query = Billing::withTrashed();
        if ($companyId) {
            $query->where('company_id', $companyId);
        }
        $num = $query->count() + 1;

        return 'INV-'.str_pad((string) $num, 5, '0', STR_PAD_LEFT);
    }
}
