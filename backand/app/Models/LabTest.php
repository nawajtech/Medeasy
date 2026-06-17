<?php

namespace App\Models;

use App\Models\Concerns\BelongsToCompany;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class LabTest extends Model
{
    use BelongsToCompany, SoftDeletes;

    protected $fillable = [
        'company_id',
        'category_id',
        'name',
        'code',
        'sample_type',
        'price',
        'turnaround_hours',
        'unit',
        'ref_range_male',
        'ref_range_female',
        'ref_range_child',
        'method',
        'description',
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
        return $this->belongsTo(LabTestCategory::class, 'category_id');
    }

    public function packages()
    {
        return $this->belongsToMany(LabTestPackage::class, 'lab_package_tests', 'test_id', 'package_id');
    }
}
