<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('appointments', function (Blueprint $table) {
            $table->string('invoice_number')->nullable()->unique()->after('notes');
            $table->decimal('charge_amount', 10, 2)->default(0)->after('invoice_number');
            $table->decimal('due_amount', 10, 2)->nullable()->after('charge_amount');
            $table->enum('payment_status', ['pending', 'partial', 'paid'])->default('pending')->after('due_amount');
            $table->text('prescription')->nullable()->after('payment_status');
        });
    }

    public function down(): void
    {
        Schema::table('appointments', function (Blueprint $table) {
            $table->dropColumn([
                'invoice_number',
                'charge_amount',
                'due_amount',
                'payment_status',
                'prescription',
            ]);
        });
    }
};
