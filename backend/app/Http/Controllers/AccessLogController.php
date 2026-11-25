<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class AccessLogController extends Controller
{
    public function index(Request $request)
    {
        $filters = $request->validate([
            'event' => ['nullable', Rule::in(['login_success', 'login_failure', 'access_denied', 'request'])],
            'cursor' => 'nullable|string|max:255',
        ]);

        $accesses = DB::table('auditoria_sistema')->whereNotNull('metodo_http');
        $logs = (clone $accesses)
            ->select('id', 'fecha_evento as occurred_at', 'id_usuario as user_id', 'direccion_ip as ip',
                'metodo_http as method', 'ruta_http as route', 'estado_http as status',
                'duracion_ms as duration_ms', 'accion as event')
            ->when($filters['event'] ?? null, fn ($query, $event) => $query->where('accion', $event))
            ->orderByDesc('id')
            ->cursorPaginate(25)
            ->through(function ($entry) {
                $entry->occurred_at = Carbon::parse($entry->occurred_at, 'UTC')->toIso8601String();
                return $entry;
            });

        $topRoutes = $accesses
            ->where('fecha_evento', '>=', now('UTC')->subHours(24)->toDateTimeString())
            ->where('ruta_http', '<>', '/api/v1/accesos')
            ->select('metodo_http as method', 'ruta_http as route')
            ->selectRaw('COUNT(*) AS requests, SUM(duracion_ms) AS total_ms, AVG(duracion_ms) AS average_ms')
            ->groupBy('metodo_http', 'ruta_http')
            ->orderByDesc('total_ms')
            ->orderBy('method')
            ->orderBy('route')
            ->limit(8)
            ->get();

        return response()->json([
            'entries' => $logs->items(),
            'next_cursor' => $logs->nextCursor()?->encode(),
            'previous_cursor' => $logs->previousCursor()?->encode(),
            'top_routes' => $topRoutes,
        ])->header('Cache-Control', 'no-store');
    }
}
