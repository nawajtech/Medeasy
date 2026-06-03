<?php

namespace App\Models;

use App\Models\Concerns\BelongsToCompany;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class LabTestCategory extends Model
{
    use BelongsToCompany, SoftDeletes;

    protected $fillable = [
        'company_id',
        'name',
        'description',
        'sort_order',
        'is_active',
    ];

    protected function casts(): array
    {
        return ['is_active' => 'boolean'];
    }

    public function tests()
    {
        return $this->hasMany(LabTest::class, 'category_id');
    }
}
