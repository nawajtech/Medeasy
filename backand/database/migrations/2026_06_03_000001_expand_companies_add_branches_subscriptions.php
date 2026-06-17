<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Add company type + extra profile fields
        Schema::table('companies', function (Blueprint $table) {
            $table->string('type')->default('clinic')->after('code'); // clinic|diagnostic_center|pathology_lab|hospital|pharmacy
            $table->string('logo_url')->nullable()->after('website');
            $table->string('gst_number')->nullable()->after('logo_url');
            $table->string('registration_number')->nullable()->after('gst_number');
            $table->string('currency', 10)->default('INR')->after('registration_number');
        });

        // Subscription plans (global, managed by super admin)
        Schema::create('subscription_plans', function (Blueprint $table) {
            $table->id();
            $table->string('name');                        // Basic, Pro, Enterprise
            $table->string('code')->unique();
            $table->text('description')->nullable();
            $table->decimal('price_monthly', 10, 2)->default(0);
            $table->decimal('price_yearly', 10, 2)->default(0);
            $table->integer('max_users')->default(5);
            $table->integer('max_doctors')->default(3);
            $table->integer('max_branches')->default(1);
            $table->json('features')->nullable();          // array of feature keys
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        // Per-company subscription
        Schema::create('company_subscriptions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->foreignId('plan_id')->constrained('subscription_plans');
            $table->string('status')->default('active'); // active|expired|cancelled|trial
            $table->timestamp('starts_at')->nullable();
            $table->timestamp('expires_at')->nullable();
            $table->json('meta')->nullable();
            $table->timestamps();

            $table->index(['company_id', 'status']);
        });

        // Branches
        Schema::create('branches', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('code')->nullable();
            $table->string('address')->nullable();
            $table->string('city')->nullable();
            $table->string('phone')->nullable();
            $table->string('email')->nullable();
            $table->boolean('is_main')->default(false);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();

            $table->index('company_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('branches');
        Schema::dropIfExists('company_subscriptions');
        Schema::dropIfExists('subscription_plans');

        Schema::table('companies', function (Blueprint $table) {
            $table->dropColumn(['type', 'logo_url', 'gst_number', 'registration_number', 'currency']);
        });
    }
};
