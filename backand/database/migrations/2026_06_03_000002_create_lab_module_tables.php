<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Test categories (Haematology, Biochemistry, Microbiology…)
        Schema::create('lab_test_categories', function (Blueprint $table) {
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

        // Individual tests
        Schema::create('lab_tests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->foreignId('category_id')->constrained('lab_test_categories')->cascadeOnDelete();
            $table->string('name');
            $table->string('code')->nullable();
            $table->string('sample_type')->default('blood'); // blood|urine|stool|swab|sputum|other
            $table->decimal('price', 10, 2)->default(0);
            $table->integer('turnaround_hours')->default(24);
            $table->string('unit')->nullable();             // mg/dL, g/dL, etc.
            $table->string('ref_range_male')->nullable();
            $table->string('ref_range_female')->nullable();
            $table->string('ref_range_child')->nullable();
            $table->string('method')->nullable();           // ELISA, PCR, etc.
            $table->text('description')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();

            $table->index(['company_id', 'category_id']);
        });

        // Test packages (bundles)
        Schema::create('lab_test_packages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('code')->nullable();
            $table->text('description')->nullable();
            $table->decimal('price', 10, 2)->default(0);
            $table->integer('turnaround_hours')->default(24);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();

            $table->index('company_id');
        });

        // Package ↔ Test pivot
        Schema::create('lab_package_tests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('package_id')->constrained('lab_test_packages')->cascadeOnDelete();
            $table->foreignId('test_id')->constrained('lab_tests')->cascadeOnDelete();

            $table->unique(['package_id', 'test_id']);
        });

        // Lab orders (one per patient visit)
        Schema::create('lab_orders', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->foreignId('patient_id')->constrained()->cascadeOnDelete();
            $table->foreignId('doctor_id')->nullable()->constrained()->nullOnDelete();
            $table->string('order_number')->unique();
            // pending → collected → processing → resulted → verified → approved | cancelled
            $table->string('status')->default('pending');
            $table->string('collection_type')->default('walk_in'); // walk_in|home
            $table->string('home_address')->nullable();
            $table->timestamp('collection_scheduled_at')->nullable();
            $table->decimal('gross_amount', 10, 2)->default(0);
            $table->decimal('discount', 10, 2)->default(0);
            $table->decimal('net_amount', 10, 2)->default(0);
            $table->text('notes')->nullable();
            $table->timestamp('ordered_at')->useCurrent();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['company_id', 'status']);
            $table->index(['company_id', 'patient_id']);
        });

        // Line items — each test or package in an order
        Schema::create('lab_order_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained('lab_orders')->cascadeOnDelete();
            $table->foreignId('test_id')->nullable()->constrained('lab_tests')->nullOnDelete();
            $table->foreignId('package_id')->nullable()->constrained('lab_test_packages')->nullOnDelete();
            $table->decimal('price', 10, 2)->default(0);
            $table->timestamps();
        });

        // Physical sample tracking
        Schema::create('lab_samples', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained('lab_orders')->cascadeOnDelete();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->string('sample_id')->unique();         // e.g. SMP-20260603-A1B2
            $table->string('sample_type');                 // blood|urine|stool|swab|sputum|other
            $table->string('status')->default('pending');  // pending|collected|rejected
            $table->string('collection_method')->default('walk_in');
            $table->foreignId('collected_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('collected_at')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index(['company_id', 'status']);
        });

        // Test results (one per test in the order)
        Schema::create('lab_results', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained('lab_orders')->cascadeOnDelete();
            $table->foreignId('order_item_id')->constrained('lab_order_items')->cascadeOnDelete();
            $table->foreignId('test_id')->constrained('lab_tests')->cascadeOnDelete();
            $table->string('value')->nullable();
            $table->string('unit')->nullable();
            $table->string('ref_range')->nullable();
            $table->string('flag')->nullable();            // normal|high|low|critical
            $table->text('notes')->nullable();
            $table->foreignId('entered_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('verified_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('verified_at')->nullable();
            $table->timestamps();

            $table->unique(['order_item_id', 'test_id']);
            $table->index('order_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('lab_results');
        Schema::dropIfExists('lab_samples');
        Schema::dropIfExists('lab_order_items');
        Schema::dropIfExists('lab_orders');
        Schema::dropIfExists('lab_package_tests');
        Schema::dropIfExists('lab_test_packages');
        Schema::dropIfExists('lab_tests');
        Schema::dropIfExists('lab_test_categories');
    }
};
