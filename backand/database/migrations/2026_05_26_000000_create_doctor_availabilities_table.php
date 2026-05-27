<?php

use App\Models\Doctor;
use App\Services\DoctorAvailabilityService;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('doctor_availabilities')) {
            return;
        }

        Schema::create('doctor_availabilities', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->foreignId('doctor_id')->constrained()->cascadeOnDelete();
            $table->unsignedTinyInteger('day_of_week');
            $table->time('start_time');
            $table->time('end_time');
            $table->unsignedSmallInteger('slot_duration')->default(30);
            $table->unsignedSmallInteger('max_patients')->default(10);
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->unique(['doctor_id', 'day_of_week']);
            $table->index(['company_id', 'doctor_id']);
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
        Schema::dropIfExists('doctor_availabilities');
    }
};
