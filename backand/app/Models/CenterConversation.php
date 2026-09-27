<?php

namespace App\Models;

use App\Models\Concerns\BelongsToCompany;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CenterConversation extends Model
{
    use BelongsToCompany;

    protected $fillable = [
        'company_id',
        'patient_id',
        'last_message_at',
        'last_message_preview',
        'patient_read_message_id',
        'staff_read_message_id',
    ];

    protected function casts(): array
    {
        return [
            'last_message_at' => 'datetime',
            'patient_read_message_id' => 'integer',
            'staff_read_message_id' => 'integer',
        ];
    }

    public function patient(): BelongsTo
    {
        // Portal patients are not tied to the centre's company_id.
        return $this->belongsTo(Patient::class)->withoutGlobalScope('company');
    }

    public function messages(): HasMany
    {
        return $this->hasMany(CenterMessage::class, 'conversation_id');
    }
}
