<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('diagnostic_orders', function (Blueprint $table) {
            $table->unsignedSmallInteger('queue_serial')->nullable()->after('scheduled_at');
            $table->index(['doctor_id', 'scheduled_at', 'queue_serial'], 'diag_orders_doctor_day_serial');
        });
    }

    public function down(): void
    {
        Schema::table('diagnostic_orders', function (Blueprint $table) {
            $table->dropIndex('diag_orders_doctor_day_serial');
            $table->dropColumn('queue_serial');
        });
    }
};
