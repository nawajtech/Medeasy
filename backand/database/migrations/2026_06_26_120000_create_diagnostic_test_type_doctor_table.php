<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('diagnostic_test_type_doctor', function (Blueprint $table) {
            $table->id();
            $table->foreignId('diagnostic_test_type_id')
                ->constrained('diagnostic_test_types')
                ->cascadeOnDelete();
            $table->foreignId('doctor_id')
                ->constrained()
                ->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['diagnostic_test_type_id', 'doctor_id'], 'diag_test_doctor_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('diagnostic_test_type_doctor');
    }
};
