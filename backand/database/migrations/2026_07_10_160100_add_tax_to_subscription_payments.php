<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('subscription_payments', function (Blueprint $table) {
            $table->decimal('subtotal', 12, 2)->default(0)->after('amount');
            $table->boolean('tax_enabled')->default(false)->after('subtotal');
            $table->string('tax_mode', 20)->nullable()->after('tax_enabled');
            $table->decimal('tax_rate', 5, 2)->default(0)->after('tax_mode');
            $table->decimal('cgst_rate', 5, 2)->default(0)->after('tax_rate');
            $table->decimal('sgst_rate', 5, 2)->default(0)->after('cgst_rate');
            $table->decimal('igst_rate', 5, 2)->default(0)->after('sgst_rate');
            $table->decimal('cgst_amount', 12, 2)->default(0)->after('igst_rate');
            $table->decimal('sgst_amount', 12, 2)->default(0)->after('cgst_amount');
            $table->decimal('igst_amount', 12, 2)->default(0)->after('sgst_amount');
            $table->decimal('tax_amount', 12, 2)->default(0)->after('igst_amount');
        });

        DB::table('subscription_payments')->update([
            'subtotal' => DB::raw('amount'),
        ]);
    }

    public function down(): void
    {
        Schema::table('subscription_payments', function (Blueprint $table) {
            $table->dropColumn([
                'subtotal',
                'tax_enabled',
                'tax_mode',
                'tax_rate',
                'cgst_rate',
                'sgst_rate',
                'igst_rate',
                'cgst_amount',
                'sgst_amount',
                'igst_amount',
                'tax_amount',
            ]);
        });
    }
};
