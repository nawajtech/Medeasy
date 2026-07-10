<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('diagnostic_packages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->string('package_code', 50);
            $table->string('name');
            $table->text('description')->nullable();
            $table->decimal('offer_percentage', 5, 2)->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['company_id', 'package_code']);
            $table->index('company_id');
        });

        Schema::create('diago_package', function (Blueprint $table) {
            $table->id();
            $table->foreignId('package_id')->constrained('diagnostic_packages')->cascadeOnDelete();
            $table->foreignId('test_id')->constrained('diagnostic_test_types')->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['package_id', 'test_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('diago_package');
        Schema::dropIfExists('diagnostic_packages');
    }
};
