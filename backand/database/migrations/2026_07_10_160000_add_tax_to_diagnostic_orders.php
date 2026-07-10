<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('diagnostic_orders', function (Blueprint $table) {
            $table->boolean('tax_enabled')->default(false)->after('net_amount');
            $table->string('tax_mode', 20)->nullable()->after('tax_enabled');
            $table->decimal('tax_rate', 5, 2)->default(0)->after('tax_mode');
            $table->boolean('tax_inclusive')->default(false)->after('tax_rate');
            $table->decimal('taxable_amount', 12, 2)->default(0)->after('tax_inclusive');
            $table->decimal('cgst_rate', 5, 2)->default(0)->after('taxable_amount');
            $table->decimal('sgst_rate', 5, 2)->default(0)->after('cgst_rate');
            $table->decimal('igst_rate', 5, 2)->default(0)->after('sgst_rate');
            $table->decimal('cgst_amount', 12, 2)->default(0)->after('igst_rate');
            $table->decimal('sgst_amount', 12, 2)->default(0)->after('cgst_amount');
            $table->decimal('igst_amount', 12, 2)->default(0)->after('sgst_amount');
            $table->decimal('tax_amount', 12, 2)->default(0)->after('igst_amount');
            $table->decimal('grand_total', 12, 2)->default(0)->after('tax_amount');
        });

        // Existing orders: taxable = net, grand = net (no tax applied historically).
        DB::table('diagnostic_orders')->update([
            'taxable_amount' => DB::raw('COALESCE(net_amount, amount, 0)'),
            'grand_total' => DB::raw('COALESCE(net_amount, amount, 0)'),
        ]);
    }

    public function down(): void
    {
        Schema::table('diagnostic_orders', function (Blueprint $table) {
            $table->dropColumn([
                'tax_enabled',
                'tax_mode',
                'tax_rate',
                'tax_inclusive',
                'taxable_amount',
                'cgst_rate',
                'sgst_rate',
                'igst_rate',
                'cgst_amount',
                'sgst_amount',
                'igst_amount',
                'tax_amount',
                'grand_total',
            ]);
        });
    }
};
