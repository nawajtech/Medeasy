<?php

namespace App\Http\Requests;

use App\Services\PermissionRegistryService;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreRoleRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('role.create') ?? false;
    }

    public function rules(): array
    {
        $guard = app(PermissionRegistryService::class)->guardName();

        return [
            'name' => [
                'required',
                'string',
                'max:100',
                'regex:/^[a-z][a-z0-9_]*$/',
                Rule::unique('roles', 'name')
                    ->where('guard_name', $guard)
                    ->where('company_id', $this->user()->company_id),
            ],
            'description' => ['nullable', 'string', 'max:500'],
        ];
    }
}
