<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Concerns\HandlesTenancy;
use App\Http\Controllers\Controller;
use App\Models\Department;
use App\Models\Doctor;
use App\Models\User;
use App\Services\DoctorAvailabilityService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class DoctorController extends Controller
{
    use HandlesTenancy;

    public function index(Request $request): JsonResponse
    {
        $query = Doctor::with(['user', 'department', 'company'])->orderByDesc('created_at');

        if ($doctorId = $this->doctorIdForUser()) {
            $query->where('id', $doctorId);
        }

        if (auth()->user()->isSuperAdmin() && $request->filled('company_id')) {
            $query->where('company_id', (int) $request->company_id);
        }

        return response()->json($query->get());
    }

    public function store(Request $request): JsonResponse
    {
        if ($this->doctorIdForUser()) {
            abort(403, 'Doctors cannot create doctor records.');
        }

        $companyId = $this->resolveCompanyId($request);
        $validated = $request->validate($this->rules(null, $companyId));

        $this->assertDepartmentInCompany($validated['department_id'], $companyId);

        $doctor = DB::transaction(function () use ($validated, $request, $companyId) {
            $user = User::create([
                'name' => $validated['name'],
                'email' => $validated['email'],
                'password' => $validated['password'],
                'phone' => $validated['phone'] ?? null,
                'role' => User::ROLE_DOCTOR,
                'company_id' => $companyId,
                'status' => $request->boolean('status', true),
            ]);

            $created = Doctor::create([
                'company_id' => $companyId,
                'user_id' => $user->id,
                'department_id' => $validated['department_id'],
                'doctor_code' => $validated['doctor_code'] ?? $this->nextDoctorCode($companyId),
                'qualification' => $validated['qualification'] ?? null,
                'experience_years' => $validated['experience_years'] ?? null,
                'license_number' => $validated['license_number'] ?? null,
                'consultation_fee' => $validated['consultation_fee'] ?? null,
                'bio' => $validated['bio'] ?? null,
            ]);

            app(DoctorAvailabilityService::class)->seedDefaultWeek($created);

            return $created->load(['user', 'department', 'company']);
        });

        return response()->json($doctor, 201);
    }

    public function show(string $id): JsonResponse
    {
        $doctor = Doctor::with(['user', 'department', 'company'])->findOrFail($id);
        $this->assertTenantAccess($doctor);

        if ($doctorId = $this->doctorIdForUser()) {
            abort_unless((int) $doctor->id === $doctorId, 403);
        }

        return response()->json($doctor);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $doctor = Doctor::with('user')->findOrFail($id);
        $this->assertTenantAccess($doctor);

        if ($doctorId = $this->doctorIdForUser()) {
            abort_unless((int) $doctor->id === $doctorId, 403);
        }

        $validated = $request->validate($this->rules($doctor, $doctor->company_id));
        $this->assertDepartmentInCompany($validated['department_id'], $doctor->company_id);

        DB::transaction(function () use ($doctor, $validated, $request) {
            $userData = [
                'name' => $validated['name'],
                'email' => $validated['email'],
                'phone' => $validated['phone'] ?? null,
                'status' => $request->boolean('status', true),
            ];

            if (! empty($validated['password'])) {
                $userData['password'] = $validated['password'];
            }

            $doctor->user->update($userData);

            $doctor->update([
                'department_id' => $validated['department_id'],
                'doctor_code' => $validated['doctor_code'],
                'qualification' => $validated['qualification'] ?? null,
                'experience_years' => $validated['experience_years'] ?? null,
                'license_number' => $validated['license_number'] ?? null,
                'consultation_fee' => $validated['consultation_fee'] ?? null,
                'bio' => $validated['bio'] ?? null,
            ]);
        });

        return response()->json($doctor->fresh(['user', 'department', 'company']));
    }

    public function destroy(string $id): JsonResponse
    {
        if ($this->doctorIdForUser()) {
            abort(403, 'Doctors cannot delete doctor records.');
        }

        $doctor = Doctor::with('user')->findOrFail($id);
        $this->assertTenantAccess($doctor);

        DB::transaction(function () use ($doctor) {
            $doctor->delete();
            $doctor->user?->delete();
        });

        return response()->json(['message' => 'Doctor deleted successfully']);
    }

    private function assertDepartmentInCompany(int $departmentId, int $companyId): void
    {
        $exists = Department::where('id', $departmentId)->where('company_id', $companyId)->exists();
        abort_unless($exists, 422, 'Department does not belong to this company.');
    }

    private function rules(?Doctor $doctor = null, ?int $companyId = null): array
    {
        $userId = $doctor?->user_id;
        $doctorId = $doctor?->id;
        $companyId ??= $doctor?->company_id ?? auth()->user()?->company_id;

        return [
            'company_id' => auth()->user()->isSuperAdmin()
                ? ['required', 'exists:companies,id']
                : ['prohibited'],
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', Rule::unique('users', 'email')->ignore($userId)],
            'password' => [$doctor ? 'nullable' : 'required', 'string', 'min:8'],
            'phone' => ['nullable', 'string', 'max:20', Rule::unique('users', 'phone')->ignore($userId)],
            'status' => ['boolean'],
            'department_id' => ['required', 'exists:departments,id'],
            'doctor_code' => [
                $doctor ? 'required' : 'nullable',
                'string',
                'max:50',
                Rule::unique('doctors', 'doctor_code')->where('company_id', $companyId)->ignore($doctorId),
            ],
            'qualification' => ['nullable', 'string', 'max:255'],
            'experience_years' => ['nullable', 'integer', 'min:0'],
            'license_number' => [
                'nullable',
                'string',
                'max:100',
                Rule::unique('doctors', 'license_number')->ignore($doctorId),
            ],
            'consultation_fee' => ['nullable', 'numeric', 'min:0'],
            'bio' => ['nullable', 'string'],
        ];
    }

    private function nextDoctorCode(int $companyId): string
    {
        $num = Doctor::withTrashed()->where('company_id', $companyId)->count() + 1;

        return 'DOC-'.str_pad((string) $num, 5, '0', STR_PAD_LEFT);
    }
}
