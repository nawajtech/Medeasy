<?php

namespace App\Models;

use App\Models\Concerns\BelongsToCompany;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class LabTestPackage extends Model
{
    use BelongsToCompany, SoftDeletes;

    protected $fillable = [
        'company_id',
        'name',
        'code',
        'description',
        'price',
        'turnaround_hours',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'price' => 'decimal:2',
            'is_active' => 'boolean',
        ];
    }

    public function tests()
    {
        return $this->belongsToMany(LabTest::class, 'lab_package_tests', 'package_id', 'test_id');
    }
}
