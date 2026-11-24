<?php

namespace App\Http\Controllers\Concerns;

use App\Models\Doctor;
use App\Models\Patient;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

trait HandlesTenancy
{
    protected function resolveCompanyId(Request $request): int
    {
        /** @var User $user */
        $user = auth()->user();

        if ($user->isSuperAdmin()) {
            return (int) $request->validate([
                'company_id' => ['required', 'exists:companies,id'],
            ])['company_id'];
        }

        abort_unless($user->company_id, 403, 'Your account is not linked to a company.');

        return (int) $user->company_id;
    }

    /**
     * Tenant users must not send company_id — it comes from auth.
     * Strips empty values so "sometimes|exists" does not reject "".
     */
    protected function prepareCompanyScope(Request $request): void
    {
        /** @var User $user */
        $user = auth()->user();

        if (! $user->isSuperAdmin()) {
            $request->request->remove('company_id');
        }
    }

    /** @return array<int, mixed> */
    protected function companyIdRules(): array
    {
        /** @var User $user */
        $user = auth()->user();

        return $user->isSuperAdmin()
            ? ['required', 'exists:companies,id']
            : ['prohibited'];
    }

    protected function optionalCompanyId(Request $request): ?int
    {
        /** @var User $user */
        $user = auth()->user();

        if (! $user->isSuperAdmin()) {
            return $user->company_id;
        }

        $value = $request->input('company_id');

        return $value ? (int) $value : null;
    }

    protected function assertSameCompany(Patient $patient, Doctor $doctor): void
    {
        if ((int) $patient->company_id !== (int) $doctor->company_id) {
            abort(422, 'Patient and doctor must belong to the same company.');
        }
    }

    protected function assertTenantAccess(Model $model): void
    {
        /** @var User $user */
        $user = auth()->user();

        if ($user->isSuperAdmin()) {
            return;
        }

        if (! isset($model->company_id) || (int) $model->company_id !== (int) $user->company_id) {
            abort(403, 'You do not have access to this record.');
        }
    }

    protected function doctorIdForUser(): ?int
    {
        /** @var User $user */
        $user = auth()->user();

        if (! $user->isDoctor()) {
            return null;
        }

        return $user->doctor?->id;
    }
}
