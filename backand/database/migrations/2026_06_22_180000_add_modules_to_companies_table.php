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
            $table->json('modules')->nullable()->after('type');
        });

        $map = [
            'clinic' => ['clinic'],
            'pharmacy' => ['pharmacy'],
            'pathology_lab' => ['laboratory'],
            'diagnostic_center' => ['diagnostics'],
            'hospital' => ['clinic', 'pharmacy', 'laboratory', 'diagnostics'],
        ];

        foreach (DB::table('companies')->select('id', 'type')->get() as $company) {
            $modules = $map[$company->type] ?? ['clinic'];
            DB::table('companies')->where('id', $company->id)->update([
                'modules' => json_encode($modules),
            ]);
        }
    }

    public function down(): void
    {
        Schema::table('companies', function (Blueprint $table) {
            $table->dropColumn('modules');
        });
    }
};
