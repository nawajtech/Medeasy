<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('center_conversations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->foreignId('patient_id')->constrained()->cascadeOnDelete();
            $table->timestamp('last_message_at')->nullable();
            $table->string('last_message_preview', 180)->nullable();
            $table->unsignedBigInteger('patient_read_message_id')->nullable();
            $table->unsignedBigInteger('staff_read_message_id')->nullable();
            $table->timestamps();

            $table->unique(['company_id', 'patient_id']);
            $table->index(['patient_id', 'last_message_at']);
        });

        Schema::create('center_messages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('conversation_id')->constrained('center_conversations')->cascadeOnDelete();
            $table->string('sender_type', 20);
            $table->foreignId('sender_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->text('body');
            $table->timestamp('created_at')->useCurrent();

            $table->index(['conversation_id', 'id']);
            $table->index(['conversation_id', 'sender_type']);
        });

        Schema::create('center_chat_presences', function (Blueprint $table) {
            $table->id();
            $table->string('actor_type', 20);
            $table->unsignedBigInteger('actor_id');
            $table->foreignId('company_id')->nullable()->constrained()->cascadeOnDelete();
            $table->timestamp('last_seen_at');
            $table->timestamps();

            $table->unique(['actor_type', 'actor_id']);
            $table->index(['company_id', 'actor_type', 'last_seen_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('center_chat_presences');
        Schema::dropIfExists('center_messages');
        Schema::dropIfExists('center_conversations');
    }
};

