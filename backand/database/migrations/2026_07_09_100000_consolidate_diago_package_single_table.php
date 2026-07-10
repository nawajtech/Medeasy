<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $rows = [];

        if (Schema::hasTable('diagnostic_packages')) {
            $packages = DB::table('diagnostic_packages')->get();

            foreach ($packages as $package) {
                $testIds = [];

                if (Schema::hasTable('diago_package')) {
                    $testIds = DB::table('diago_package')
                        ->where('package_id', $package->id)
                        ->orderBy('id')
                        ->pluck('test_id')
                        ->map(fn ($id) => (int) $id)
                        ->values()
                        ->all();
                }

                $rows[] = [
                    'id' => $package->id,
                    'company_id' => $package->company_id,
                    'package_code' => $package->package_code,
                    'test_ids' => json_encode($testIds),
                    'description' => $package->description,
                    'offer_percentage' => $package->offer_percentage,
                    'is_active' => $package->is_active,
                    'created_at' => $package->created_at,
                    'updated_at' => $package->updated_at,
                    'deleted_at' => $package->deleted_at,
                ];
            }
        }

        Schema::dropIfExists('diago_package');
        Schema::dropIfExists('diagnostic_packages');

        Schema::create('diago_package', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->string('package_code', 50);
            $table->json('test_ids');
            $table->text('description')->nullable();
            $table->decimal('offer_percentage', 5, 2)->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['company_id', 'package_code']);
            $table->index('company_id');
        });

        if ($rows) {
            DB::table('diago_package')->insert($rows);
            $this->syncTableSequence('diago_package');
        }
    }

    public function down(): void
    {
        $rows = DB::table('diago_package')->get();

        Schema::dropIfExists('diago_package');

        Schema::create('diagnostic_packages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->string('package_code', 50);
            $table->string('name');
            $table->text('description')->nullable();
            $table->decimal('offer_percentage', 5, 2)->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['company_id', 'package_code']);
            $table->index('company_id');
        });

        Schema::create('diago_package', function (Blueprint $table) {
            $table->id();
            $table->foreignId('package_id')->constrained('diagnostic_packages')->cascadeOnDelete();
            $table->foreignId('test_id')->constrained('diagnostic_test_types')->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['package_id', 'test_id']);
        });

        foreach ($rows as $row) {
            $packageId = DB::table('diagnostic_packages')->insertGetId([
                'company_id' => $row->company_id,
                'package_code' => $row->package_code,
                'name' => $row->package_code,
                'description' => $row->description,
                'offer_percentage' => $row->offer_percentage,
                'is_active' => $row->is_active,
                'created_at' => $row->created_at,
                'updated_at' => $row->updated_at,
                'deleted_at' => $row->deleted_at,
            ]);

            $testIds = json_decode($row->test_ids, true) ?: [];

            foreach ($testIds as $testId) {
                DB::table('diago_package')->insert([
                    'package_id' => $packageId,
                    'test_id' => $testId,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        }
    }

    private function syncTableSequence(string $table): void
    {
        $driver = Schema::getConnection()->getDriverName();

        if ($driver === 'pgsql') {
            DB::statement(
                "SELECT setval(pg_get_serial_sequence('{$table}', 'id'), COALESCE((SELECT MAX(id) FROM {$table}), 1))"
            );

            return;
        }

        if ($driver === 'mysql') {
            $nextId = (int) DB::table($table)->max('id') + 1;
            DB::statement("ALTER TABLE {$table} AUTO_INCREMENT = {$nextId}");
        }
    }
};
