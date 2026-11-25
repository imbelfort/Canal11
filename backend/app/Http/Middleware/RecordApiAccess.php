<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\Response;
use Throwable;

class RecordApiAccess
{
    public function handle(Request $request, Closure $next): Response
    {
        if (!$request->is('api/*') || $request->isMethod('OPTIONS')) {
            return $next($request);
        }

        $started = hrtime(true);
        $response = $next($request);
        $duration = (int) round((hrtime(true) - $started) / 1_000_000);
        $status = $response->getStatusCode();
        $route = $request->route()?->uri() ?? 'api/(sin coincidencia)';
        $login = $route === 'api/auth/login' && $request->isMethod('POST');

        $event = match (true) {
            $login && $status < 400 => 'login_success',
            $login => 'login_failure',
            $status === 401 || $status === 403 => 'access_denied',
            default => 'request',
        };

        try {
            DB::table('auditoria_sistema')->insert([
                'fecha_evento' => now('UTC')->toDateTimeString(),
                'id_usuario' => $request->attributes->get('access_log_user_id') ?? $request->user()?->getAuthIdentifier(),
                'tabla_afectada' => 'api',
                'accion' => $event,
                'detalle' => "{$request->method()} /{$route} ({$status})",
                'direccion_ip' => $request->ip(),
                'metodo_http' => $request->method(),
                'ruta_http' => '/'.$route,
                'estado_http' => $status,
                'duracion_ms' => $duration,
            ]);
        } catch (Throwable $exception) {
            report($exception);
        }

        return $response;
    }
}
