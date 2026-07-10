<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Company extends Model
{
    use SoftDeletes;

    public const MODULE_CLINIC = 'clinic';

    public const MODULE_PHARMACY = 'pharmacy';

    public const MODULE_LABORATORY = 'laboratory';

    public const MODULE_DIAGNOSTICS = 'diagnostics';

    public const MODULES = [
        self::MODULE_CLINIC => 'Clinic',
        self::MODULE_PHARMACY => 'Pharmacy',
        self::MODULE_LABORATORY => 'Laboratory',
        self::MODULE_DIAGNOSTICS => 'Diagnostics',
    ];

    /** @deprecated Legacy single-type labels — use modules instead */
    public const TYPES = [
        'clinic' => 'Clinic',
        'diagnostic_center' => 'Diagnostic Center',
        'pathology_lab' => 'Pathology Lab',
        'hospital' => 'Hospital',
        'pharmacy' => 'Pharmacy',
        'multi' => 'Multi-service',
    ];

    protected $fillable = [
        'name',
        'code',
        'type',
        'modules',
        'phone',
        'email',
        'address',
        'city',
        'state',
        'country',
        'website',
        'description',
        'logo_url',
        'gst_number',
        'registration_number',
        'currency',
        'is_active',
        'primary_admin_id',
    ];

    protected $appends = [
        'modules_label',
        'type_label',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'modules' => 'array',
        ];
    }

    public static function normalizeModules(array $modules): array
    {
        $allowed = array_keys(self::MODULES);

        return array_values(array_unique(array_filter(
            $modules,
            fn ($m) => in_array($m, $allowed, true)
        )));
    }

    public static function deriveLegacyType(array $modules): string
    {
        $modules = self::normalizeModules($modules);

        if ($modules === array_keys(self::MODULES)) {
            return 'hospital';
        }

        if (count($modules) === 1) {
            return match ($modules[0]) {
                self::MODULE_PHARMACY => 'pharmacy',
                self::MODULE_LABORATORY => 'pathology_lab',
                self::MODULE_DIAGNOSTICS => 'diagnostic_center',
                default => 'clinic',
            };
        }

        return 'multi';
    }

    public function hasModule(string $module): bool
    {
        return in_array($module, $this->modules ?? [], true);
    }

    /** Diagnostic center without clinic module — doctors only see today's queue. */
    public function isDiagnosticsOnly(): bool
    {
        $modules = self::normalizeModules($this->modules ?? []);

        return in_array(self::MODULE_DIAGNOSTICS, $modules, true)
            && ! in_array(self::MODULE_CLINIC, $modules, true);
    }

    protected function modulesLabel(): Attribute
    {
        return Attribute::get(function (): string {
            $modules = self::normalizeModules($this->modules ?? []);

            if ($modules === []) {
                return self::MODULES[self::MODULE_CLINIC];
            }

            if ($modules === array_keys(self::MODULES)) {
                return 'Hospital (All services)';
            }

            return collect($modules)
                ->map(fn ($key) => self::MODULES[$key] ?? ucfirst($key))
                ->join(' + ');
        });
    }

    protected function typeLabel(): Attribute
    {
        return Attribute::get(fn (): string => $this->modules_label);
    }

    public function users()
    {
        return $this->hasMany(User::class);
    }

    public function primaryAdmin()
    {
        return $this->belongsTo(User::class, 'primary_admin_id');
    }

    public function doctors()
    {
        return $this->hasMany(Doctor::class);
    }

    public function patients()
    {
        return $this->hasMany(Patient::class);
    }

    public function appointments()
    {
        return $this->hasMany(Appointment::class);
    }

    public function departments()
    {
        return $this->hasMany(Department::class);
    }

    public function branches()
    {
        return $this->hasMany(Branch::class);
    }

    public function subscriptions()
    {
        return $this->hasMany(Subscription::class);
    }

    public function activeSubscription()
    {
        return $this->hasOne(Subscription::class)
            ->whereIn('status', Subscription::USABLE_STATUSES)
            ->latest();
    }
}
