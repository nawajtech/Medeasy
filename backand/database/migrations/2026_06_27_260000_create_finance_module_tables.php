<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('diagnostic_test_types', function (Blueprint $table) {
            if (! Schema::hasColumn('diagnostic_test_types', 'doctor_commission')) {
                $table->decimal('doctor_commission', 12, 2)->default(0)->after('referral_commission');
            }
        });

        Schema::table('diagnostic_orders', function (Blueprint $table) {
            if (! Schema::hasColumn('diagnostic_orders', 'doctor_commission_amount')) {
                $table->decimal('doctor_commission_amount', 12, 2)->default(0)->after('referral_commission_amount');
            }
        });

        Schema::create('expenses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->string('category', 80);
            $table->string('description')->nullable();
            $table->decimal('amount', 12, 2);
            $table->date('expense_date');
            $table->string('payment_method', 40)->nullable();
            $table->text('notes')->nullable();
            $table->foreignId('recorded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['company_id', 'expense_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('expenses');

        Schema::table('diagnostic_orders', function (Blueprint $table) {
            if (Schema::hasColumn('diagnostic_orders', 'doctor_commission_amount')) {
                $table->dropColumn('doctor_commission_amount');
            }
        });

        Schema::table('diagnostic_test_types', function (Blueprint $table) {
            if (Schema::hasColumn('diagnostic_test_types', 'doctor_commission')) {
                $table->dropColumn('doctor_commission');
            }
        });
    }
};
