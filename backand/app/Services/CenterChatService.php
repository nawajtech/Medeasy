<?php

namespace App\Services;

use App\Models\CenterChatPresence;
use App\Models\CenterConversation;
use App\Models\CenterMessage;
use App\Models\Company;
use App\Models\Patient;
use App\Models\User;
use App\Support\MediaStorage;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class CenterChatService
{
    public const WELCOME = 'Hi! Thanks for choosing ApnaMedi. Mr. Sarif will connect with you shortly.';

    public const ONLINE_SECONDS = 45;

    public function isDiagnosticCentre(Company $company): bool
    {
        return $company->hasModule(Company::MODULE_DIAGNOSTICS)
            || in_array($company->type, ['diagnostic_center', 'hospital', 'multi'], true);
    }

    public function resolveCentre(int $companyId): Company
    {
        $company = Company::query()
            ->where('id', $companyId)
            ->where('is_active', true)
            ->first();

        abort_unless($company && $this->isDiagnosticCentre($company), 404, 'Diagnostic centre not found.');

        return $company;
    }

    public function openForPatient(Patient $patient, Company $company): CenterConversation
    {
        $existing = CenterConversation::query()
            ->where('company_id', $company->id)
            ->where('patient_id', $patient->id)
            ->first();

        if ($existing) {
            return $existing->load(['company:id,name', 'patient:id,name']);
        }

        try {
            return DB::transaction(function () use ($patient, $company) {
                $conversation = CenterConversation::create([
                    'company_id' => $company->id,
                    'patient_id' => $patient->id,
                    'last_message_at' => now(),
                    'last_message_preview' => Str::limit(self::WELCOME, 180, ''),
                ]);

                $message = $conversation->messages()->create([
                    'sender_type' => CenterMessage::TYPE_SYSTEM,
                    'body' => self::WELCOME,
                ]);

                $conversation->forceFill([
                    'last_message_at' => $message->created_at,
                ])->save();

                return $conversation->load(['company:id,name', 'patient:id,name']);
            });
        } catch (UniqueConstraintViolationException) {
            return CenterConversation::query()
                ->where('company_id', $company->id)
                ->where('patient_id', $patient->id)
                ->firstOrFail()
                ->load(['company:id,name', 'patient:id,name']);
        }
    }

    public function touchPresence(string $actorType, int $actorId, ?int $companyId): void
    {
        CenterChatPresence::query()->updateOrCreate(
            ['actor_type' => $actorType, 'actor_id' => $actorId],
            ['company_id' => $companyId, 'last_seen_at' => now()],
        );
    }

    public function markRead(CenterConversation $conversation, string $viewer): void
    {
        $latestId = (int) $conversation->messages()->max('id');
        if ($latestId < 1) {
            return;
        }

        $column = $viewer === 'patient' ? 'patient_read_message_id' : 'staff_read_message_id';
        if ($latestId > (int) ($conversation->{$column} ?? 0)) {
            $conversation->forceFill([$column => $latestId])->save();
        }
    }

    public function send(
        CenterConversation $conversation,
        string $senderType,
        ?User $staff,
        ?string $body = null,
        UploadedFile|string|null $image = null,
    ): CenterMessage {
        $text = trim((string) $body);
        $hasImage = $image instanceof UploadedFile
            || (is_string($image) && str_starts_with($image, 'data:image/'));

        abort_if($text === '' && ! $hasImage, 422, 'Message cannot be empty.');

        $imagePath = null;
        if ($image instanceof UploadedFile) {
            $imagePath = MediaStorage::upload($image, 'center-chat');
        } elseif (is_string($image) && str_starts_with($image, 'data:image/')) {
            $imagePath = MediaStorage::putBase64Image($image, 'center-chat');
        }

        $messageType = $hasImage ? CenterMessage::MESSAGE_IMAGE : CenterMessage::MESSAGE_TEXT;
        $storedBody = $hasImage
            ? ($text !== '' ? $text : '📷 Image')
            : $text;

        $message = $conversation->messages()->create([
            'sender_type' => $senderType,
            'sender_user_id' => $senderType === CenterMessage::TYPE_STAFF ? $staff?->id : null,
            'body' => $storedBody,
            'message_type' => $messageType,
            'image_path' => $imagePath,
        ]);

        $cursor = $senderType === CenterMessage::TYPE_PATIENT
            ? 'patient_read_message_id'
            : 'staff_read_message_id';

        $preview = $hasImage
            ? ($text !== '' ? Str::limit($text, 180, '') : '📷 Image')
            : Str::limit($storedBody, 180, '');

        $conversation->forceFill([
            'last_message_at' => $message->created_at,
            'last_message_preview' => $preview,
            $cursor => $message->id,
        ])->save();

        $message->load('sender:id,name');

        app(CenterChatRealtime::class)->emit(
            (int) $conversation->id,
            'message',
            [
                'message' => $this->messagePayload($message, $conversation),
                'conversation' => $this->conversationPayload($conversation, $senderType === CenterMessage::TYPE_PATIENT ? 'patient' : 'staff'),
            ]
        );

        return $message;
    }

    public function messages(CenterConversation $conversation, int $after = 0): array
    {
        $query = $conversation->messages()->with('sender:id,name');

        if ($after > 0) {
            $rows = $query->where('id', '>', $after)->orderBy('id')->limit(100)->get();
        } else {
            $rows = $query->orderByDesc('id')->limit(300)->get()->sortBy('id')->values();
        }

        return $rows->map(fn (CenterMessage $message) => $this->messagePayload($message, $conversation))->all();
    }

    public function messagePayload(CenterMessage $message, CenterConversation $conversation): array
    {
        $read = null;
        if ($message->sender_type === CenterMessage::TYPE_PATIENT) {
            $read = $conversation->staff_read_message_id !== null
                && $message->id <= $conversation->staff_read_message_id;
        } elseif ($message->sender_type === CenterMessage::TYPE_STAFF) {
            $read = $conversation->patient_read_message_id !== null
                && $message->id <= $conversation->patient_read_message_id;
        }

        $senderName = match ($message->sender_type) {
            CenterMessage::TYPE_PATIENT => $conversation->patient?->name ?: 'Patient',
            CenterMessage::TYPE_STAFF => $message->sender?->name ?: 'Centre',
            default => 'ApnaMedi',
        };

        $type = $message->message_type ?: CenterMessage::MESSAGE_TEXT;
        $imageUrl = $message->image_path ? MediaStorage::url($message->image_path) : null;

        return [
            'id' => $message->id,
            'sender_type' => $message->sender_type,
            'sender_name' => $senderName,
            'body' => $message->body,
            'type' => $type,
            'image_url' => $imageUrl,
            'read' => $read,
            'created_at' => $message->created_at?->toIso8601String(),
        ];
    }

    /**
     * @param  Collection<int, CenterConversation>  $conversations
     * @return array<int, array<string, mixed>>
     */
    public function listPayloads(Collection $conversations, string $viewer): array
    {
        if ($conversations->isEmpty()) {
            return [];
        }

        $this->attachUnread($conversations, $viewer);

        $onlinePatients = $this->onlineActorIds(
            'patient',
            $conversations->pluck('patient_id')->map(fn ($id) => (int) $id)->unique()->all()
        );
        $onlineCompanies = CenterChatPresence::query()
            ->where('actor_type', 'staff')
            ->whereIn('company_id', $conversations->pluck('company_id')->unique()->all())
            ->where('last_seen_at', '>=', now()->subSeconds(self::ONLINE_SECONDS))
            ->pluck('company_id')
            ->map(fn ($id) => (int) $id)
            ->all();

        return $conversations->map(function (CenterConversation $conversation) use ($viewer, $onlinePatients, $onlineCompanies) {
            return $this->conversationPayload($conversation, $viewer, [
                'unread_count' => (int) ($conversation->unread_count ?? 0),
                'patient_online' => in_array((int) $conversation->patient_id, $onlinePatients, true),
                'staff_online' => in_array((int) $conversation->company_id, $onlineCompanies, true),
            ]);
        })->all();
    }

    public function conversationPayload(CenterConversation $conversation, string $viewer, array $overrides = []): array
    {
        $conversation->loadMissing(['company:id,name', 'patient:id,name']);

        $patientOnline = $overrides['patient_online'] ?? $this->isOnline('patient', (int) $conversation->patient_id);
        $staffOnline = $overrides['staff_online'] ?? $this->isCompanyOnline((int) $conversation->company_id);
        $unread = $overrides['unread_count'] ?? $this->unreadCount($conversation, $viewer);

        return [
            'id' => $conversation->id,
            'company_id' => $conversation->company_id,
            'centre_name' => $conversation->company?->name,
            'patient_id' => $conversation->patient_id,
            'patient_name' => $conversation->patient?->name ?: 'Patient',
            'last_message_preview' => $conversation->last_message_preview,
            'last_message_at' => $conversation->last_message_at?->toIso8601String(),
            'patient_read_message_id' => $conversation->patient_read_message_id,
            'staff_read_message_id' => $conversation->staff_read_message_id,
            'unread_count' => (int) $unread,
            'staff_online' => (bool) $staffOnline,
            'patient_online' => (bool) $patientOnline,
        ];
    }

    public function totalUnreadForPatient(int $patientId): int
    {
        return (int) CenterMessage::query()
            ->join('center_conversations', 'center_conversations.id', '=', 'center_messages.conversation_id')
            ->where('center_conversations.patient_id', $patientId)
            ->where('center_messages.sender_type', CenterMessage::TYPE_STAFF)
            ->where(function ($query) {
                $query->whereNull('center_conversations.patient_read_message_id')
                    ->orWhereColumn('center_messages.id', '>', 'center_conversations.patient_read_message_id');
            })
            ->count();
    }

    public function totalUnreadForCompany(int $companyId): int
    {
        return (int) CenterMessage::query()
            ->join('center_conversations', 'center_conversations.id', '=', 'center_messages.conversation_id')
            ->where('center_conversations.company_id', $companyId)
            ->where('center_messages.sender_type', CenterMessage::TYPE_PATIENT)
            ->where(function ($query) {
                $query->whereNull('center_conversations.staff_read_message_id')
                    ->orWhereColumn('center_messages.id', '>', 'center_conversations.staff_read_message_id');
            })
            ->count();
    }

    /**
     * @param  Collection<int, CenterConversation>  $conversations
     */
    private function attachUnread(Collection $conversations, string $viewer): void
    {
        $sender = $viewer === 'patient' ? CenterMessage::TYPE_STAFF : CenterMessage::TYPE_PATIENT;
        $cursorColumn = $viewer === 'patient' ? 'patient_read_message_id' : 'staff_read_message_id';

        $counts = CenterMessage::query()
            ->selectRaw('conversation_id, COUNT(*) as aggregate')
            ->where('sender_type', $sender)
            ->where(function ($outer) use ($conversations, $cursorColumn) {
                foreach ($conversations as $conversation) {
                    $outer->orWhere(function ($query) use ($conversation, $cursorColumn) {
                        $query->where('conversation_id', $conversation->id);
                        $cursor = $conversation->{$cursorColumn};
                        if ($cursor) {
                            $query->where('id', '>', $cursor);
                        }
                    });
                }
            })
            ->groupBy('conversation_id')
            ->pluck('aggregate', 'conversation_id');

        $conversations->each(function (CenterConversation $conversation) use ($counts) {
            $conversation->unread_count = (int) ($counts[$conversation->id] ?? 0);
        });
    }

    private function unreadCount(CenterConversation $conversation, string $viewer): int
    {
        $sender = $viewer === 'patient' ? CenterMessage::TYPE_STAFF : CenterMessage::TYPE_PATIENT;
        $cursor = $viewer === 'patient'
            ? $conversation->patient_read_message_id
            : $conversation->staff_read_message_id;

        return (int) $conversation->messages()
            ->where('sender_type', $sender)
            ->when($cursor, fn ($query) => $query->where('id', '>', $cursor))
            ->count();
    }

    private function isOnline(string $actorType, int $actorId): bool
    {
        return CenterChatPresence::query()
            ->where('actor_type', $actorType)
            ->where('actor_id', $actorId)
            ->where('last_seen_at', '>=', now()->subSeconds(self::ONLINE_SECONDS))
            ->exists();
    }

    private function isCompanyOnline(int $companyId): bool
    {
        return CenterChatPresence::query()
            ->where('actor_type', 'staff')
            ->where('company_id', $companyId)
            ->where('last_seen_at', '>=', now()->subSeconds(self::ONLINE_SECONDS))
            ->exists();
    }

    /**
     * @param  array<int, int>  $actorIds
     * @return array<int, int>
     */
    private function onlineActorIds(string $actorType, array $actorIds): array
    {
        if ($actorIds === []) {
            return [];
        }

        return CenterChatPresence::query()
            ->where('actor_type', $actorType)
            ->whereIn('actor_id', $actorIds)
            ->where('last_seen_at', '>=', now()->subSeconds(self::ONLINE_SECONDS))
            ->pluck('actor_id')
            ->map(fn ($id) => (int) $id)
            ->all();
    }
}
