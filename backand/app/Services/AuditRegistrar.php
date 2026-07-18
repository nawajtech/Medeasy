<?php

namespace App\Services;

use Illuminate\Database\Eloquent\Model;

class AuditRegistrar
{
    public function register(): void
    {
        $this->registerMorphMap();

        foreach (config('audit.models', []) as $modelClass => $config) {
            if (! class_exists($modelClass)) {
                continue;
            }

            /** @var class-string<Model> $modelClass */
            $modelClass::created(function (Model $model) {
                app(AuditService::class)->logModelEvent($model, 'created');
            });

            $modelClass::updated(function (Model $model) {
                app(AuditService::class)->logModelEvent($model, 'updated');
            });

            $modelClass::deleted(function (Model $model) {
                app(AuditService::class)->logModelEvent($model, 'deleted');
            });
        }
    }

    protected function registerMorphMap(): void
    {
        $map = [];
        foreach (array_keys(config('audit.models', [])) as $modelClass) {
            $alias = $this->aliasFor($modelClass);
            $map[$alias] = $modelClass;
        }

        \Illuminate\Database\Eloquent\Relations\Relation::morphMap($map);
    }

    protected function aliasFor(string $modelClass): string
    {
        $base = class_basename($modelClass);

        return strtolower(preg_replace('/(?<!^)[A-Z]/', '_$0', $base));
    }
}
