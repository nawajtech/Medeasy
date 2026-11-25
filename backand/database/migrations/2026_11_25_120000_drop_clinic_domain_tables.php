<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $this->stripClinicFromCompanyModules();
        $this->backfillEmptyCompanyModules();

        if (Schema::hasTable('appointment_vitals')) {
            Schema::drop('appointment_vitals');
        }

        if (Schema::hasTable('billings')) {
            Schema::drop('billings');
        }

        if (Schema::hasTable('appointments')) {
            Schema::drop('appointments');
        }

        if (Schema::hasTable('medicines')) {
            Schema::drop('medicines');
        }

        if (Schema::hasTable('doctor_availabilities')) {
            Schema::drop('doctor_availabilities');
        }

        $this->removeClinicDoctors();
        $this->purgeClinicPermissions();
    }

    public function down(): void
    {
        // Domain removal is not reversible from this migration.
    }

    private function stripClinicFromCompanyModules(): void
    {
        if (! Schema::hasTable('companies') || ! Schema::hasColumn('companies', 'modules')) {
            return;
        }

        $driver = Schema::getConnection()->getDriverName();

        if ($driver === 'pgsql') {
            DB::statement("
                UPDATE companies
                SET modules = (
                    SELECT COALESCE(json_agg(elem), '[]'::json)
                    FROM json_array_elements_text(COALESCE(modules, '[]'::json)) AS elem
                    WHERE elem <> 'clinic'
                )
                WHERE modules IS NOT NULL
            ");

            return;
        }

        foreach (DB::table('companies')->select('id', 'modules')->cursor() as $row) {
            $modules = json_decode($row->modules ?? '[]', true);
            if (! is_array($modules)) {
                $modules = [];
            }

            $filtered = array_values(array_filter(
                $modules,
                fn ($m) => strtolower((string) $m) !== 'clinic'
            ));

            if ($filtered !== $modules) {
                DB::table('companies')->where('id', $row->id)->update([
                    'modules' => json_encode($filtered),
                ]);
            }
        }
    }

    private function backfillEmptyCompanyModules(): void
    {
        if (! Schema::hasTable('companies') || ! Schema::hasColumn('companies', 'modules')) {
            return;
        }

        $default = json_encode(['diagnostics', 'laboratory']);
        $driver = Schema::getConnection()->getDriverName();

        if ($driver === 'pgsql') {
            DB::statement("
                UPDATE companies
                SET modules = '{$default}'::json
                WHERE modules IS NULL
                   OR modules::text IN ('[]', 'null')
            ");

            return;
        }

        foreach (DB::table('companies')->select('id', 'modules')->cursor() as $row) {
            $modules = json_decode($row->modules ?? '[]', true);
            if (! is_array($modules) || count($modules) === 0) {
                DB::table('companies')->where('id', $row->id)->update([
                    'modules' => $default,
                ]);
            }
        }
    }

    private function removeClinicDoctors(): void
    {
        if (! Schema::hasTable('doctors')) {
            return;
        }

        $clinicDoctorIds = DB::table('doctors')
            ->where('doctor_type', 'clinic')
            ->pluck('id');

        if ($clinicDoctorIds->isEmpty()) {
            return;
        }

        if (Schema::hasTable('diagnostic_orders') && Schema::hasColumn('diagnostic_orders', 'doctor_id')) {
            DB::table('diagnostic_orders')
                ->whereIn('doctor_id', $clinicDoctorIds)
                ->update(['doctor_id' => null]);
        }

        if (Schema::hasTable('lab_orders') && Schema::hasColumn('lab_orders', 'doctor_id')) {
            DB::table('lab_orders')
                ->whereIn('doctor_id', $clinicDoctorIds)
                ->update(['doctor_id' => null]);
        }

        if (Schema::hasTable('users') && Schema::hasColumn('users', 'doctor_id')) {
            DB::table('users')
                ->whereIn('doctor_id', $clinicDoctorIds)
                ->update(['doctor_id' => null]);
        }

        DB::table('doctors')->where('doctor_type', 'clinic')->delete();
    }

    private function purgeClinicPermissions(): void
    {
        if (! Schema::hasTable('permissions')) {
            return;
        }

        $patterns = ['appointment.%', 'medicine.%', 'prescription.%', 'billing.%'];
        $permissionIds = collect();

        foreach ($patterns as $pattern) {
            $permissionIds = $permissionIds->merge(
                DB::table('permissions')->where('name', 'like', $pattern)->pluck('id')
            );
        }

        $permissionIds = $permissionIds->unique()->values();

        if ($permissionIds->isEmpty()) {
            return;
        }

        if (Schema::hasTable('role_has_permissions')) {
            DB::table('role_has_permissions')
                ->whereIn('permission_id', $permissionIds)
                ->delete();
        }

        if (Schema::hasTable('model_has_permissions')) {
            DB::table('model_has_permissions')
                ->whereIn('permission_id', $permissionIds)
                ->delete();
        }

        DB::table('permissions')->whereIn('id', $permissionIds)->delete();
    }
};