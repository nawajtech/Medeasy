<?php

namespace App\Models;

use App\Models\Concerns\BelongsToCompany;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Collection;

class DiagnosticPackage extends Model
{
    use BelongsToCompany, SoftDeletes;

    protected $table = 'diago_package';

    protected $fillable = [
        'company_id',
        'package_name',
        'test_ids',
        'description',
        'offer_percentage',
        'is_active',
    ];

    protected $appends = [
        'list_price',
        'package_price',
        'savings',
    ];

    protected function casts(): array
    {
        return [
            'test_ids' => 'array',
            'offer_percentage' => 'decimal:2',
            'is_active' => 'boolean',
        ];
    }

    public function resolveTests(): Collection
    {
        $ids = array_values(array_filter($this->test_ids ?? []));

        if (! $ids) {
            return collect();
        }

        return DiagnosticTestType::with('category')
            ->whereIn('id', $ids)
            ->orderBy('name')
            ->get();
    }

    protected function listPrice(): Attribute
    {
        return Attribute::get(function () {
            $tests = $this->relationLoaded('tests')
                ? $this->getRelation('tests')
                : $this->resolveTests();

            return round((float) $tests->sum('price'), 2);
        });
    }

    protected function packagePrice(): Attribute
    {
        return Attribute::get(function () {
            $listPrice = (float) $this->list_price;
            $discount = $listPrice * ((float) $this->offer_percentage / 100);

            return round(max(0, $listPrice - $discount), 2);
        });
    }

    protected function savings(): Attribute
    {
        return Attribute::get(function () {
            return round((float) $this->list_price - (float) $this->package_price, 2);
        });
    }

    public function discountForTestPrice(float $testPrice): float
    {
        return round((float) $testPrice * ((float) $this->offer_percentage / 100), 2);
    }

    public function discountedPriceForTest(float $testPrice): float
    {
        return round(max(0, (float) $testPrice - $this->discountForTestPrice($testPrice)), 2);
    }
}
