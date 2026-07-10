<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('diagnostic_orders', function (Blueprint $table) {
            $table->foreignId('package_id')
                ->nullable()
                ->after('test_type_id')
                ->constrained('diago_package')
                ->nullOnDelete();
            $table->decimal('package_discount', 10, 2)
                ->default(0)
                ->after('referral_discount');
        });
    }

    public function down(): void
    {
        Schema::table('diagnostic_orders', function (Blueprint $table) {
            $table->dropConstrainedForeignId('package_id');
            $table->dropColumn('package_discount');
        });
    }
};
