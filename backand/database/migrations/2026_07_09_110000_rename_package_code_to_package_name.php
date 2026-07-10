<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('diago_package', 'package_code')) {
            return;
        }

        $this->dropUniqueIfExists('diago_package', 'diago_package_company_id_package_code_unique');

        if (Schema::getConnection()->getDriverName() === 'pgsql') {
            DB::statement('ALTER TABLE diago_package RENAME COLUMN package_code TO package_name');
        } else {
            Schema::table('diago_package', function (Blueprint $table) {
                $table->renameColumn('package_code', 'package_name');
            });
        }

        Schema::table('diago_package', function (Blueprint $table) {
            $table->unique(['company_id', 'package_name']);
        });
    }

    public function down(): void
    {
        if (! Schema::hasColumn('diago_package', 'package_name')) {
            return;
        }

        $this->dropUniqueIfExists('diago_package', 'diago_package_company_id_package_name_unique');

        if (Schema::getConnection()->getDriverName() === 'pgsql') {
            DB::statement('ALTER TABLE diago_package RENAME COLUMN package_name TO package_code');
        } else {
            Schema::table('diago_package', function (Blueprint $table) {
                $table->renameColumn('package_name', 'package_code');
            });
        }

        Schema::table('diago_package', function (Blueprint $table) {
            $table->unique(['company_id', 'package_code']);
        });
    }

    private function dropUniqueIfExists(string $table, string $constraint): void
    {
        if (Schema::getConnection()->getDriverName() === 'pgsql') {
            DB::statement("ALTER TABLE {$table} DROP CONSTRAINT IF EXISTS {$constraint}");

            return;
        }

        try {
            Schema::table($table, function (Blueprint $blueprint) use ($constraint) {
                $blueprint->dropUnique($constraint);
            });
        } catch (\Throwable) {
            Schema::table($table, function (Blueprint $blueprint) {
                $blueprint->dropUnique(['company_id', 'package_code']);
            });
        }
    }
};
