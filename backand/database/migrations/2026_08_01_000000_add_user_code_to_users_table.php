<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('user_code', 50)->nullable()->after('role');
        });

        Schema::table('users', function (Blueprint $table) {
            $table->unique(['company_id', 'user_code']);
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropUnique(['company_id', 'user_code']);
            $table->dropColumn('user_code');
        });
    }
};
