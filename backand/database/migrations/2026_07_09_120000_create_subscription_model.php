<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('subscription_plans') && ! Schema::hasTable('plans')) {
            Schema::rename('subscription_plans', 'plans');
        }

        if (Schema::hasTable('company_subscriptions') && ! Schema::hasTable('subscriptions')) {
            Schema::rename('company_subscriptions', 'subscriptions');
        }

        if (! Schema::hasTable('plans')) {
            Schema::create('plans', function (Blueprint $table) {
                $table->id();
                $table->string('name');
                $table->string('code')->unique();
                $table->text('description')->nullable();
                $table->decimal('monthly_price', 10, 2)->default(0);
                $table->decimal('yearly_price', 10, 2)->default(0);
                $table->string('currency', 10)->default('INR');
                $table->unsignedSmallInteger('trial_days')->default(0);
                $table->string('status', 20)->default('active');
                $table->unsignedSmallInteger('display_order')->default(0);
                $table->timestamps();
            });
        } else {
            Schema::table('plans', function (Blueprint $table) {
                if (Schema::hasColumn('plans', 'price_monthly')) {
                    $table->renameColumn('price_monthly', 'monthly_price');
                }
                if (Schema::hasColumn('plans', 'price_yearly')) {
                    $table->renameColumn('price_yearly', 'yearly_price');
                }
                if (! Schema::hasColumn('plans', 'currency')) {
                    $table->string('currency', 10)->default('INR')->after('yearly_price');
                }
                if (! Schema::hasColumn('plans', 'trial_days')) {
                    $table->unsignedSmallInteger('trial_days')->default(0)->after('currency');
                }
                if (! Schema::hasColumn('plans', 'status')) {
                    $table->string('status', 20)->default('active')->after('trial_days');
                }
                if (! Schema::hasColumn('plans', 'display_order')) {
                    $table->unsignedSmallInteger('display_order')->default(0)->after('status');
                }
            });

            Schema::table('plans', function (Blueprint $table) {
                foreach (['max_users', 'max_doctors', 'max_branches', 'features', 'is_active'] as $column) {
                    if (Schema::hasColumn('plans', $column)) {
                        $table->dropColumn($column);
                    }
                }
            });
        }

        Schema::create('features', function (Blueprint $table) {
            $table->id();
            $table->string('key')->unique();
            $table->string('name');
            $table->text('description')->nullable();
            $table->string('category')->nullable();
            $table->boolean('is_active')->default(true);
            $table->unsignedSmallInteger('display_order')->default(0);
            $table->timestamps();
        });

        Schema::create('plan_features', function (Blueprint $table) {
            $table->id();
            $table->foreignId('plan_id')->constrained('plans')->cascadeOnDelete();
            $table->foreignId('feature_id')->constrained('features')->cascadeOnDelete();
            $table->boolean('is_enabled')->default(true);
            $table->timestamps();

            $table->unique(['plan_id', 'feature_id']);
        });

        Schema::create('plan_limits', function (Blueprint $table) {
            $table->id();
            $table->foreignId('plan_id')->constrained('plans')->cascadeOnDelete();
            $table->string('limit_key');
            $table->unsignedBigInteger('limit_value')->nullable();
            $table->timestamps();

            $table->unique(['plan_id', 'limit_key']);
        });

        if (! Schema::hasTable('subscriptions')) {
            Schema::create('subscriptions', function (Blueprint $table) {
                $table->id();
                $table->foreignId('company_id')->constrained()->cascadeOnDelete();
                $table->foreignId('plan_id')->constrained('plans');
                $table->string('status', 20)->default('trial');
                $table->timestamp('starts_at')->nullable();
                $table->timestamp('expires_at')->nullable();
                $table->timestamp('trial_ends_at')->nullable();
                $table->timestamp('renewal_date')->nullable();
                $table->boolean('auto_renewal')->default(true);
                $table->string('billing_cycle', 20)->default('monthly');
                $table->timestamp('cancelled_at')->nullable();
                $table->timestamp('suspended_at')->nullable();
                $table->json('meta')->nullable();
                $table->timestamps();

                $table->index(['company_id', 'status']);
            });
        } else {
            Schema::table('subscriptions', function (Blueprint $table) {
                if (! Schema::hasColumn('subscriptions', 'trial_ends_at')) {
                    $table->timestamp('trial_ends_at')->nullable()->after('expires_at');
                }
                if (! Schema::hasColumn('subscriptions', 'renewal_date')) {
                    $table->timestamp('renewal_date')->nullable()->after('trial_ends_at');
                }
                if (! Schema::hasColumn('subscriptions', 'auto_renewal')) {
                    $table->boolean('auto_renewal')->default(true)->after('renewal_date');
                }
                if (! Schema::hasColumn('subscriptions', 'billing_cycle')) {
                    $table->string('billing_cycle', 20)->default('monthly')->after('auto_renewal');
                }
                if (! Schema::hasColumn('subscriptions', 'cancelled_at')) {
                    $table->timestamp('cancelled_at')->nullable()->after('billing_cycle');
                }
                if (! Schema::hasColumn('subscriptions', 'suspended_at')) {
                    $table->timestamp('suspended_at')->nullable()->after('cancelled_at');
                }
            });
        }

        Schema::create('subscription_payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('subscription_id')->constrained('subscriptions')->cascadeOnDelete();
            $table->string('invoice_number')->unique();
            $table->timestamp('payment_date')->nullable();
            $table->decimal('amount', 10, 2);
            $table->string('currency', 10)->default('INR');
            $table->string('payment_status', 20)->default('pending');
            $table->string('payment_method')->nullable();
            $table->string('transaction_reference')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index(['subscription_id', 'payment_status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('subscription_payments');
        Schema::dropIfExists('plan_limits');
        Schema::dropIfExists('plan_features');
        Schema::dropIfExists('features');

        if (Schema::hasTable('subscriptions') && ! Schema::hasTable('company_subscriptions')) {
            Schema::rename('subscriptions', 'company_subscriptions');
        }

        if (Schema::hasTable('plans') && ! Schema::hasTable('subscription_plans')) {
            Schema::table('plans', function (Blueprint $table) {
                if (Schema::hasColumn('plans', 'monthly_price')) {
                    $table->renameColumn('monthly_price', 'price_monthly');
                }
                if (Schema::hasColumn('plans', 'yearly_price')) {
                    $table->renameColumn('yearly_price', 'price_yearly');
                }
            });

            Schema::rename('plans', 'subscription_plans');
        }
    }
};
