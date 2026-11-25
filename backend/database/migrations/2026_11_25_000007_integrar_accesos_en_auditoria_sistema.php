<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('auditoria_sistema', function (Blueprint $table) {
            $table->string('direccion_ip', 45)->nullable();
            $table->string('metodo_http', 12)->nullable();
            $table->string('ruta_http')->nullable();
            $table->unsignedSmallInteger('estado_http')->nullable();
            $table->unsignedInteger('duracion_ms')->nullable();
            $table->index(['accion', 'id'], 'auditoria_accion_id_idx');
            $table->index('fecha_evento', 'auditoria_fecha_evento_idx');
        });

        if (!Schema::hasTable('access_logs')) {
            return;
        }

        DB::statement('LOCK TABLE access_logs IN ACCESS EXCLUSIVE MODE');
        DB::table('access_logs')->chunkById(500, function ($entries) {
            DB::table('auditoria_sistema')->insert($entries->map(fn ($entry) => [
                'id_usuario' => $entry->user_id,
                'tabla_afectada' => 'api',
                'accion' => $entry->event,
                'detalle' => "{$entry->method} {$entry->route} ({$entry->status})",
                'fecha_evento' => Carbon::parse($entry->occurred_at, 'UTC')->utc()->toDateTimeString(),
                'direccion_ip' => $entry->ip,
                'metodo_http' => $entry->method,
                'ruta_http' => $entry->route,
                'estado_http' => $entry->status,
                'duracion_ms' => $entry->duration_ms,
            ])->all());
        });

        Schema::drop('access_logs');
    }

    public function down(): void
    {
        DB::statement('LOCK TABLE auditoria_sistema IN ACCESS EXCLUSIVE MODE');
        if (DB::table('auditoria_sistema')->whereNotNull('metodo_http')->exists()) {
            throw new \RuntimeException('No se puede revertir la migración con registros de acceso en auditoria_sistema.');
        }

        Schema::table('auditoria_sistema', function (Blueprint $table) {
            $table->dropIndex('auditoria_accion_id_idx');
            $table->dropIndex('auditoria_fecha_evento_idx');
            $table->dropColumn(['direccion_ip', 'metodo_http', 'ruta_http', 'estado_http', 'duracion_ms']);
        });
    }
};
