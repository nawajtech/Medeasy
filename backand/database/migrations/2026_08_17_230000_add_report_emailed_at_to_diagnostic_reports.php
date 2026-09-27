<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('diagnostic_reports', function (Blueprint $table) {
            if (! Schema::hasColumn('diagnostic_reports', 'report_emailed_at')) {
                $table->timestamp('report_emailed_at')->nullable()->after('approved_at');
            }
        });
    }

    public function down(): void
    {
        Schema::table('diagnostic_reports', function (Blueprint $table) {
            if (Schema::hasColumn('diagnostic_reports', 'report_emailed_at')) {
                $table->dropColumn('report_emailed_at');
            }
        });
    }
};
