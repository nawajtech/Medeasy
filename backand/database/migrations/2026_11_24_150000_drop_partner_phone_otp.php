<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::dropIfExists('partner_otps');

        if (Schema::hasColumn('partners', 'phone_verified_at')) {
            Schema::table('partners', function (Blueprint $table) {
                $table->dropColumn('phone_verified_at');
            });
        }
    }

    public function down(): void
    {
        Schema::table('partners', function (Blueprint $table) {
            $table->timestamp('phone_verified_at')->nullable()->after('professional_details');
        });

        Schema::create('partner_otps', function (Blueprint $table) {
            $table->id();
            $table->string('phone', 20);
            $table->string('purpose', 40)->default('register');
            $table->string('code_hash');
            $table->unsignedTinyInteger('attempts')->default(0);
            $table->timestamp('expires_at');
            $table->timestamp('verified_at')->nullable();
            $table->timestamps();

            $table->index('phone');
        });
    }
};
