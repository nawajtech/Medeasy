<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Modality types: xray, ct, mri, ultrasound, ecg, echo, mammography, etc.
        Schema::create('diagnostic_test_types', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('code')->nullable();
            $table->string('modality'); // xray|ct|mri|ultrasound|ecg|echo|other
            $table->text('description')->nullable();
            $table->text('preparation_instructions')->nullable();
            $table->decimal('price', 10, 2)->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();

            $table->index(['company_id', 'modality']);
        });

        // Diagnostic orders
        Schema::create('diagnostic_orders', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->foreignId('patient_id')->constrained()->cascadeOnDelete();
            $table->foreignId('doctor_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('test_type_id')->constrained('diagnostic_test_types');
            $table->string('order_number')->unique();
            // booked → scheduled → in_progress → completed | cancelled
            $table->string('status')->default('booked');
            $table->foreignId('technician_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('scheduled_at')->nullable();
            $table->decimal('amount', 10, 2)->default(0);
            $table->string('priority')->default('routine'); // routine|urgent|emergency
            $table->text('clinical_notes')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['company_id', 'status']);
            $table->index(['company_id', 'patient_id']);
        });

        // Uploaded diagnostic reports + radiologist review
        Schema::create('diagnostic_reports', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained('diagnostic_orders')->cascadeOnDelete();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->string('file_path')->nullable();
            $table->string('file_name')->nullable();
            $table->string('file_type')->nullable();       // pdf|jpg|dcm|etc.
            $table->text('findings')->nullable();
            $table->text('impression')->nullable();
            $table->text('recommendations')->nullable();
            $table->foreignId('reported_by')->nullable()->constrained('users')->nullOnDelete(); // radiologist/doctor
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('approved_at')->nullable();
            $table->timestamps();

            $table->index('order_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('diagnostic_reports');
        Schema::dropIfExists('diagnostic_orders');
        Schema::dropIfExists('diagnostic_test_types');
    }
};
