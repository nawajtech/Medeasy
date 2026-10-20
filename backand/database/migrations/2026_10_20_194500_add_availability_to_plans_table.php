<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('plans', function (Blueprint $table) {
            if (! Schema::hasColumn('plans', 'availability')) {
                $table->string('availability', 32)->default('available')->after('status');
            }
            if (! Schema::hasColumn('plans', 'availability_note')) {
                $table->string('availability_note', 255)->nullable()->after('availability');
            }
        });

        // AI Gold and similar future plans: visible, not purchasable yet.
        if (Schema::hasColumn('plans', 'availability')) {
            DB::table('plans')
                ->where('code', 'ai_gold')
                ->update([
                    'availability' => 'coming_soon',
                    'availability_note' => 'AI-powered features are planned for a future release. We are actively working on this.',
                ]);
        }
    }

    public function down(): void
    {
        Schema::table('plans', function (Blueprint $table) {
            if (Schema::hasColumn('plans', 'availability_note')) {
                $table->dropColumn('availability_note');
            }
            if (Schema::hasColumn('plans', 'availability')) {
                $table->dropColumn('availability');
            }
        });
    }
};
