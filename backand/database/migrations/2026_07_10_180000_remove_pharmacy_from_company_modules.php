<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        foreach (DB::table('companies')->select('id', 'modules', 'type')->get() as $company) {
            $modules = json_decode($company->modules, true) ?? [];
            $modules = array_values(array_filter(
                $modules,
                fn (string $module) => $module !== 'pharmacy'
            ));

            if ($modules === []) {
                $modules = ['clinic'];
            }

            $type = match (true) {
                $modules === ['laboratory'] => 'pathology_lab',
                $modules === ['diagnostics'] => 'diagnostic_center',
                count($modules) >= 3 => 'hospital',
                default => 'clinic',
            };

            DB::table('companies')->where('id', $company->id)->update([
                'modules' => json_encode($modules),
                'type' => $type,
            ]);
        }
    }

    public function down(): void
    {
        // Irreversible data cleanup.
    }
};
