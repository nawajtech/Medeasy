<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('center_conversations', function (Blueprint $table) {
            $table->softDeletes();
        });

        Schema::table('center_conversations', function (Blueprint $table) {
            $table->dropUnique(['company_id', 'patient_id']);
        });

        // One active conversation per patient+centre; soft-deleted rows may coexist.
        DB::statement(
            'CREATE UNIQUE INDEX center_conversations_company_patient_active_unique
             ON center_conversations (company_id, patient_id)
             WHERE deleted_at IS NULL'
        );
    }

    public function down(): void
    {
        DB::statement('DROP INDEX IF EXISTS center_conversations_company_patient_active_unique');

        Schema::table('center_conversations', function (Blueprint $table) {
            $table->unique(['company_id', 'patient_id']);
            $table->dropSoftDeletes();
        });
    }
};
