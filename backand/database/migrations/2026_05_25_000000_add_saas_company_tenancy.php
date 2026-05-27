<?php

use App\Models\Company;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->foreignId('company_id')->nullable()->after('role')->constrained()->nullOnDelete();
        });

        $tables = ['doctors', 'patients', 'appointments', 'billings', 'departments', 'settings', 'reports'];
        foreach ($tables as $tableName) {
            Schema::table($tableName, function (Blueprint $table) {
                $table->foreignId('company_id')->nullable()->after('id')->constrained()->cascadeOnDelete();
            });
        }

        $defaultCompanyId = Company::query()->orderBy('id')->value('id');
        if (! $defaultCompanyId) {
            $defaultCompanyId = Company::create([
                'name' => 'Default Clinic',
                'code' => 'DEFAULT',
                'is_active' => true,
            ])->id;
        }

        foreach ($tables as $tableName) {
            DB::table($tableName)->whereNull('company_id')->update(['company_id' => $defaultCompanyId]);
        }

        DB::table('users')
            ->whereNull('company_id')
            ->where('role', '!=', 'super_admin')
            ->update(['company_id' => $defaultCompanyId]);

        foreach ($tables as $tableName) {
            if (Schema::hasColumn($tableName, 'company_id')) {
                DB::statement("ALTER TABLE {$tableName} ALTER COLUMN company_id SET NOT NULL");
            }
        }

        $this->swapPatientUniques();
        $this->swapDoctorUniques();
        $this->swapDepartmentUniques();
        $this->swapSettingUniques();
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropConstrainedForeignId('company_id');
        });

        foreach (['reports', 'settings', 'departments', 'billings', 'appointments', 'patients', 'doctors'] as $tableName) {
            Schema::table($tableName, function (Blueprint $table) {
                $table->dropConstrainedForeignId('company_id');
            });
        }
    }

    private function swapPatientUniques(): void
    {
        $this->dropConstraintIfExists('patients', 'patients_email_unique');
        $this->dropConstraintIfExists('patients', 'patients_patient_code_unique');
        $this->dropConstraintIfExists('patients', 'patients_phone_unique');

        Schema::table('patients', function (Blueprint $table) {
            $table->unique(['company_id', 'email']);
            $table->unique(['company_id', 'patient_code']);
        });

        if (Schema::hasColumn('patients', 'phone')) {
            Schema::table('patients', function (Blueprint $table) {
                $table->unique(['company_id', 'phone']);
            });
        }
    }

    private function swapDoctorUniques(): void
    {
        $this->dropConstraintIfExists('doctors', 'doctors_doctor_code_unique');

        Schema::table('doctors', function (Blueprint $table) {
            $table->unique(['company_id', 'doctor_code']);
        });
    }

    private function swapDepartmentUniques(): void
    {
        $this->dropConstraintIfExists('departments', 'departments_name_unique');
        $this->dropConstraintIfExists('departments', 'departments_code_unique');

        Schema::table('departments', function (Blueprint $table) {
            $table->unique(['company_id', 'name']);
            $table->unique(['company_id', 'code']);
        });
    }

    private function swapSettingUniques(): void
    {
        $this->dropConstraintIfExists('settings', 'settings_key_unique');

        Schema::table('settings', function (Blueprint $table) {
            $table->unique(['company_id', 'key']);
        });
    }

    private function dropConstraintIfExists(string $table, string $constraint): void
    {
        DB::statement("ALTER TABLE {$table} DROP CONSTRAINT IF EXISTS {$constraint}");
    }
};
