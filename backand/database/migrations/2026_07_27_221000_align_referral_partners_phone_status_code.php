<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Align referral_partners with the app model (phone, status, referral_code).
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('referral_partners')) {
            return;
        }

        if (! Schema::hasColumn('referral_partners', 'referral_code')) {
            Schema::table('referral_partners', function (Blueprint $table) {
                $table->string('referral_code', 50)->nullable();
            });
        }

        if (Schema::hasColumn('referral_partners', 'mobile') && ! Schema::hasColumn('referral_partners', 'phone')) {
            Schema::table('referral_partners', function (Blueprint $table) {
                $table->renameColumn('mobile', 'phone');
            });
        } elseif (! Schema::hasColumn('referral_partners', 'phone')) {
            Schema::table('referral_partners', function (Blueprint $table) {
                $table->string('phone', 20)->nullable();
            });
        }

        if (Schema::hasColumn('referral_partners', 'is_active') && ! Schema::hasColumn('referral_partners', 'status')) {
            Schema::table('referral_partners', function (Blueprint $table) {
                $table->string('status', 20)->default('active');
            });

            DB::table('referral_partners')->orderBy('id')->chunkById(100, function ($rows) {
                foreach ($rows as $row) {
                    DB::table('referral_partners')
                        ->where('id', $row->id)
                        ->update([
                            'status' => (! empty($row->is_active)) ? 'active' : 'inactive',
                        ]);
                }
            });

            Schema::table('referral_partners', function (Blueprint $table) {
                $table->dropColumn('is_active');
            });
        } elseif (! Schema::hasColumn('referral_partners', 'status')) {
            Schema::table('referral_partners', function (Blueprint $table) {
                $table->string('status', 20)->default('active');
            });
        }

        try {
            Schema::table('referral_partners', function (Blueprint $table) {
                $table->unique('referral_code');
            });
        } catch (\Throwable) {
            // Unique index may already exist
        }

        $partners = DB::table('referral_partners')
            ->where(function ($q) {
                $q->whereNull('referral_code')->orWhere('referral_code', '');
            })
            ->get();

        foreach ($partners as $partner) {
            $code = $this->makeCode($partner->name ?? 'REF');
            while (DB::table('referral_partners')->where('referral_code', $code)->exists()) {
                $code = $this->makeCode($partner->name ?? 'REF');
            }
            DB::table('referral_partners')->where('id', $partner->id)->update(['referral_code' => $code]);
        }
    }

    public function down(): void
    {
        if (! Schema::hasTable('referral_partners')) {
            return;
        }

        if (Schema::hasColumn('referral_partners', 'status') && ! Schema::hasColumn('referral_partners', 'is_active')) {
            Schema::table('referral_partners', function (Blueprint $table) {
                $table->boolean('is_active')->default(true);
            });

            DB::table('referral_partners')->orderBy('id')->chunkById(100, function ($rows) {
                foreach ($rows as $row) {
                    DB::table('referral_partners')
                        ->where('id', $row->id)
                        ->update([
                            'is_active' => ($row->status ?? 'active') === 'active',
                        ]);
                }
            });

            Schema::table('referral_partners', function (Blueprint $table) {
                $table->dropColumn('status');
            });
        }

        if (Schema::hasColumn('referral_partners', 'phone') && ! Schema::hasColumn('referral_partners', 'mobile')) {
            Schema::table('referral_partners', function (Blueprint $table) {
                $table->renameColumn('phone', 'mobile');
            });
        }

        if (Schema::hasColumn('referral_partners', 'referral_code')) {
            Schema::table('referral_partners', function (Blueprint $table) {
                try {
                    $table->dropUnique(['referral_code']);
                } catch (\Throwable) {
                    // ignore
                }
                $table->dropColumn('referral_code');
            });
        }
    }

    private function makeCode(string $name): string
    {
        $slug = strtoupper(preg_replace('/[^A-Za-z0-9]/', '', $name) ?: 'REF');
        $prefix = substr($slug, 0, 4) ?: 'REF';

        return $prefix.str_pad((string) random_int(1, 9999), 4, '0', STR_PAD_LEFT);
    }
};
