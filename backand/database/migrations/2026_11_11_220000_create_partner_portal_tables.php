<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('partners')) {
            Schema::create('partners', function (Blueprint $table) {
                $table->id();
                $table->string('name');
                $table->enum('type', ['doctor', 'clinic', 'hospital', 'agent'])->default('doctor');
                $table->string('phone', 20)->unique();
                $table->string('email')->unique();
                $table->string('password');
                $table->text('address')->nullable();
                $table->string('city', 100)->nullable();
                $table->string('state', 100)->nullable();
                $table->text('professional_details')->nullable();
                $table->timestamp('phone_verified_at')->nullable();
                $table->boolean('status')->default(true);
                $table->rememberToken();
                $table->timestamps();
                $table->softDeletes();
            });
        }

        if (! Schema::hasTable('partner_otps')) {
            Schema::create('partner_otps', function (Blueprint $table) {
                $table->id();
                $table->string('phone', 20)->index();
                $table->string('purpose', 40)->default('register');
                $table->string('code_hash');
                $table->unsignedTinyInteger('attempts')->default(0);
                $table->timestamp('expires_at');
                $table->timestamp('verified_at')->nullable();
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('partner_centre_requests')) {
            Schema::create('partner_centre_requests', function (Blueprint $table) {
                $table->id();
                $table->foreignId('partner_id')->constrained('partners')->cascadeOnDelete();
                $table->foreignId('company_id')->constrained('companies')->cascadeOnDelete();
                $table->text('message')->nullable();
                $table->string('status', 20)->default('pending');
                $table->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamp('reviewed_at')->nullable();
                $table->text('review_notes')->nullable();
                $table->foreignId('referral_partner_id')->nullable()->constrained('referral_partners')->nullOnDelete();
                $table->timestamps();

                $table->index(['company_id', 'status']);
                $table->index(['partner_id', 'status']);
                $table->index(['partner_id', 'company_id']);
            });
        }

        if (Schema::hasTable('referral_partners') && ! Schema::hasColumn('referral_partners', 'partner_account_id')) {
            Schema::table('referral_partners', function (Blueprint $table) {
                $table->foreignId('partner_account_id')->nullable()->after('company_id')
                    ->constrained('partners')->nullOnDelete();
                $table->index(['partner_account_id', 'status']);
            });
        }

        if (Schema::hasTable('companies') && ! Schema::hasColumn('companies', 'partner_discovery_enabled')) {
            Schema::table('companies', function (Blueprint $table) {
                $table->boolean('partner_discovery_enabled')->default(true)->after('is_active');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('companies') && Schema::hasColumn('companies', 'partner_discovery_enabled')) {
            Schema::table('companies', function (Blueprint $table) {
                $table->dropColumn('partner_discovery_enabled');
            });
        }

        if (Schema::hasTable('referral_partners') && Schema::hasColumn('referral_partners', 'partner_account_id')) {
            Schema::table('referral_partners', function (Blueprint $table) {
                $table->dropConstrainedForeignId('partner_account_id');
            });
        }

        Schema::dropIfExists('partner_centre_requests');
        Schema::dropIfExists('partner_otps');
        Schema::dropIfExists('partners');
    }
};
