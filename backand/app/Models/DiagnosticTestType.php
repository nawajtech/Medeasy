<?php

namespace App\Models;

use App\Models\Concerns\BelongsToCompany;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class DiagnosticTestType extends Model
{
    use BelongsToCompany, SoftDeletes;

    protected $fillable = [
        'company_id',
        'category_id',
        'name',
        'code',
        'modality',
        'description',
        'preparation_instructions',
        'price',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'price' => 'decimal:2',
            'is_active' => 'boolean',
        ];
    }

    public function category()
    {
        return $this->belongsTo(DiagnosticCategory::class, 'category_id');
    }

    public function orders()
    {
        return $this->hasMany(DiagnosticOrder::class, 'test_type_id');
    }
}
