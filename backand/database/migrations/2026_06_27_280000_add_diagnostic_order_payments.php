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
            if (! Schema::hasColumn('diagnostic_orders', 'paid_amount')) {
                $table->decimal('paid_amount', 12, 2)->default(0)->after('net_amount');
            }
            if (! Schema::hasColumn('diagnostic_orders', 'due_amount')) {
                $table->decimal('due_amount', 12, 2)->default(0)->after('paid_amount');
            }
            if (! Schema::hasColumn('diagnostic_orders', 'payment_status')) {
                $table->string('payment_status', 20)->default('pending')->after('due_amount');
            }
            if (! Schema::hasColumn('diagnostic_orders', 'payment_method')) {
                $table->string('payment_method', 40)->nullable()->after('payment_status');
            }
        });

        Schema::create('diagnostic_order_payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('diagnostic_order_id')->constrained()->cascadeOnDelete();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->decimal('amount', 12, 2);
            $table->string('payment_method', 40)->nullable();
            $table->string('reference', 80)->nullable();
            $table->text('notes')->nullable();
            $table->foreignId('recorded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('paid_at');
            $table->timestamps();

            $table->index(['diagnostic_order_id', 'paid_at']);
        });

        if (Schema::hasColumn('diagnostic_orders', 'net_amount')) {
            DB::table('diagnostic_orders')->where('status', '!=', 'cancelled')->update([
                'paid_amount' => DB::raw('COALESCE(net_amount, amount, 0)'),
                'due_amount' => 0,
                'payment_status' => 'paid',
            ]);
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('diagnostic_order_payments');

        Schema::table('diagnostic_orders', function (Blueprint $table) {
            foreach (['payment_method', 'payment_status', 'due_amount', 'paid_amount'] as $col) {
                if (Schema::hasColumn('diagnostic_orders', $col)) {
                    $table->dropColumn($col);
                }
            }
        });
    }
};
