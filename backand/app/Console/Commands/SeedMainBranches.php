<?php

namespace App\Console\Commands;

use App\Models\Branch;
use App\Models\Company;
use Illuminate\Console\Command;

class SeedMainBranches extends Command
{
    protected $signature   = 'medeasy:seed-main-branches';
    protected $description = 'Create a default Main Branch for every company that does not already have one';

    public function handle(): int
    {
        $companies = Company::all();
        $created = 0;

        foreach ($companies as $company) {
            $alreadyHasMain = Branch::where('company_id', $company->id)
                ->where('is_main', true)
                ->exists();

            if ($alreadyHasMain) {
                $this->line("  skip  {$company->name} (already has a main branch)");
                continue;
            }

            Branch::create([
                'company_id' => $company->id,
                'name'       => $company->name . ' — Main Branch',
                'code'       => 'MAIN',
                'address'    => $company->address ?? null,
                'city'       => $company->city ?? null,
                'phone'      => $company->phone ?? null,
                'email'      => $company->email ?? null,
                'is_main'    => true,
                'is_active'  => true,
            ]);

            $this->info("  created  {$company->name}");
            $created++;
        }

        $this->info("\nDone — {$created} main branch(es) created.");

        return self::SUCCESS;
    }
}
