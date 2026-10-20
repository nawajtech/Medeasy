<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('subscription_payments', function (Blueprint $table) {
            // awaiting_verification is 21 chars; column was varchar(20).
            $table->string('payment_status', 40)->default('pending')->change();
        });
    }

    public function down(): void
    {
        Schema::table('subscription_payments', function (Blueprint $table) {
            $table->string('payment_status', 20)->default('pending')->change();
        });
    }
};
