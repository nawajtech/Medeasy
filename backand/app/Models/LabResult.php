<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LabResult extends Model
{
    protected $fillable = [
        'order_id',
        'order_item_id',
        'test_id',
        'value',
        'unit',
        'ref_range',
        'flag',
        'notes',
        'entered_by',
        'verified_by',
        'verified_at',
    ];

    protected function casts(): array
    {
        return ['verified_at' => 'datetime'];
    }

    public function order()
    {
        return $this->belongsTo(LabOrder::class, 'order_id');
    }

    public function orderItem()
    {
        return $this->belongsTo(LabOrderItem::class, 'order_item_id');
    }

    public function test()
    {
        return $this->belongsTo(LabTest::class, 'test_id');
    }

    public function enteredBy()
    {
        return $this->belongsTo(User::class, 'entered_by');
    }

    public function verifiedBy()
    {
        return $this->belongsTo(User::class, 'verified_by');
    }
}
