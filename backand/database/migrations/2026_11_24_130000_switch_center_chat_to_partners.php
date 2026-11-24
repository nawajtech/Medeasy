<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Centre chat is now between partners (partner portal) and diagnostic
 * centre staff instead of patients. Patient login was removed, so the
 * old patient conversations can no longer be continued and are dropped.
 */
return new class extends Migration
{
    public function up(): void
    {
        // Messages cascade from conversations.
        DB::table('center_conversations')->delete();
        DB::table('center_chat_presences')->where('actor_type', 'patient')->delete();

        DB::statement('DROP INDEX IF EXISTS center_conversations_company_patient_active_unique');

        Schema::table('center_conversations', function (Blueprint $table) {
            $table->dropForeign(['patient_id']);
            $table->dropIndex(['patient_id', 'last_message_at']);
        });

        Schema::table('center_conversations', function (Blueprint $table) {
            $table->renameColumn('patient_id', 'partner_id');
            $table->renameColumn('patient_read_message_id', 'partner_read_message_id');
        });

        Schema::table('center_conversations', function (Blueprint $table) {
            $table->foreign('partner_id')->references('id')->on('partners')->cascadeOnDelete();
            $table->index(['partner_id', 'last_message_at']);
        });

        DB::statement(
            'CREATE UNIQUE INDEX center_conversations_company_partner_active_unique
             ON center_conversations (company_id, partner_id) WHERE deleted_at IS NULL'
        );
    }

    public function down(): void
    {
        DB::table('center_conversations')->delete();
        DB::table('center_chat_presences')->where('actor_type', 'partner')->delete();

        DB::statement('DROP INDEX IF EXISTS center_conversations_company_partner_active_unique');

        Schema::table('center_conversations', function (Blueprint $table) {
            $table->dropForeign(['partner_id']);
            $table->dropIndex(['partner_id', 'last_message_at']);
        });

        Schema::table('center_conversations', function (Blueprint $table) {
            $table->renameColumn('partner_id', 'patient_id');
            $table->renameColumn('partner_read_message_id', 'patient_read_message_id');
        });

        Schema::table('center_conversations', function (Blueprint $table) {
            $table->foreign('patient_id')->references('id')->on('patients')->cascadeOnDelete();
            $table->index(['patient_id', 'last_message_at']);
        });

        DB::statement(
            'CREATE UNIQUE INDEX center_conversations_company_patient_active_unique
             ON center_conversations (company_id, patient_id) WHERE deleted_at IS NULL'
        );
    }
};
