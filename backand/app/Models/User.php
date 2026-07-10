<?php

namespace App\Models;

use Database\Factories\UserFactory;
use App\Services\PermissionRegistryService;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Spatie\Permission\Traits\HasRoles;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, HasRoles, Notifiable, SoftDeletes {
        HasRoles::hasPermissionTo as protected traitHasPermissionTo;
    }

    public const ROLE_SUPER_ADMIN    = 'super_admin';
    public const ROLE_COMPANY_ADMIN  = 'company_admin';
    public const ROLE_DOCTOR         = 'doctor';
    public const ROLE_STAFF          = 'staff';
    public const ROLE_NURSE          = 'nurse';
    public const ROLE_LAB_TECHNICIAN = 'lab_technician';
    public const ROLE_RADIOLOGIST    = 'radiologist';
    public const ROLE_RECEPTIONIST   = 'receptionist';
    public const ROLE_PHARMACIST     = 'pharmacist';
    public const ROLE_ACCOUNTANT     = 'accountant';

    public const ROLES = [
        self::ROLE_SUPER_ADMIN,
        self::ROLE_COMPANY_ADMIN,
        self::ROLE_DOCTOR,
        self::ROLE_STAFF,
        self::ROLE_NURSE,
        self::ROLE_LAB_TECHNICIAN,
        self::ROLE_RADIOLOGIST,
        self::ROLE_RECEPTIONIST,
        self::ROLE_PHARMACIST,
        self::ROLE_ACCOUNTANT,
    ];

    /** Spatie permissions/roles are registered under the web guard. */
    protected string $guard_name = 'web';

    protected $fillable = [
        'name',
        'email',
        'phone',
        'password',
        'role',
        'company_id',
        'branch_id',
        'status',
        'last_login_at',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'last_login_at' => 'datetime',
            'password' => 'hashed',
            'status' => 'boolean',
        ];
    }

    public function company()
    {
        return $this->belongsTo(Company::class);
    }

    public function branch()
    {
        return $this->belongsTo(Branch::class);
    }

    public function doctor()
    {
        return $this->hasOne(Doctor::class);
    }

    public function fcmTokens()
    {
        return $this->hasMany(FcmToken::class);
    }

    public function appNotifications()
    {
        return $this->hasMany(AppNotification::class);
    }

    public function isSuperAdmin(): bool
    {
        return $this->role === self::ROLE_SUPER_ADMIN;
    }

    public function isCompanyAdmin(): bool
    {
        return $this->role === self::ROLE_COMPANY_ADMIN;
    }

    public function isDoctor(): bool
    {
        return $this->role === self::ROLE_DOCTOR;
    }

    public function isStaff(): bool
    {
        return $this->role === self::ROLE_STAFF;
    }

    public function isNurse(): bool
    {
        return $this->role === self::ROLE_NURSE;
    }

    public function isAccountant(): bool
    {
        return $this->role === self::ROLE_ACCOUNTANT;
    }

    public function isLabTechnician(): bool
    {
        return $this->role === self::ROLE_LAB_TECHNICIAN;
    }

    public function isRadiologist(): bool
    {
        return $this->role === self::ROLE_RADIOLOGIST;
    }

    public function isReceptionist(): bool
    {
        return $this->role === self::ROLE_RECEPTIONIST;
    }

    /** True for any non-super-admin tenant role */
    public function isTenantUser(): bool
    {
        return ! $this->isSuperAdmin();
    }

    /** Permission names for API / frontend (capped by tenant modules). */
    public function permissionNames(): array
    {
        $names = $this->getAllPermissions()->pluck('name')->values()->all();

        if ($this->isSuperAdmin()) {
            $names = array_values(array_filter($names, fn (string $n) => ! str_starts_with($n, 'role.')));

            if ($names === []) {
                $names = app(PermissionRegistryService::class)->resolveRolePermissions(
                    ['*'],
                    ['role.*']
                );
            }

            return $names;
        }

        if ($this->isTenantUser() && $this->company) {
            $allowed = app(PermissionRegistryService::class)->permissionNamesForCompany($this->company);
            $names = array_values(array_intersect($names, $allowed));

            if ($this->isCompanyAdmin() && ! in_array('dashboard.view', $names, true)) {
                $names[] = 'dashboard.view';
            }

            return $names;
        }

        return $names;
    }

    public function hasPermissionTo($permission, $guardName = null): bool
    {
        $name = is_string($permission) ? $permission : $permission->name;

        if ($this->isSuperAdmin()) {
            return ! str_starts_with($name, 'role.');
        }

        if ($this->isTenantUser() && $this->company) {
            $allowed = app(PermissionRegistryService::class)->permissionNamesForCompany($this->company);
            if (! in_array($name, $allowed, true)) {
                return false;
            }
        }

        return $this->traitHasPermissionTo($permission, $guardName);
    }
}
