<?php

namespace App\Models;

use App\Models\Concerns\BelongsToCompany;
use Illuminate\Database\Eloquent\Model;

class DiagnosticReport extends Model
{
    use BelongsToCompany;

    protected $fillable = [
        'order_id',
        'company_id',
        'file_path',
        'file_name',
        'file_type',
        'findings',
        'impression',
        'recommendations',
        'reported_by',
        'approved_by',
        'approved_at',
    ];

    protected function casts(): array
    {
        return ['approved_at' => 'datetime'];
    }

    public function order()
    {
        return $this->belongsTo(DiagnosticOrder::class, 'order_id');
    }

    public function reporter()
    {
        return $this->belongsTo(User::class, 'reported_by');
    }

    public function approver()
    {
        return $this->belongsTo(User::class, 'approved_by');
    }
}
