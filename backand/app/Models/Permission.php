<?php

namespace App\Models;

use Spatie\Permission\Models\Permission as SpatiePermission;

class Permission extends SpatiePermission
{
    protected $guard_name = 'web';

    protected $fillable = [
        'name',
        'guard_name',
        'module',
        'label',
    ];
}
