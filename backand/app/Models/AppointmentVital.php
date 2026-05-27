<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AppointmentVital extends Model
{
    protected $fillable = [
        'appointment_id',
        'blood_pressure',
        'heart_rate',
        'body_temperature',
        'oxygen_saturation',
        'respiratory_rate',
        'blood_sugar',
    ];

    protected function casts(): array
    {
        return [
            'heart_rate' => 'integer',
            'body_temperature' => 'decimal:1',
            'oxygen_saturation' => 'decimal:2',
            'respiratory_rate' => 'integer',
            'blood_sugar' => 'decimal:2',
        ];
    }

    public function appointment()
    {
        return $this->belongsTo(Appointment::class);
    }
}
