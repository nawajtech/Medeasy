<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('appointments', function (Blueprint $table) {
            $columns = ['invoice_number', 'charge_amount', 'due_amount', 'payment_status'];
            foreach ($columns as $column) {
                if (Schema::hasColumn('appointments', $column)) {
                    if ($column === 'invoice_number') {
                        $table->dropUnique(['invoice_number']);
                    }
                    $table->dropColumn($column);
                }
            }
        });
    }

    public function down(): void
    {
        Schema::table('appointments', function (Blueprint $table) {
            $table->string('invoice_number')->nullable()->unique()->after('notes');
            $table->decimal('charge_amount', 10, 2)->default(0)->after('invoice_number');
            $table->decimal('due_amount', 10, 2)->nullable()->after('charge_amount');
            $table->enum('payment_status', ['pending', 'partial', 'paid'])->default('pending')->after('due_amount');
        });
    }
};
