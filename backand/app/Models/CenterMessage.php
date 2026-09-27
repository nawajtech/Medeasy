<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CenterMessage extends Model
{
    public const UPDATED_AT = null;

    public const TYPE_PATIENT = 'patient';

    public const TYPE_STAFF = 'staff';

    public const TYPE_SYSTEM = 'system';

    protected $fillable = [
        'conversation_id',
        'sender_type',
        'sender_user_id',
        'body',
    ];

    public function conversation(): BelongsTo
    {
        return $this->belongsTo(CenterConversation::class, 'conversation_id');
    }

    public function sender(): BelongsTo
    {
        return $this->belongsTo(User::class, 'sender_user_id');
    }
}
