<?php

namespace App\Services;

use App\Models\AuditLog;
use App\Models\User;
use App\Support\UserAgentParser;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Log;

class AuditService
{
    public function log(
        string $action,
        string $module,
        ?Model $auditable = null,
        ?array $oldValues = null,
        ?array $newValues = null,
        ?array $metadata = null,
        ?Request $request = null,
        ?User $actor = null,
    ): ?AuditLog {
        try {
            $request ??= request();
            $actor ??= auth()->user();
            $parsed = UserAgentParser::parse($request?->userAgent());

            return AuditLog::create([
                'company_id' => $this->resolveCompanyId($auditable, $actor),
                'branch_id' => $this->resolveBranchId($auditable, $actor),
                'user_id' => $actor?->id,
                'user_name' => $actor?->name,
                'user_email' => $actor?->email,
                'action' => $action,
                'module' => $module,
                'auditable_type' => $auditable ? $this->morphAlias($auditable) : null,
                'auditable_id' => $auditable?->getKey(),
                'auditable_label' => $auditable ? $this->resolveLabel($auditable) : ($metadata['label'] ?? null),
                'old_values' => $this->sanitizeValues($oldValues),
                'new_values' => $this->sanitizeValues($newValues),
                'metadata' => $metadata,
                'ip_address' => $request?->ip(),
                'user_agent' => $request?->userAgent(),
                'device' => $parsed['device'],
                'browser' => $parsed['browser'],
                'url' => $request?->fullUrl(),
                'created_at' => now(),
            ]);
        } catch (\Throwable $e) {
            Log::warning('Audit log failed: '.$e->getMessage());

            return null;
        }
    }

    public function logModelEvent(Model $model, string $event): void
    {
        $config = config('audit.models.'.get_class($model));
        if (! $config) {
            return;
        }

        $module = $config['module'] ?? 'system';
        $action = match ($event) {
            'created' => 'create',
            'updated' => 'update',
            'deleted' => 'delete',
            default => $event,
        };

        $oldValues = null;
        $newValues = null;

        if ($event === 'created') {
            $newValues = $this->extractAttributes($model, array_keys($model->getAttributes()));
        } elseif ($event === 'updated') {
            $changes = $model->getChanges();
            $hidden = config('audit.hidden_fields', []);
            $changes = Arr::except($changes, $hidden);

            if ($changes === []) {
                return;
            }

            $original = $model->getOriginal();
            $oldValues = Arr::only($original, array_keys($changes));
            $newValues = $changes;
        } elseif ($event === 'deleted') {
            $oldValues = $this->extractAttributes($model, array_keys($model->getAttributes()));
        }

        $this->log($action, $module, $model, $oldValues, $newValues);
    }

    public function logAuth(string $action, ?User $user = null): void
    {
        $actor = $user ?? auth()->user();
        if (! $actor) {
            return;
        }

        $this->log(
            $action,
            'auth',
            null,
            null,
            null,
            ['label' => $actor->email],
            request(),
            $actor,
        );
    }

    public function logDocumentAccess(
        string $action,
        string $module,
        Model $record,
        ?array $metadata = null,
    ): void {
        $this->log($action, $module, $record, null, null, $metadata);
    }

    protected function resolveCompanyId(?Model $auditable, ?User $actor): ?int
    {
        if ($auditable && isset($auditable->company_id)) {
            return (int) $auditable->company_id ?: null;
        }

        return $actor?->company_id;
    }

    protected function resolveBranchId(?Model $auditable, ?User $actor): ?int
    {
        if ($auditable && isset($auditable->branch_id) && $auditable->branch_id) {
            return (int) $auditable->branch_id;
        }

        return $actor?->branch_id;
    }

    protected function resolveLabel(Model $model): ?string
    {
        $config = config('audit.models.'.get_class($model), []);
        $field = $config['label'] ?? 'id';
        $value = $model->getAttribute($field);

        if ($value !== null && $value !== '') {
            return (string) $value;
        }

        return '#'.$model->getKey();
    }

    protected function morphAlias(Model $model): string
    {
        $map = array_flip(\Illuminate\Database\Eloquent\Relations\Relation::morphMap() ?: []);

        return $map[get_class($model)] ?? class_basename($model);
    }

    /**
     * @param  array<int, string>|null  $keys
     * @return array<string, mixed>|null
     */
    protected function extractAttributes(Model $model, ?array $keys = null): ?array
    {
        $attrs = $model->getAttributes();
        $hidden = config('audit.hidden_fields', []);
        $filtered = Arr::except($attrs, $hidden);

        if ($keys !== null) {
            $filtered = Arr::only($filtered, $keys);
        }

        return $filtered === [] ? null : $filtered;
    }

    /**
     * @param  array<string, mixed>|null  $values
     * @return array<string, mixed>|null
     */
    protected function sanitizeValues(?array $values): ?array
    {
        if ($values === null) {
            return null;
        }

        $hidden = config('audit.hidden_fields', []);

        return Arr::except($values, $hidden) ?: null;
    }
}
