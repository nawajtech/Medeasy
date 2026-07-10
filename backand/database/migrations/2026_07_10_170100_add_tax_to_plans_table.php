<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('plans', function (Blueprint $table) {
            $table->boolean('tax_enabled')->default(true)->after('currency');
            $table->string('tax_mode', 20)->default('igst')->after('tax_enabled');
            $table->decimal('tax_rate', 5, 2)->default(18)->after('tax_mode');
            $table->boolean('tax_inclusive')->default(false)->after('tax_rate');
        });
    }

    public function down(): void
    {
        Schema::table('plans', function (Blueprint $table) {
            $table->dropColumn(['tax_enabled', 'tax_mode', 'tax_rate', 'tax_inclusive']);
        });
    }
};
