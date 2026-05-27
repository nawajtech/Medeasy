<?php

use App\Models\Department;
use App\Models\Doctor;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('doctors', function (Blueprint $table) {
            $table->foreignId('department_id')
                ->nullable()
                ->after('doctor_code')
                ->constrained()
                ->nullOnDelete();
        });

        if (Schema::hasColumn('doctors', 'specialization')) {
            Doctor::withTrashed()->each(function (Doctor $doctor) {
                if (! $doctor->specialization) {
                    return;
                }

                $department = Department::firstOrCreate(
                    ['name' => $doctor->specialization],
                    ['code' => null, 'is_active' => true]
                );

                $doctor->update(['department_id' => $department->id]);
            });

            Schema::table('doctors', function (Blueprint $table) {
                $table->dropColumn('specialization');
            });
        }
    }

    public function down(): void
    {
        Schema::table('doctors', function (Blueprint $table) {
            $table->string('specialization')->nullable()->after('doctor_code');
        });

        Doctor::with('department')->each(function (Doctor $doctor) {
            if ($doctor->department) {
                $doctor->update(['specialization' => $doctor->department->name]);
            }
        });

        Schema::table('doctors', function (Blueprint $table) {
            $table->dropForeign(['department_id']);
            $table->dropColumn('department_id');
        });
    }
};
