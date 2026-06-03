<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LabOrderItem extends Model
{
    protected $fillable = [
        'order_id',
        'test_id',
        'package_id',
        'price',
    ];

    protected function casts(): array
    {
        return ['price' => 'decimal:2'];
    }

    public function order()
    {
        return $this->belongsTo(LabOrder::class, 'order_id');
    }

    public function test()
    {
        return $this->belongsTo(LabTest::class, 'test_id');
    }

    public function package()
    {
        return $this->belongsTo(LabTestPackage::class, 'package_id');
    }

    public function result()
    {
        return $this->hasOne(LabResult::class, 'order_item_id');
    }
}
