<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $driver = Schema::getConnection()->getDriverName();

        if ($driver === 'pgsql') {
            DB::statement('ALTER TABLE appointments DROP CONSTRAINT IF EXISTS appointments_status_check');
            DB::statement('ALTER TABLE appointments ALTER COLUMN status TYPE VARCHAR(30) USING status::text');
            DB::statement("ALTER TABLE appointments ALTER COLUMN status SET DEFAULT 'booked'");
        } else {
            DB::statement("ALTER TABLE appointments MODIFY status VARCHAR(30) NOT NULL DEFAULT 'booked'");
        }

        DB::table('appointments')->where('status', 'scheduled')->update(['status' => 'booked']);
        DB::table('appointments')->where('status', 'confirmed')->update(['status' => 'ongoing']);

        if ($driver === 'pgsql') {
            DB::statement("ALTER TABLE appointments ADD CONSTRAINT appointments_status_check CHECK (status IN ('booked', 'ongoing', 'completed', 'cancelled'))");
        }

        Schema::table('appointments', function (Blueprint $table) {
            if (! Schema::hasColumn('appointments', 'prescription_type')) {
                $table->string('prescription_type', 20)->default('handwritten');
            }
            if (! Schema::hasColumn('appointments', 'prescription_file')) {
                $table->string('prescription_file')->nullable();
            }
        });
    }

    public function down(): void
    {
        Schema::table('appointments', function (Blueprint $table) {
            if (Schema::hasColumn('appointments', 'prescription_type')) {
                $table->dropColumn('prescription_type');
            }
            if (Schema::hasColumn('appointments', 'prescription_file')) {
                $table->dropColumn('prescription_file');
            }
        });

        $driver = Schema::getConnection()->getDriverName();

        if ($driver === 'pgsql') {
            DB::statement('ALTER TABLE appointments DROP CONSTRAINT IF EXISTS appointments_status_check');
        }

        DB::table('appointments')->where('status', 'booked')->update(['status' => 'scheduled']);
        DB::table('appointments')->where('status', 'ongoing')->update(['status' => 'confirmed']);

        if ($driver === 'pgsql') {
            DB::statement("ALTER TABLE appointments ADD CONSTRAINT appointments_status_check CHECK (status IN ('scheduled', 'confirmed', 'completed', 'cancelled'))");
            DB::statement("ALTER TABLE appointments ALTER COLUMN status SET DEFAULT 'scheduled'");
        }
    }
};
