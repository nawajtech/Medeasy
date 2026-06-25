<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('companies', function (Blueprint $table) {
            $table->foreignId('primary_admin_id')
                ->nullable()
                ->after('is_active')
                ->constrained('users')
                ->nullOnDelete();
        });

        // Link existing seeded companies to their first company_admin user
        $pairs = DB::table('users')
            ->select('company_id', DB::raw('MIN(id) as admin_id'))
            ->where('role', 'company_admin')
            ->whereNotNull('company_id')
            ->groupBy('company_id')
            ->get();

        foreach ($pairs as $pair) {
            DB::table('companies')
                ->where('id', $pair->company_id)
                ->whereNull('primary_admin_id')
                ->update(['primary_admin_id' => $pair->admin_id]);
        }
    }

    public function down(): void
    {
        Schema::table('companies', function (Blueprint $table) {
            $table->dropConstrainedForeignId('primary_admin_id');
        });
    }
};
