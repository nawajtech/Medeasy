<?php

namespace App\Providers;

use App\Models\User;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Platform super admin: full access except tenant role/permission management.
        Gate::before(function (?User $user, string $ability) {
            if (! $user?->isSuperAdmin()) {
                return null;
            }

            return str_starts_with($ability, 'role.') ? false : true;
        });

        // Sanctum API auth must not change Spatie's permission guard resolution.
        $this->app->booted(function () {
            if ($this->app->runningInConsole()) {
                return;
            }

            $request = request();
            if ($request->is('api/*') && $request->bearerToken()) {
                config(['auth.defaults.guard' => 'web']);
            }
        });
    }
}
