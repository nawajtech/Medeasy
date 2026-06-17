<?php

namespace App\Models;

use App\Models\Concerns\BelongsToCompany;
use Illuminate\Database\Eloquent\Model;

class LabSample extends Model
{
    use BelongsToCompany;

    protected $fillable = [
        'order_id',
        'company_id',
        'sample_id',
        'sample_type',
        'status',
        'collection_method',
        'collected_by',
        'collected_at',
        'notes',
    ];

    protected function casts(): array
    {
        return ['collected_at' => 'datetime'];
    }

    public function order()
    {
        return $this->belongsTo(LabOrder::class, 'order_id');
    }

    public function collector()
    {
        return $this->belongsTo(User::class, 'collected_by');
    }
}
