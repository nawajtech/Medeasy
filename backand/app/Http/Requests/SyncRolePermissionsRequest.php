<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class SyncRolePermissionsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('role.assign_permissions') ?? false;
    }

    public function rules(): array
    {
        $guard = 'web';

        return [
            'permissions' => ['present', 'array'],
            'permissions.*' => [
                'string',
                Rule::exists('permissions', 'name')->where('guard_name', $guard),
            ],
        ];
    }
}
