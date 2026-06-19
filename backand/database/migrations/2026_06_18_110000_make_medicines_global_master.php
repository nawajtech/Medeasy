<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('medicines', function (Blueprint $table) {
            $table->dropUnique(['company_id', 'name']);
            $table->dropForeign(['company_id']);
            $table->dropColumn('company_id');
        });

        Schema::table('medicines', function (Blueprint $table) {
            $table->unique('name');
        });
    }

    public function down(): void
    {
        Schema::table('medicines', function (Blueprint $table) {
            $table->dropUnique(['name']);
            $table->foreignId('company_id')->nullable()->constrained()->cascadeOnDelete();
        });

        Schema::table('medicines', function (Blueprint $table) {
            $table->unique(['company_id', 'name']);
        });
    }
};
