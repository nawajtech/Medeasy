<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateRoleRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('role.edit') ?? false;
    }

    public function rules(): array
    {
        $guard = app(\App\Services\PermissionRegistryService::class)->guardName();
        $roleId = $this->route('role')?->id ?? $this->route('role');
        $companyId = $this->user()->company_id;

        return [
            'name' => [
                'sometimes',
                'required',
                'string',
                'max:100',
                'regex:/^[a-z][a-z0-9_]*$/',
                Rule::unique('roles', 'name')
                    ->where('guard_name', $guard)
                    ->where('company_id', $companyId)
                    ->ignore($roleId),
            ],
            'description' => ['nullable', 'string', 'max:500'],
        ];
    }
}
