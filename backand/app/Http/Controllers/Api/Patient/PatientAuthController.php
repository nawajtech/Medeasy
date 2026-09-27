<?php

namespace App\Http\Controllers\Api\Patient;

use App\Http\Controllers\Controller;
use App\Models\Patient;
use App\Support\ContactRules;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class PatientAuthController extends Controller
{
    public function register(Request $request): JsonResponse
    {
        $request->merge(['phone' => trim((string) $request->input('phone', ''))]);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => [...ContactRules::email(), Rule::unique('patients', 'email')],
            'phone' => [...ContactRules::phone(), Rule::unique('patients', 'phone')],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
            'gender' => ['nullable', Rule::in(['male', 'female', 'other'])],
            'date_of_birth' => ['nullable', 'date', 'before:today'],
        ]);

        $patient = Patient::create([
            'company_id' => null,
            'patient_code' => $this->generatePortalCode($validated['name']),
            'name' => $validated['name'],
            'email' => $validated['email'],
            'phone' => $validated['phone'],
            'password' => $validated['password'],
            'original_password' => $validated['password'],
            'gender' => $validated['gender'] ?? null,
            'date_of_birth' => $validated['date_of_birth'] ?? null,
            'status' => true,
        ]);

        $token = $patient->createToken('patient-portal')->plainTextToken;

        return response()->json([
            'token' => $token,
            'patient' => $this->patientPayload($patient->fresh(['company', 'wallet'])),
        ], 201);
    }

    public function login(Request $request): JsonResponse
    {
        $credentials = $request->validate([
            'email' => ContactRules::email(),
            'password' => ['required', 'string'],
        ]);

        $patient = Patient::where('email', $credentials['email'])->first();

        if (! $patient || ! Hash::check($credentials['password'], $patient->password)) {
            throw ValidationException::withMessages([
                'email' => ['Invalid email or password.'],
            ]);
        }

        if (! $patient->status) {
            throw ValidationException::withMessages([
                'email' => ['This account is disabled.'],
            ]);
        }

        $token = $patient->createToken('patient-portal')->plainTextToken;

        return response()->json([
            'token' => $token,
            'patient' => $this->patientPayload($patient->load(['company', 'wallet'])),
        ]);
    }

    public function me(Request $request): JsonResponse
    {
        /** @var Patient $patient */
        $patient = $request->user();

        return response()->json([
            'patient' => $this->patientPayload($patient->load(['company', 'wallet'])),
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()?->delete();

        return response()->json(['message' => 'Logged out successfully']);
    }

    public function updateProfile(Request $request): JsonResponse
    {
        /** @var Patient $patient */
        $patient = $request->user();
        $request->merge(['phone' => trim((string) $request->input('phone', $patient->phone))]);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => [...ContactRules::email(), Rule::unique('patients', 'email')->ignore($patient->id)],
            'phone' => [...ContactRules::phone(), Rule::unique('patients', 'phone')->ignore($patient->id)],
            'gender' => ['nullable', Rule::in(['male', 'female', 'other'])],
            'date_of_birth' => ['nullable', 'date', 'before:today'],
            'blood_group' => ['nullable', 'string', 'max:10'],
            'height' => ['nullable', 'numeric', 'min:0'],
            'weight' => ['nullable', 'numeric', 'min:0'],
            'address' => ['nullable', 'string'],
            'emergency_contact_name' => ['nullable', 'string', 'max:255'],
            'emergency_contact_phone' => [...ContactRules::phone(required: false)],
            'allergies' => ['nullable', 'string'],
            'medical_history' => ['nullable', 'string'],
        ]);

        $patient->update($validated);

        return response()->json([
            'message' => 'Profile updated successfully.',
            'patient' => $this->patientPayload($patient->fresh(['company', 'wallet'])),
        ]);
    }

    public function changePassword(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'current_password' => ['required', 'string'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        /** @var Patient $patient */
        $patient = $request->user();

        if (! Hash::check($validated['current_password'], $patient->password)) {
            throw ValidationException::withMessages([
                'current_password' => ['Current password is incorrect.'],
            ]);
        }

        $patient->update([
            'password' => $validated['password'],
            'original_password' => $validated['password'],
        ]);

        return response()->json(['message' => 'Password changed successfully.']);
    }

    private function generatePortalCode(string $name): string
    {
        $prefix = strtoupper(substr(preg_replace('/[^A-Za-z]/', '', $name) ?: 'PT', 0, 3));
        $prefix = str_pad($prefix, 3, 'X');

        do {
            $code = 'PT-'.$prefix.'-'.strtoupper(Str::random(5));
        } while (Patient::withTrashed()->where('patient_code', $code)->exists());

        return $code;
    }

    private function patientPayload(Patient $patient): array
    {
        return [
            'id' => $patient->id,
            'patient_code' => $patient->patient_code,
            'name' => $patient->name,
            'email' => $patient->email,
            'phone' => $patient->phone,
            'status' => $patient->status,
            'gender' => $patient->gender,
            'date_of_birth' => $patient->date_of_birth?->format('Y-m-d'),
            'blood_group' => $patient->blood_group,
            'height' => $patient->height,
            'weight' => $patient->weight,
            'address' => $patient->address,
            'emergency_contact_name' => $patient->emergency_contact_name,
            'emergency_contact_phone' => $patient->emergency_contact_phone,
            'allergies' => $patient->allergies,
            'medical_history' => $patient->medical_history,
            'company_id' => $patient->company_id,
            'company' => $patient->company ? [
                'id' => $patient->company->id,
                'name' => $patient->company->name,
                'city' => $patient->company->city,
                'address' => $patient->company->address,
            ] : null,
            'wallet' => $patient->wallet,
        ];
    }
}
