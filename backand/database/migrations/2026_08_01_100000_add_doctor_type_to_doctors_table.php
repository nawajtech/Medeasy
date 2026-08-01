<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('doctors', function (Blueprint $table) {
            $table->string('doctor_type', 20)->default('clinic')->after('department_id');
            $table->index(['company_id', 'doctor_type']);
        });

        // Existing records default to clinic; diagnostics-only companies → diagnostic; lab-only → lab.
        if (Schema::hasTable('companies')) {
            $companies = DB::table('companies')->select('id', 'modules', 'type')->get();
            foreach ($companies as $company) {
                $modules = json_decode($company->modules ?? '[]', true) ?: [];
                $type = 'clinic';
                if (! in_array('clinic', $modules, true)) {
                    if (in_array('diagnostics', $modules, true)) {
                        $type = 'diagnostic';
                    } elseif (in_array('laboratory', $modules, true)) {
                        $type = 'lab';
                    }
                }
                if ($type !== 'clinic') {
                    DB::table('doctors')
                        ->where('company_id', $company->id)
                        ->update(['doctor_type' => $type]);
                }
            }
        }
    }

    public function down(): void
    {
        Schema::table('doctors', function (Blueprint $table) {
            $table->dropIndex(['company_id', 'doctor_type']);
            $table->dropColumn('doctor_type');
        });
    }
};
