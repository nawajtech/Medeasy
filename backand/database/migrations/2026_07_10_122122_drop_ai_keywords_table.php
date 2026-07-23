<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Remove orphan ai_keywords table (not used by ApnaMedi application code).
     */
    public function up(): void
    {
        Schema::dropIfExists('ai_keywords');
    }

    /**
     * Restore table structure only — no application code depends on this table.
     */
    public function down(): void
    {
        Schema::create('ai_keywords', function (Blueprint $table) {
            $table->id();
            $table->text('keyword');
            $table->string('category')->nullable();
            $table->text('description')->nullable();
            $table->smallInteger('status')->default(1);
            $table->softDeletes();
            $table->timestamps();
        });
    }
};
