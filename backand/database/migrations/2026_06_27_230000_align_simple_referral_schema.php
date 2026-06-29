<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Aligns DB with the simple referral module when an older referral_partners
 * table (phone/status) already exists from a prior schema.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('referral_partners')) {
            Schema::table('referral_partners', function (Blueprint $table) {
                if (! Schema::hasColumn('referral_partners', 'surcharge_type')) {
                    $table->string('surcharge_type', 20)->nullable();
                }
                if (! Schema::hasColumn('referral_partners', 'surcharge_value')) {
                    $table->decimal('surcharge_value', 10, 2)->default(0);
                }
            });
        }

        if (Schema::hasTable('diagnostic_test_types') && ! Schema::hasColumn('diagnostic_test_types', 'referral_commission')) {
            Schema::table('diagnostic_test_types', function (Blueprint $table) {
                $table->decimal('referral_commission', 10, 2)->default(0)->after('price');
            });
        }

        if (Schema::hasTable('diagnostic_orders')) {
            Schema::table('diagnostic_orders', function (Blueprint $table) {
                $columns = [
                    'referral_partner_name' => fn () => $table->string('referral_partner_name')->nullable(),
                    'referral_partner_mobile' => fn () => $table->string('referral_partner_mobile', 20)->nullable(),
                    'referral_partner_address' => fn () => $table->text('referral_partner_address')->nullable(),
                    'referral_partner_type' => fn () => $table->string('referral_partner_type', 20)->nullable(),
                    'deduct_commission_from_bill' => fn () => $table->boolean('deduct_commission_from_bill')->default(false),
                    'gross_amount' => fn () => $table->decimal('gross_amount', 10, 2)->default(0),
                    'referral_commission_amount' => fn () => $table->decimal('referral_commission_amount', 10, 2)->default(0),
                    'referral_discount' => fn () => $table->decimal('referral_discount', 10, 2)->default(0),
                    'surcharge_amount' => fn () => $table->decimal('surcharge_amount', 10, 2)->default(0),
                    'net_amount' => fn () => $table->decimal('net_amount', 10, 2)->default(0),
                ];

                foreach ($columns as $name => $add) {
                    if (! Schema::hasColumn('diagnostic_orders', $name)) {
                        $add();
                    }
                }
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('referral_partners')) {
            Schema::table('referral_partners', function (Blueprint $table) {
                if (Schema::hasColumn('referral_partners', 'surcharge_type')) {
                    $table->dropColumn('surcharge_type');
                }
                if (Schema::hasColumn('referral_partners', 'surcharge_value')) {
                    $table->dropColumn('surcharge_value');
                }
            });
        }

        if (Schema::hasColumn('diagnostic_test_types', 'referral_commission')) {
            Schema::table('diagnostic_test_types', function (Blueprint $table) {
                $table->dropColumn('referral_commission');
            });
        }

        if (Schema::hasTable('diagnostic_orders')) {
            Schema::table('diagnostic_orders', function (Blueprint $table) {
                $cols = [
                    'referral_partner_name', 'referral_partner_mobile', 'referral_partner_address',
                    'referral_partner_type', 'deduct_commission_from_bill', 'gross_amount',
                    'referral_commission_amount', 'referral_discount', 'surcharge_amount', 'net_amount',
                ];
                foreach ($cols as $col) {
                    if (Schema::hasColumn('diagnostic_orders', $col)) {
                        $table->dropColumn($col);
                    }
                }
            });
        }
    }
};
