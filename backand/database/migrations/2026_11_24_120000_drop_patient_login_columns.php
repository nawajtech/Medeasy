<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Patient login was removed. Drop the patient credential columns
 * (including the plain-text original_password copy) and revoke any
 * API tokens that were issued to patients.
 */
return new class extends Migration
{
    public function up(): void
    {
        DB::table('personal_access_tokens')
            ->where('tokenable_type', 'App\\Models\\Patient')
            ->delete();

        Schema::table('patients', function (Blueprint $table) {
            $table->dropColumn(['password', 'original_password']);
        });
    }

    public function down(): void
    {
        Schema::table('patients', function (Blueprint $table) {
            $table->string('password')->nullable();
            $table->string('original_password')->nullable();
        });
    }
};
