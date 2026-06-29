<?php

namespace App\Models;

use App\Models\Concerns\BelongsToCompany;
use Illuminate\Database\Eloquent\Model;

class Expense extends Model
{
    use BelongsToCompany;

    public const CATEGORIES = [
        'salary',
        'rent',
        'utilities',
        'supplies',
        'equipment',
        'marketing',
        'maintenance',
        'other',
    ];

    protected $fillable = [
        'company_id',
        'branch_id',
        'category',
        'description',
        'amount',
        'expense_date',
        'payment_method',
        'notes',
        'recorded_by',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'expense_date' => 'date',
        ];
    }

    public function recorder()
    {
        return $this->belongsTo(User::class, 'recorded_by');
    }

    public function branch()
    {
        return $this->belongsTo(Branch::class);
    }
}
