<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('diagnostic_categories', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('description')->nullable();
            $table->integer('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();

            $table->index('company_id');
        });

        Schema::table('diagnostic_test_types', function (Blueprint $table) {
            $table->foreignId('category_id')
                ->nullable()
                ->after('company_id')
                ->constrained('diagnostic_categories')
                ->nullOnDelete();
        });

        $companyIds = DB::table('diagnostic_test_types')
            ->distinct()
            ->pluck('company_id');

        foreach ($companyIds as $companyId) {
            $categoryId = DB::table('diagnostic_categories')->insertGetId([
                'company_id' => $companyId,
                'name' => 'General',
                'description' => 'Default diagnostic category',
                'sort_order' => 0,
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            DB::table('diagnostic_test_types')
                ->where('company_id', $companyId)
                ->whereNull('category_id')
                ->update(['category_id' => $categoryId]);
        }
    }

    public function down(): void
    {
        Schema::table('diagnostic_test_types', function (Blueprint $table) {
            $table->dropForeign(['category_id']);
            $table->dropColumn('category_id');
        });

        Schema::dropIfExists('diagnostic_categories');
    }
};
