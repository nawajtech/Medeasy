<?php

use App\Models\Doctor;
use App\Services\DoctorAvailabilityService;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('doctor_availabilities')) {
            return;
        }

        Schema::table('doctor_availabilities', function (Blueprint $table) {
            if (! Schema::hasColumn('doctor_availabilities', 'company_id')) {
                $table->foreignId('company_id')->nullable()->after('id')->constrained()->cascadeOnDelete();
            }
            if (! Schema::hasColumn('doctor_availabilities', 'slot_duration')) {
                $table->unsignedSmallInteger('slot_duration')->default(30)->after('end_time');
            }
            if (! Schema::hasColumn('doctor_availabilities', 'max_patients')) {
                $table->unsignedSmallInteger('max_patients')->default(10)->after('slot_duration');
            }
        });

        DB::table('doctor_availabilities')
            ->whereNull('company_id')
            ->orderBy('id')
            ->each(function ($row) {
                $companyId = DB::table('doctors')->where('id', $row->doctor_id)->value('company_id');
                if ($companyId) {
                    DB::table('doctor_availabilities')->where('id', $row->id)->update(['company_id' => $companyId]);
                }
            });

        Doctor::query()->each(function (Doctor $doctor) {
            if ($doctor->availabilities()->exists()) {
                return;
            }
            app(DoctorAvailabilityService::class)->seedDefaultWeek($doctor);
        });
    }

    public function down(): void
    {
        //
    }
};
