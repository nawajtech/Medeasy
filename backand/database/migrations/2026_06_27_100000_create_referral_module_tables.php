<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('referral_partners', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('mobile', 20)->nullable();
            $table->text('address')->nullable();
            $table->enum('type', ['doctor', 'clinic', 'hospital', 'agent'])->default('doctor');
            $table->enum('surcharge_type', ['fixed', 'percentage'])->nullable();
            $table->decimal('surcharge_value', 10, 2)->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();

            $table->index(['company_id', 'is_active']);
        });

        Schema::table('diagnostic_test_types', function (Blueprint $table) {
            $table->decimal('referral_commission', 10, 2)->default(0)->after('price');
        });

        Schema::table('diagnostic_orders', function (Blueprint $table) {
            $table->foreignId('referral_partner_id')->nullable()->after('test_type_id')
                ->constrained('referral_partners')->nullOnDelete();
            $table->string('referral_partner_name')->nullable()->after('referral_partner_id');
            $table->string('referral_partner_mobile', 20)->nullable()->after('referral_partner_name');
            $table->text('referral_partner_address')->nullable()->after('referral_partner_mobile');
            $table->string('referral_partner_type', 20)->nullable()->after('referral_partner_address');
            $table->boolean('deduct_commission_from_bill')->default(false)->after('referral_partner_type');
            $table->decimal('gross_amount', 10, 2)->default(0)->after('amount');
            $table->decimal('referral_commission_amount', 10, 2)->default(0)->after('gross_amount');
            $table->decimal('referral_discount', 10, 2)->default(0)->after('referral_commission_amount');
            $table->decimal('surcharge_amount', 10, 2)->default(0)->after('referral_discount');
            $table->decimal('net_amount', 10, 2)->default(0)->after('surcharge_amount');
        });
    }

    public function down(): void
    {
        Schema::table('diagnostic_orders', function (Blueprint $table) {
            $table->dropConstrainedForeignId('referral_partner_id');
            $table->dropColumn([
                'referral_partner_name',
                'referral_partner_mobile',
                'referral_partner_address',
                'referral_partner_type',
                'deduct_commission_from_bill',
                'gross_amount',
                'referral_commission_amount',
                'referral_discount',
                'surcharge_amount',
                'net_amount',
            ]);
        });

        Schema::table('diagnostic_test_types', function (Blueprint $table) {
            $table->dropColumn('referral_commission');
        });

        Schema::dropIfExists('referral_partners');
    }
};
