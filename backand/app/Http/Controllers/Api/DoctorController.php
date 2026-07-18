<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Concerns\HandlesTenancy;
use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Models\Department;
use App\Models\Doctor;
use App\Models\User;
use App\Services\DoctorAvailabilityService;
use App\Services\UserRoleService;
use App\Support\SpreadsheetIO;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\StreamedResponse;

class DoctorController extends Controller
{
    use HandlesTenancy;

    public function index(Request $request): JsonResponse
    {
        $query = Doctor::with(['user', 'department', 'company', 'branch'])->orderByDesc('created_at');

        if ($doctorId = $this->doctorIdForUser()) {
            $query->where('id', $doctorId);
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

            app(UserRoleService::class)->assignRole($user, User::ROLE_DOCTOR);

            $created = Doctor::create([
                'company_id' => $companyId,
                'branch_id' => $validated['branch_id'] ?? null,
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
                'branch_id' => $validated['branch_id'] ?? null,
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

    public function export(Request $request): StreamedResponse
    {
        if ($this->doctorIdForUser()) {
            abort(403, 'Doctors cannot export doctor records.');
        }

        $query = Doctor::query()
            ->join('users', 'doctors.user_id', '=', 'users.id')
            ->leftJoin('departments', 'doctors.department_id', '=', 'departments.id')
            ->leftJoin('branches', 'doctors.branch_id', '=', 'branches.id')
            ->select([
                'doctors.doctor_code',
                'users.name',
                'users.email',
                'users.phone',
                'users.status as user_status',
                'departments.name as department_name',
                'branches.name as branch_name',
                'doctors.qualification',
                'doctors.experience_years',
                'doctors.license_number',
                'doctors.consultation_fee',
                'doctors.bio',
                'doctors.company_id',
                'doctors.branch_id',
            ])
            ->orderBy('doctors.doctor_code');

        if (auth()->user()->isSuperAdmin() && $request->filled('company_id')) {
            $query->where('doctors.company_id', (int) $request->company_id);
        } elseif (! auth()->user()->isSuperAdmin()) {
            $query->where('doctors.company_id', auth()->user()->company_id);
        }

        if ($request->filled('branch_id')) {
            $query->where('doctors.branch_id', (int) $request->branch_id);
        }

        $headers = [
            'doctor_code',
            'name',
            'email',
            'phone',
            'status',
            'department',
            'branch',
            'qualification',
            'experience_years',
            'license_number',
            'consultation_fee',
            'bio',
        ];

        $filename = 'doctors-'.now()->format('Y-m-d');

        return SpreadsheetIO::exportExcel($filename, $headers, function () use ($query) {
            foreach ($query->cursor() as $doctor) {
                yield [
                    $doctor->doctor_code,
                    $doctor->name,
                    $doctor->email,
                    $doctor->phone,
                    $doctor->user_status ? 'active' : 'inactive',
                    $doctor->department_name,
                    $doctor->branch_name,
                    $doctor->qualification,
                    $doctor->experience_years,
                    $doctor->license_number,
                    $doctor->consultation_fee,
                    $doctor->bio,
                ];
            }
        });
    }

    public function importTemplate(): StreamedResponse
    {
        if ($this->doctorIdForUser()) {
            abort(403, 'Doctors cannot download doctor import templates.');
        }

        $headers = [
            'doctor_code',
            'name',
            'email',
            'phone',
            'password',
            'status',
            'department',
            'branch',
            'qualification',
            'experience_years',
            'license_number',
            'consultation_fee',
            'bio',
        ];

        $sampleRows = [[
            '',
            'Dr. Jane Smith',
            'jane.smith@example.com',
            '9876500001',
            'Password@123',
            'active',
            'General Medicine',
            'Main Branch',
            'MBBS, MD',
            '10',
            'LIC-12345',
            '500',
            'Experienced general physician',
        ]];

        return SpreadsheetIO::exportTemplate('doctor-import-sample', $headers, $sampleRows);
    }

    public function import(Request $request): JsonResponse
    {
        if ($this->doctorIdForUser()) {
            abort(403, 'Doctors cannot import doctor records.');
        }

        $request->validate([
            'file' => ['required', 'file', 'mimes:csv,txt,xls', 'max:2048'],
            'company_id' => $this->companyIdRules(),
        ]);

        $companyId = $this->resolveCompanyId($request);

        try {
            $sheet = SpreadsheetIO::readUploadedFile($request->file('file'));
        } catch (\Throwable $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        $columnMap = SpreadsheetIO::mapHeaders($sheet['headers'], [
            'name' => ['name', 'doctor_name', 'full_name'],
            'email' => ['email', 'email_address'],
            'phone' => ['phone', 'mobile', 'phone_number', 'contact'],
            'password' => ['password', 'pass'],
            'doctor_code' => ['doctor_code', 'code', 'doctor_id'],
            'status' => ['status', 'active'],
            'department' => ['department', 'department_name', 'specialization'],
            'branch' => ['branch', 'branch_name'],
            'qualification' => ['qualification', 'qualifications'],
            'experience_years' => ['experience_years', 'experience'],
            'license_number' => ['license_number', 'license'],
            'consultation_fee' => ['consultation_fee', 'fee'],
            'bio' => ['bio', 'about'],
        ]);

        if (! isset($columnMap['name'], $columnMap['email'], $columnMap['department'])) {
            return response()->json(['message' => 'Spreadsheet must include name, email, and department columns.'], 422);
        }

        $departments = Department::where('company_id', $companyId)->get()->keyBy(fn ($d) => strtolower($d->name));
        $branches = Branch::where('company_id', $companyId)->get()->keyBy(fn ($b) => strtolower($b->name));

        $imported = 0;
        $updated = 0;
        $skipped = 0;
        $errors = [];
        $line = 1;

        foreach ($sheet['rows'] as $row) {
            $line++;

            if (SpreadsheetIO::isEmptyRow($row)) {
                continue;
            }

            $name = SpreadsheetIO::cell($row, $columnMap, 'name');
            $email = SpreadsheetIO::cell($row, $columnMap, 'email');
            $departmentName = SpreadsheetIO::cell($row, $columnMap, 'department');

            if ($name === '' || $email === '' || $departmentName === '') {
                $skipped++;
                if (count($errors) < 20) {
                    $errors[] = "Line {$line}: name, email, and department are required.";
                }
                continue;
            }

            $department = $departments->get(strtolower($departmentName));
            if (! $department) {
                $skipped++;
                if (count($errors) < 20) {
                    $errors[] = "Line {$line}: department \"{$departmentName}\" not found.";
                }
                continue;
            }

            $branchName = SpreadsheetIO::cell($row, $columnMap, 'branch');
            $branchId = null;
            if ($branchName !== '') {
                $branch = $branches->get(strtolower($branchName));
                if (! $branch) {
                    $skipped++;
                    if (count($errors) < 20) {
                        $errors[] = "Line {$line}: branch \"{$branchName}\" not found.";
                    }
                    continue;
                }
                $branchId = $branch->id;
            }

            $existingDoctor = Doctor::with('user')
                ->where('company_id', $companyId)
                ->whereHas('user', fn ($q) => $q->where('email', $email))
                ->first();

            $password = SpreadsheetIO::cell($row, $columnMap, 'password');
            if (! $existingDoctor && $password === '') {
                $password = 'Password@123';
            } elseif ($existingDoctor && $password === '') {
                $password = null;
            }

            $doctorPayload = [
                'branch_id' => $branchId,
                'department_id' => $department->id,
                'qualification' => $this->nullableString(SpreadsheetIO::cell($row, $columnMap, 'qualification')),
                'experience_years' => $this->nullableInt(SpreadsheetIO::cell($row, $columnMap, 'experience_years')),
                'license_number' => $this->nullableString(SpreadsheetIO::cell($row, $columnMap, 'license_number')),
                'consultation_fee' => $this->nullableNumber(SpreadsheetIO::cell($row, $columnMap, 'consultation_fee')),
                'bio' => $this->nullableString(SpreadsheetIO::cell($row, $columnMap, 'bio')),
            ];

            $doctorCode = SpreadsheetIO::cell($row, $columnMap, 'doctor_code');
            if ($doctorCode !== '') {
                $doctorPayload['doctor_code'] = $doctorCode;
            }

            $status = $this->parseStatus(SpreadsheetIO::cell($row, $columnMap, 'status'), true);
            $phone = $this->nullableString(SpreadsheetIO::cell($row, $columnMap, 'phone'));

            try {
                if ($existingDoctor) {
                    DB::transaction(function () use ($existingDoctor, $name, $email, $phone, $password, $status, $doctorPayload) {
                        $userData = [
                            'name' => $name,
                            'email' => $email,
                            'phone' => $phone,
                            'status' => $status,
                        ];
                        if ($password !== null) {
                            $userData['password'] = $password;
                        }
                        $existingDoctor->user->update($userData);
                        $existingDoctor->update($doctorPayload);
                    });
                    $updated++;
                } else {
                    DB::transaction(function () use ($name, $email, $phone, $password, $status, $doctorPayload, $companyId, $doctorCode) {
                        $user = User::create([
                            'name' => $name,
                            'email' => $email,
                            'password' => $password,
                            'phone' => $phone,
                            'role' => User::ROLE_DOCTOR,
                            'company_id' => $companyId,
                            'status' => $status,
                        ]);

                        app(UserRoleService::class)->assignRole($user, User::ROLE_DOCTOR);

                        $doctor = Doctor::create([
                            ...$doctorPayload,
                            'company_id' => $companyId,
                            'user_id' => $user->id,
                            'doctor_code' => $doctorCode !== '' ? $doctorCode : $this->nextDoctorCode($companyId),
                        ]);

                        app(DoctorAvailabilityService::class)->seedDefaultWeek($doctor);
                    });
                    $imported++;
                }
            } catch (\Throwable $e) {
                $skipped++;
                if (count($errors) < 20) {
                    $errors[] = "Line {$line}: ".$e->getMessage();
                }
            }
        }

        $message = "Import complete. {$imported} doctor(s) created";
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

    private function nullableInt(string $value): ?int
    {
        if ($value === '') {
            return null;
        }

        return is_numeric($value) ? (int) $value : null;
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
            'branch_id' => ['nullable', 'exists:branches,id'],
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
