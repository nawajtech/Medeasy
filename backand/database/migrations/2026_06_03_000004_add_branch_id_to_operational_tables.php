<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $tables = ['users', 'doctors', 'appointments', 'lab_orders', 'diagnostic_orders'];

        foreach ($tables as $table) {
            Schema::table($table, function (Blueprint $table) {
                $table->foreignId('branch_id')->nullable()->after('company_id')
                    ->constrained('branches')->nullOnDelete();
            });
        }
    }

    public function down(): void
    {
        $tables = ['diagnostic_orders', 'lab_orders', 'appointments', 'doctors', 'users'];

        foreach ($tables as $table) {
            Schema::table($table, function (Blueprint $t) {
                $t->dropForeignIdFor(\App\Models\Branch::class);
                $t->dropColumn('branch_id');
            });
        }
    }
};
