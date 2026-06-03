<?php

namespace App\Models;

use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, Notifiable, SoftDeletes;

    public const ROLE_SUPER_ADMIN    = 'super_admin';
    public const ROLE_COMPANY_ADMIN  = 'company_admin';
    public const ROLE_DOCTOR         = 'doctor';
    public const ROLE_STAFF          = 'staff';
    public const ROLE_LAB_TECHNICIAN = 'lab_technician';
    public const ROLE_RADIOLOGIST    = 'radiologist';
    public const ROLE_RECEPTIONIST   = 'receptionist';
    public const ROLE_PHARMACIST     = 'pharmacist';

    public const ROLES = [
        self::ROLE_SUPER_ADMIN,
        self::ROLE_COMPANY_ADMIN,
        self::ROLE_DOCTOR,
        self::ROLE_STAFF,
        self::ROLE_LAB_TECHNICIAN,
        self::ROLE_RADIOLOGIST,
        self::ROLE_RECEPTIONIST,
        self::ROLE_PHARMACIST,
    ];

    protected $fillable = [
        'name',
        'email',
        'phone',
        'password',
        'role',
        'company_id',
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

    public function doctor()
    {
        return $this->hasOne(Doctor::class);
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
}
