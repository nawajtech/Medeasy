<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    private const KEY_MAP = [
        'clinic_name' => 'organisation_name',
        'clinic_email' => 'organisation_email',
        'clinic_phone' => 'organisation_phone',
        'clinic_address' => 'organisation_address',
        'clinic_website' => 'organisation_website',
        'clinic_division' => 'organisation_division',
    ];

    public function up(): void
    {
        foreach (self::KEY_MAP as $old => $new) {
            $legacyRows = DB::table('settings')->where('key', $old)->get();

            foreach ($legacyRows as $row) {
                $existing = DB::table('settings')
                    ->where('company_id', $row->company_id)
                    ->where('key', $new)
                    ->first();

                if ($existing) {
                    if (blank($existing->value) && filled($row->value)) {
                        DB::table('settings')
                            ->where('id', $existing->id)
                            ->update(['value' => $row->value]);
                    }
                    DB::table('settings')->where('id', $row->id)->delete();
                } else {
                    DB::table('settings')
                        ->where('id', $row->id)
                        ->update(['key' => $new]);
                }
            }
        }
    }

    public function down(): void
    {
        foreach (self::KEY_MAP as $old => $new) {
            $rows = DB::table('settings')->where('key', $new)->get();

            foreach ($rows as $row) {
                $existing = DB::table('settings')
                    ->where('company_id', $row->company_id)
                    ->where('key', $old)
                    ->first();

                if ($existing) {
                    if (blank($existing->value) && filled($row->value)) {
                        DB::table('settings')
                            ->where('id', $existing->id)
                            ->update(['value' => $row->value]);
                    }
                    DB::table('settings')->where('id', $row->id)->delete();
                } else {
                    DB::table('settings')
                        ->where('id', $row->id)
                        ->update(['key' => $old]);
                }
            }
        }
    }
};
