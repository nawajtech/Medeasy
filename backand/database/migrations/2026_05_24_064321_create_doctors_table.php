<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('doctors', function (Blueprint $table) {
            $table->id();

            $table->foreignId('user_id')
                ->constrained()
                ->onDelete('cascade');

            $table->string('doctor_code')->unique();

            $table->string('specialization');

            $table->string('qualification')->nullable();

            $table->integer('experience_years')->nullable();

            $table->string('license_number')->nullable()->unique();

            $table->decimal('consultation_fee', 10, 2)->nullable();

            $table->text('bio')->nullable();

            $table->softDeletes();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('doctors');
    }
};
