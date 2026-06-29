<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('patient_wallets', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->foreignId('patient_id')->constrained()->cascadeOnDelete();
            $table->decimal('balance', 12, 2)->default(0);
            $table->timestamps();

            $table->unique('patient_id');
        });

        Schema::create('patient_wallet_transactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->foreignId('patient_id')->constrained()->cascadeOnDelete();
            $table->foreignId('wallet_id')->constrained('patient_wallets')->cascadeOnDelete();
            $table->string('type', 30);
            $table->decimal('amount', 12, 2);
            $table->decimal('balance_after', 12, 2);
            $table->string('method', 40)->nullable();
            $table->string('reference', 120)->nullable();
            $table->text('notes')->nullable();
            $table->string('related_type', 80)->nullable();
            $table->unsignedBigInteger('related_id')->nullable();
            $table->foreignId('recorded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('transacted_at');
            $table->timestamps();

            $table->index(['patient_id', 'transacted_at']);
        });

        Schema::create('diagnostic_order_refunds', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->foreignId('diagnostic_order_id')->constrained()->cascadeOnDelete();
            $table->foreignId('diagnostic_order_payment_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('patient_id')->constrained()->cascadeOnDelete();
            $table->decimal('amount', 12, 2);
            $table->string('refund_method', 20);
            $table->string('reference', 120)->nullable();
            $table->text('notes')->nullable();
            $table->foreignId('recorded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('refunded_at');
            $table->timestamps();
        });

        Schema::table('diagnostic_order_payments', function (Blueprint $table) {
            if (! Schema::hasColumn('diagnostic_order_payments', 'refunded_amount')) {
                $table->decimal('refunded_amount', 12, 2)->default(0)->after('amount');
            }
        });

        $patients = \App\Models\Patient::query()->get(['id', 'company_id']);
        foreach ($patients as $patient) {
            \App\Models\PatientWallet::firstOrCreate(
                ['patient_id' => $patient->id],
                ['company_id' => $patient->company_id, 'balance' => 0]
            );
        }
    }

    public function down(): void
    {
        Schema::table('diagnostic_order_payments', function (Blueprint $table) {
            if (Schema::hasColumn('diagnostic_order_payments', 'refunded_amount')) {
                $table->dropColumn('refunded_amount');
            }
        });

        Schema::dropIfExists('diagnostic_order_refunds');
        Schema::dropIfExists('patient_wallet_transactions');
        Schema::dropIfExists('patient_wallets');
    }
};
