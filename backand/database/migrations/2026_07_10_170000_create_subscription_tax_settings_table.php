<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('subscription_tax_settings', function (Blueprint $table) {
            $table->id();
            $table->boolean('enabled')->default(true);
            $table->string('mode', 20)->default('igst');
            $table->decimal('rate', 5, 2)->default(18);
            $table->boolean('inclusive')->default(false);
            $table->foreignId('updated_by')->nullable();
            $table->timestamps();
        });

        DB::table('subscription_tax_settings')->insert([
            'enabled' => config('tax.subscription.enabled', true),
            'mode' => config('tax.subscription.mode', 'igst'),
            'rate' => config('tax.subscription.rate', 18),
            'inclusive' => config('tax.subscription.inclusive', false),
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('subscription_tax_settings');
    }
};
