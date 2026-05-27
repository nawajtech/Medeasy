<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('patients', 'user_id')) {
            return;
        }

        Schema::table('patients', function (Blueprint $table) {
            $table->string('name')->nullable()->after('patient_code');
            $table->string('email')->nullable()->after('name');
            $table->string('phone')->nullable()->after('email');
            $table->string('password')->nullable()->after('phone');
            $table->boolean('status')->default(true)->after('password');
        });

        $patients = DB::table('patients')->whereNotNull('user_id')->get();

        foreach ($patients as $patient) {
            $user = DB::table('users')->where('id', $patient->user_id)->first();

            if ($user) {
                DB::table('patients')->where('id', $patient->id)->update([
                    'name' => $user->name,
                    'email' => $user->email,
                    'phone' => $user->phone,
                    'password' => $user->password,
                    'status' => $user->status ?? true,
                ]);
            }
        }

        Schema::table('patients', function (Blueprint $table) {
            $table->dropForeign(['user_id']);
            $table->dropColumn('user_id');
        });

        Schema::table('patients', function (Blueprint $table) {
            $table->string('name')->nullable(false)->change();
            $table->string('email')->nullable(false)->unique()->change();
            $table->string('password')->nullable(false)->change();
        });
    }

    public function down(): void
    {
        if (Schema::hasColumn('patients', 'user_id')) {
            return;
        }

        Schema::table('patients', function (Blueprint $table) {
            $table->foreignId('user_id')->nullable()->after('id')->constrained()->onDelete('cascade');
        });

        Schema::table('patients', function (Blueprint $table) {
            $table->dropColumn(['name', 'email', 'phone', 'password', 'status']);
        });
    }
};
