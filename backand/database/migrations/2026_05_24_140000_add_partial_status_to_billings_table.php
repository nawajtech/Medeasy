<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $driver = DB::getDriverName();

        if ($driver === 'pgsql') {
            DB::statement('ALTER TABLE billings DROP CONSTRAINT IF EXISTS billings_status_check');
            DB::statement(
                "ALTER TABLE billings ADD CONSTRAINT billings_status_check CHECK (status IN ('pending', 'partial', 'paid', 'overdue', 'cancelled'))"
            );

            return;
        }

        if ($driver === 'mysql') {
            DB::statement(
                "ALTER TABLE billings MODIFY status ENUM('pending', 'partial', 'paid', 'overdue', 'cancelled') NOT NULL DEFAULT 'pending'"
            );
        }
    }

    public function down(): void
    {
        $driver = DB::getDriverName();

        if ($driver === 'pgsql') {
            DB::statement('ALTER TABLE billings DROP CONSTRAINT IF EXISTS billings_status_check');
            DB::statement(
                "ALTER TABLE billings ADD CONSTRAINT billings_status_check CHECK (status IN ('pending', 'paid', 'overdue', 'cancelled'))"
            );

            return;
        }

        if ($driver === 'mysql') {
            DB::statement(
                "ALTER TABLE billings MODIFY status ENUM('pending', 'paid', 'overdue', 'cancelled') NOT NULL DEFAULT 'pending'"
            );
        }
    }
};
