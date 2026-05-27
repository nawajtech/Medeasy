<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('reports', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->enum('report_type', ['appointments', 'billing', 'patients', 'doctors', 'custom'])->default('custom');
            $table->date('period_start')->nullable();
            $table->date('period_end')->nullable();
            $table->text('summary')->nullable();
            $table->enum('status', ['draft', 'published'])->default('draft');
            $table->dateTime('generated_at')->nullable();
            $table->softDeletes();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('reports');
    }
};
