<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::dropIfExists('subscription_payments');
        Schema::dropIfExists('subscriptions');
        Schema::dropIfExists('plan_features');
        Schema::dropIfExists('plan_limits');
        Schema::dropIfExists('plans');
        Schema::dropIfExists('subscription_tax_settings');
        Schema::dropIfExists('features');
    }

    public function down(): void
    {
        // Subscription model removed permanently — no rollback.
    }
};
