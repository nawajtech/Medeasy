<?php

namespace App\Services;

use App\Models\LabOrder;
use App\Models\LabOrderItem;
use App\Models\LabResult;
use App\Models\LabSample;
use App\Models\LabTest;
use App\Models\LabTestPackage;
use Illuminate\Support\Str;

class LabOrderService
{
    public function createOrder(array $data, array $items): LabOrder
    {
        $order = LabOrder::create([
            'company_id'   => $data['company_id'],
            'branch_id'    => $data['branch_id'] ?? null,
            'patient_id'   => $data['patient_id'],
            'doctor_id'    => $data['doctor_id'] ?? null,
            'order_number' => $this->generateOrderNumber($data['company_id']),
            'status'       => 'pending',
            'collection_type'           => $data['collection_type'] ?? 'walk_in',
            'home_address'              => $data['home_address'] ?? null,
            'collection_scheduled_at'   => $data['collection_scheduled_at'] ?? null,
            'notes'        => $data['notes'] ?? null,
            'gross_amount' => 0,
            'discount'     => $data['discount'] ?? 0,
            'net_amount'   => 0,
        ]);

        $gross = 0;

        foreach ($items as $item) {
            $price = 0;

            if (! empty($item['test_id'])) {
                $test = LabTest::findOrFail($item['test_id']);
                $price = $test->price;
                LabOrderItem::create([
                    'order_id' => $order->id,
                    'test_id'  => $test->id,
                    'price'    => $price,
                ]);
            } elseif (! empty($item['package_id'])) {
                $pkg = LabTestPackage::findOrFail($item['package_id']);
                $price = $pkg->price;
                LabOrderItem::create([
                    'order_id'   => $order->id,
                    'package_id' => $pkg->id,
                    'price'      => $price,
                ]);
            }

            $gross += $price;
        }

        $net = max(0, $gross - (float) $order->discount);
        $order->update(['gross_amount' => $gross, 'net_amount' => $net]);

        return $order->fresh(['items.test', 'items.package', 'patient', 'doctor.user']);
    }

    public function collectSample(LabOrder $order, array $data, int $userId): LabSample
    {
        $sample = LabSample::create([
            'order_id'          => $order->id,
            'company_id'        => $order->company_id,
            'sample_id'         => $this->generateSampleId(),
            'sample_type'       => $data['sample_type'],
            'status'            => 'collected',
            'collection_method' => $data['collection_method'] ?? $order->collection_type,
            'collected_by'      => $userId,
            'collected_at'      => now(),
            'notes'             => $data['notes'] ?? null,
        ]);

        $order->update(['status' => 'collected']);

        return $sample;
    }

    public function enterResults(LabOrder $order, array $results, int $userId): void
    {
        foreach ($results as $r) {
            $item = LabOrderItem::findOrFail($r['order_item_id']);

            $testId = $r['test_id'] ?? $item->test_id;
            if (! $testId) {
                continue;
            }

            LabResult::updateOrCreate(
                ['order_item_id' => $item->id, 'test_id' => $testId],
                [
                    'order_id'   => $order->id,
                    'value'      => $r['value'] ?? null,
                    'unit'       => $r['unit'] ?? null,
                    'ref_range'  => $r['ref_range'] ?? null,
                    'flag'       => $r['flag'] ?? 'normal',
                    'notes'      => $r['notes'] ?? null,
                    'entered_by' => $userId,
                ]
            );
        }

        $order->update(['status' => 'resulted']);
    }

    public function verifyOrder(LabOrder $order, int $userId): void
    {
        $order->results()->update([
            'verified_by' => $userId,
            'verified_at' => now(),
        ]);

        $order->update(['status' => 'verified']);
    }

    public function approveOrder(LabOrder $order): void
    {
        $order->update(['status' => 'approved']);
    }

    private function generateOrderNumber(int $companyId): string
    {
        $date = now()->format('Ymd');
        $prefix = "LAB-{$date}-";

        $last = LabOrder::withoutGlobalScopes()
            ->where('order_number', 'like', $prefix.'%')
            ->where('company_id', $companyId)
            ->orderByDesc('id')
            ->value('order_number');

        $seq = $last ? ((int) substr($last, -4) + 1) : 1;

        return $prefix.str_pad($seq, 4, '0', STR_PAD_LEFT);
    }

    private function generateSampleId(): string
    {
        $date = now()->format('Ymd');

        return 'SMP-'.$date.'-'.strtoupper(Str::random(4));
    }
}
