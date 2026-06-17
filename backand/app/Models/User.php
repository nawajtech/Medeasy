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

    public const ROLE_SUPER_ADMIN = 'super_admin';

    public const ROLE_COMPANY_ADMIN = 'company_admin';

    public const ROLE_DOCTOR = 'doctor';

    public const ROLE_STAFF = 'staff';

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
}
