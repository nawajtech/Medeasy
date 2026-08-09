<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('diagnostic_orders', function (Blueprint $table) {
            $table->string('share_token', 32)->nullable()->unique()->after('order_number');
        });

        DB::table('diagnostic_orders')
            ->whereNull('share_token')
            ->orderBy('id')
            ->select('id')
            ->chunkById(200, function ($rows) {
                foreach ($rows as $row) {
                    DB::table('diagnostic_orders')
                        ->where('id', $row->id)
                        ->update(['share_token' => Str::lower(Str::random(24))]);
                }
            });
    }

    public function down(): void
    {
        Schema::table('diagnostic_orders', function (Blueprint $table) {
            $table->dropUnique(['share_token']);
            $table->dropColumn('share_token');
        });
    }
};
