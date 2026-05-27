<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('appointment_vitals', function (Blueprint $table) {
            $table->id();
            $table->foreignId('appointment_id')->unique()->constrained()->cascadeOnDelete();
            $table->string('blood_pressure')->nullable();
            $table->unsignedSmallInteger('heart_rate')->nullable();
            $table->decimal('body_temperature', 4, 1)->nullable();
            $table->decimal('oxygen_saturation', 5, 2)->nullable();
            $table->unsignedSmallInteger('respiratory_rate')->nullable();
            $table->decimal('blood_sugar', 6, 2)->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('appointment_vitals');
    }
};
