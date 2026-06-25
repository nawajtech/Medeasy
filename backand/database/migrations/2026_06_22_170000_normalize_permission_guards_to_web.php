<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $guard = 'web';

        DB::table('roles')->where('guard_name', '!=', $guard)->update(['guard_name' => $guard]);
        DB::table('permissions')->where('guard_name', '!=', $guard)->update(['guard_name' => $guard]);
    }

    public function down(): void
    {
        // Guard normalization is not reversed.
    }
};
