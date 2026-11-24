<?php

namespace App\Models;

use App\Models\Concerns\BelongsToCompany;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class CenterConversation extends Model
{
    use BelongsToCompany, SoftDeletes;

    protected $fillable = [
        'company_id',
        'partner_id',
        'last_message_at',
        'last_message_preview',
        'partner_read_message_id',
        'staff_read_message_id',
    ];

    protected function casts(): array
    {
        return [
            'last_message_at' => 'datetime',
            'partner_read_message_id' => 'integer',
            'staff_read_message_id' => 'integer',
        ];
    }

    public function partner(): BelongsTo
    {
        return $this->belongsTo(Partner::class)->withTrashed();
    }

    public function messages(): HasMany
    {
        return $this->hasMany(CenterMessage::class, 'conversation_id');
    }
}
