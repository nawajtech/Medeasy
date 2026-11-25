<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Follow-up for environments that already ran drop_clinic_domain_tables
 * before empty-module backfill was added.
 */
return new class extends Migration
{
    public function up(): void
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

    public function down(): void
    {
        //
    }
};
