<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('billings', function (Blueprint $table) {
            $table->decimal('previous_due', 10, 2)->default(0)->after('invoice_number');
            $table->decimal('charge_amount', 10, 2)->default(0)->after('previous_due');
            $table->decimal('paid_amount', 10, 2)->default(0)->after('charge_amount');
            $table->decimal('total_amount', 10, 2)->default(0)->after('paid_amount');
            $table->decimal('due_amount', 10, 2)->default(0)->after('total_amount');
        });

        if (Schema::hasColumn('billings', 'amount')) {
            DB::table('billings')->orderBy('id')->each(function ($row) {
                DB::table('billings')->where('id', $row->id)->update([
                    'charge_amount' => $row->amount,
                    'total_amount' => $row->amount,
                    'due_amount' => $row->status === 'paid' ? 0 : $row->amount,
                    'paid_amount' => $row->status === 'paid' ? $row->amount : 0,
                ]);
            });

            Schema::table('billings', function (Blueprint $table) {
                $table->dropColumn('amount');
            });
        }
    }

    public function down(): void
    {
        Schema::table('billings', function (Blueprint $table) {
            $table->decimal('amount', 10, 2)->default(0)->after('invoice_number');
        });

        Schema::table('billings', function (Blueprint $table) {
            $table->dropColumn([
                'previous_due',
                'charge_amount',
                'paid_amount',
                'total_amount',
                'due_amount',
            ]);
        });
    }
};
