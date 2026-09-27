<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('patients') || Schema::hasColumn('patients', 'original_password')) {
            return;
        }

        Schema::table('patients', function (Blueprint $table) {
            $table->string('original_password')->nullable()->after('password');
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('patients') || ! Schema::hasColumn('patients', 'original_password')) {
            return;
        }

        Schema::table('patients', function (Blueprint $table) {
            $table->dropColumn('original_password');
        });
    }
};
