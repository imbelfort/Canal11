<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Usuario;
use App\Models\Rol;
use App\Models\CategoriaPrograma;
use App\Models\Programa;
use App\Models\Parrilla;
use App\Models\ItemParrilla;
use App\Models\MaterialVideo;
use App\Models\ValidacionEmision;
use App\Models\ClientePublicitario;
use App\Models\SpotPublicitario;
use App\Models\PautaComercial;
use App\Models\EmisionRealLog;
use App\Models\AuditoriaSistema;
use App\Models\Reporte;
use App\Models\Pago;
use App\Services\PagoFacilService;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class PlayoutBmsController extends Controller
{
    // ==========================================
    // BUSCADOR UNIVERSAL TIPO GMAIL
    // ==========================================
    public function search(Request $request)
    {
        $q = trim($request->input('q', ''));
        if (!$q) {
            return response()->json(['results' => []]);
        }

        $results = [];

        // 1. Programas
        $programas = Programa::with('categoria')
            ->where('titulo', 'ILIKE', "%{$q}%")
            ->orWhere('codigo', 'ILIKE', "%{$q}%")
            ->limit(5)->get();
        foreach ($programas as $p) {
            $results[] = [
                'type' => 'PROGRAMA',
                'title' => "{$p->codigo} - {$p->titulo}",
                'subtitle' => "Categoría: " . ($p->categoria->nombre ?? 'N/A') . " | {$p->duracion_estandar_minutos} min",
                'category' => 'Catálogo',
                'data' => $p
            ];
        }

        // 2. Materiales de Video (MAM)
        $materiales = MaterialVideo::where('titulo_clip', 'ILIKE', "%{$q}%")
            ->orWhere('codigo_material', 'ILIKE', "%{$q}%")
            ->limit(5)->get();
        foreach ($materiales as $m) {
            $results[] = [
                'type' => 'MATERIAL_MAM',
                'title' => "{$m->codigo_material} - {$m->titulo_clip}",
                'subtitle' => "Formato: {$m->formato} | {$m->duracion_segundos}s | Estado: {$m->estado}",
                'category' => 'Ingesta MAM',
                'data' => $m
            ];
        }

        // 3. Clientes Publicitarios
        $clientes = ClientePublicitario::where('razon_social', 'ILIKE', "%{$q}%")
            ->orWhere('nit', 'ILIKE', "%{$q}%")
            ->orWhere('contacto', 'ILIKE', "%{$q}%")
            ->limit(5)->get();
        foreach ($clientes as $c) {
            $results[] = [
                'type' => 'CLIENTE',
                'title' => $c->razon_social,
                'subtitle' => "NIT: {$c->nit} | Contacto: {$c->contacto} | Tel: {$c->telefono}",
                'category' => 'Comercial',
                'data' => $c
            ];
        }

        // 4. Spots Publicitarios
        $spots = SpotPublicitario::with('cliente')
            ->where('titulo_spot', 'ILIKE', "%{$q}%")
            ->orWhere('codigo_spot', 'ILIKE', "%{$q}%")
            ->limit(5)->get();
        foreach ($spots as $s) {
            $results[] = [
                'type' => 'SPOT',
                'title' => "{$s->codigo_spot} - {$s->titulo_spot}",
                'subtitle' => "Cliente: " . ($s->cliente->razon_social ?? 'N/A') . " | {$s->duracion_segundos}s",
                'category' => 'Comercial',
                'data' => $s
            ];
        }

        // 5. Usuarios
        $usuarios = Usuario::where('nombre', 'ILIKE', "%{$q}%")
            ->orWhere('apellidos', 'ILIKE', "%{$q}%")
            ->orWhere('email', 'ILIKE', "%{$q}%")
            ->limit(5)->get();
        foreach ($usuarios as $u) {
            $results[] = [
                'type' => 'USUARIO',
                'title' => "{$u->nombre} {$u->apellidos}",
                'subtitle' => "Email: {$u->email} | Usuario: {$u->usuario_sistema} | CI: {$u->ci}",
                'category' => 'Administración',
                'data' => $u
            ];
        }

        // 6. Parrillas
        $parrillas = Parrilla::where('descripcion', 'ILIKE', "%{$q}%")
            ->orWhere('fecha', 'ILIKE', "%{$q}%")
            ->limit(5)->get();
        foreach ($parrillas as $pr) {
            $results[] = [
                'type' => 'PARRILLA',
                'title' => "Parrilla: {$pr->fecha} ({$pr->canal_senial})",
                'subtitle' => "Estado: {$pr->estado} | {$pr->descripcion}",
                'category' => 'Programación',
                'data' => $pr
            ];
        }

        return response()->json(['results' => $results]);
    }

    // ==========================================
    // CU1: USUARIOS Y ROLES (ADMINISTRADOR)
    // ==========================================
    public function getUsuarios()
    {
        return response()->json(Usuario::with('roles')->orderBy('id_usuario', 'asc')->get());
    }

    public function createUsuario(Request $request)
    {
        $validated = $request->validate([
            'nombre' => 'required|string',
            'apellidos' => 'required|string',
            'ci' => 'required|string|unique:usuario,ci',
            'email' => 'required|email|unique:usuario,email',
            'password' => 'required|string',
            'rol_id' => 'nullable|integer',
            'telefono' => 'nullable|string',
            'direccion' => 'nullable|string',
            'usuario_sistema' => 'nullable|string|unique:usuario,usuario_sistema',
            'fecha_nacimiento' => 'nullable|date'
        ]);

        $usuario = Usuario::create([
            'nombre' => $validated['nombre'],
            'apellidos' => $validated['apellidos'],
            'ci' => $validated['ci'],
            'email' => $validated['email'],
            'telefono' => $validated['telefono'] ?? null,
            'direccion' => $validated['direccion'] ?? null,
            'usuario_sistema' => $validated['usuario_sistema'] ?? explode('@', $validated['email'])[0],
            'password' => $validated['password'],
            'estado' => 'ACTIVO',
            'fecha_nacimiento' => $validated['fecha_nacimiento'] ?? null,
            'fecha_creacion' => Carbon::now(),
            'fecha_modificacion' => Carbon::now()
        ]);

        if (!empty($validated['rol_id'])) {
            $usuario->roles()->attach($validated['rol_id']);
        } else {
            // Asignar rol por defecto (PROGRAMADOR si no se especifica)
            $usuario->roles()->attach(2);
        }

        AuditoriaSistema::create([
            'id_usuario' => auth()->id() ?? 1,
            'tabla_afectada' => 'usuario',
            'accion' => 'INSERT',
            'detalle' => "Alta de nuevo usuario {$usuario->email} ({$usuario->nombre} {$usuario->apellidos})"
        ]);

        return response()->json(['success' => true, 'usuario' => $usuario->load('roles')]);
    }

    public function updateUsuario(Request $request, $id)
    {
        $usuario = Usuario::findOrFail($id);
        $usuario->update($request->only([
            'nombre', 'apellidos', 'ci', 'email', 'telefono', 'direccion',
            'usuario_sistema', 'password', 'estado', 'fecha_nacimiento'
        ]));
        $usuario->fecha_modificacion = Carbon::now();
        $usuario->save();

        if ($request->has('rol_id')) {
            $usuario->roles()->sync([$request->input('rol_id')]);
        }

        AuditoriaSistema::create([
            'id_usuario' => auth()->id() ?? 1,
            'tabla_afectada' => 'usuario',
            'accion' => 'UPDATE',
            'detalle' => "Actualización de usuario #{$usuario->id_usuario} ({$usuario->email})"
        ]);

        return response()->json(['success' => true, 'usuario' => $usuario->load('roles')]);
    }

    public function deleteUsuario($id)
    {
        $usuario = Usuario::findOrFail($id);
        $usuario->estado = 'INACTIVO';
        $usuario->save();

        AuditoriaSistema::create([
            'id_usuario' => auth()->id() ?? 1,
            'tabla_afectada' => 'usuario',
            'accion' => 'DELETE',
            'detalle' => "Baja / Inactivación de usuario #{$id}"
        ]);

        return response()->json(['success' => true, 'message' => 'Usuario marcado como inactivo.']);
    }

    public function getRoles()
    {
        return response()->json(Rol::all());
    }

    public function getAuditoria()
    {
        return response()->json(AuditoriaSistema::with('usuario')->orderBy('fecha_evento', 'desc')->limit(100)->get());
    }

    // ==========================================
    // CU2: CATÁLOGO DE PROGRAMAS Y CATEGORÍAS
    // ==========================================
    public function getCategorias()
    {
        return response()->json(CategoriaPrograma::all());
    }

    public function createCategoria(Request $request)
    {
        $cat = CategoriaPrograma::create($request->validate([
            'nombre' => 'required|string|unique:categoria_programa,nombre',
            'descripcion' => 'nullable|string'
        ]));
        return response()->json(['success' => true, 'categoria' => $cat]);
    }

    public function getProgramas()
    {
        return response()->json(Programa::with(['categoria', 'materiales'])->orderBy('id', 'asc')->get());
    }

    public function createPrograma(Request $request)
    {
        $validated = $request->validate([
            'titulo' => 'required|string',
            'id_categoria' => 'nullable|integer',
            'duracion_estandar_minutos' => 'required|integer',
            'codigo' => 'nullable|string',
            'descripcion' => 'nullable|string',
            'clasificacion_edad' => 'nullable|string',
            'origen' => 'nullable|string'
        ]);

        // Autogenerar código si no se provee
        if (empty($validated['codigo'])) {
            $catId = $validated['id_categoria'] ?? 1;
            $catPrefix = $catId == 1 ? 'NOT' : ($catId == 2 ? 'DEP' : 'PRG');
            $count = Programa::count() + 1;
            $validated['codigo'] = "{$catPrefix}-" . str_pad($count, 3, '0', STR_PAD_LEFT);
        }

        $programa = Programa::create([
            'codigo' => $validated['codigo'],
            'titulo' => $validated['titulo'],
            'descripcion' => $validated['descripcion'] ?? 'Contenido audiovisual estándar',
            'id_categoria' => $validated['id_categoria'] ?? 1,
            'clasificacion_edad' => $validated['clasificacion_edad'] ?? 'ATP',
            'duracion_estandar_minutos' => $validated['duracion_estandar_minutos'],
            'origen' => $validated['origen'] ?? 'NACIONAL',
            'estado' => 'ACTIVO',
            'fecha_registro' => Carbon::now()
        ]);

        return response()->json(['success' => true, 'programa' => $programa->load('categoria')]);
    }

    // ==========================================
    // CU3: PARRILLA DE PROGRAMACIÓN (PLAYLIST)
    // ==========================================
    public function getParrillas()
    {
        return response()->json(Parrilla::with(['programador', 'items.programa', 'items.validaciones', 'items.pautas.spot'])->orderBy('fecha', 'desc')->get());
    }

    public function getParrillaHoy()
    {
        $today = Carbon::today()->toDateString();
        $parrilla = Parrilla::with(['programador', 'items.programa.materiales', 'items.validaciones', 'items.pautas.spot.cliente'])
            ->where('fecha', $today)
            ->first();

        if (!$parrilla) {
            $parrilla = Parrilla::with(['programador', 'items.programa.materiales', 'items.validaciones', 'items.pautas.spot.cliente'])
                ->orderBy('fecha', 'desc')
                ->first();
        }

        return response()->json($parrilla);
    }

    public function createParrilla(Request $request)
    {
        $validated = $request->validate([
            'fecha' => 'required|date',
            'canal_senial' => 'nullable|string',
            'descripcion' => 'nullable|string'
        ]);

        $parrilla = Parrilla::create([
            'fecha' => $validated['fecha'],
            'canal_senial' => $validated['canal_senial'] ?? 'SENIAL_PRINCIPAL_HD',
            'descripcion' => $validated['descripcion'] ?? 'Parrilla diaria de emisión',
            'id_programador' => auth()->id() ?? 2,
            'estado' => 'BORRADOR',
            'fecha_creacion' => Carbon::now()
        ]);

        return response()->json(['success' => true, 'parrilla' => $parrilla]);
    }

    public function updateParrillaEstado(Request $request, $id)
    {
        $parrilla = Parrilla::findOrFail($id);
        $parrilla->estado = $request->input('estado', 'APROBADA');
        $parrilla->save();

        AuditoriaSistema::create([
            'id_usuario' => auth()->id() ?? 2,
            'tabla_afectada' => 'parrilla',
            'accion' => 'UPDATE_ESTADO',
            'detalle' => "Cambio de estado de parrilla #{$id} a {$parrilla->estado}"
        ]);

        return response()->json(['success' => true, 'parrilla' => $parrilla]);
    }

    public function addItemParrilla(Request $request)
    {
        $validated = $request->validate([
            'id_parrilla' => 'required|integer',
            'id_programa' => 'required|integer',
            'hora_inicio' => 'required|string',
            'hora_fin' => 'required|string',
            'tipo_emision' => 'nullable|string',
            'observaciones' => 'nullable|string'
        ]);

        $item = ItemParrilla::create([
            'id_parrilla' => $validated['id_parrilla'],
            'id_programa' => $validated['id_programa'],
            'hora_inicio' => $validated['hora_inicio'],
            'hora_fin' => $validated['hora_fin'],
            'tipo_emision' => $validated['tipo_emision'] ?? 'GRABADO',
            'estado' => 'PROGRAMADO',
            'observaciones' => $validated['observaciones'] ?? null
        ]);

        return response()->json(['success' => true, 'item' => $item->load('programa')]);
    }

    public function deleteItemParrilla($id)
    {
        ItemParrilla::destroy($id);
        return response()->json(['success' => true]);
    }

    // ==========================================
    // CU4: MAM - MATERIALES DE VIDEO
    // ==========================================
    public function getMateriales()
    {
        return response()->json(MaterialVideo::with(['programa', 'responsable'])->orderBy('id', 'desc')->get());
    }

    public function createMaterial(Request $request)
    {
        $validated = $request->validate([
            'id_programa' => 'required|integer',
            'titulo_clip' => 'required|string',
            'duracion_segundos' => 'required|integer',
            'codigo_material' => 'nullable|string',
            'formato' => 'nullable|string',
            'resolucion' => 'nullable|string',
            'ruta_servidor' => 'nullable|string',
            'observaciones' => 'nullable|string'
        ]);

        if (empty($validated['codigo_material'])) {
            $count = MaterialVideo::count() + 1;
            $validated['codigo_material'] = 'MAT-' . str_pad($count, 4, '0', STR_PAD_LEFT);
        }

        $material = MaterialVideo::create([
            'id_programa' => $validated['id_programa'],
            'codigo_material' => $validated['codigo_material'],
            'titulo_clip' => $validated['titulo_clip'],
            'formato' => $validated['formato'] ?? 'HD_1080I',
            'resolucion' => $validated['resolucion'] ?? '1920x1080',
            'duracion_segundos' => $validated['duracion_segundos'],
            'ruta_servidor' => $validated['ruta_servidor'] ?? '/mam/storage/' . Str::slug($validated['titulo_clip']) . '.mp4',
            'estado' => 'LISTO',
            'id_responsable' => auth()->id() ?? 3,
            'fecha_ingesta' => Carbon::now(),
            'observaciones' => $validated['observaciones'] ?? 'Ingesta digital validada'
        ]);

        return response()->json(['success' => true, 'material' => $material->load('programa')]);
    }

    public function updateMaterialEstado(Request $request, $id)
    {
        $mat = MaterialVideo::findOrFail($id);
        $mat->estado = $request->input('estado', 'LISTO');
        $mat->save();
        return response()->json(['success' => true, 'material' => $mat]);
    }

    // ==========================================
    // CU5: QUALITY CONTROL (QC) - VALIDACIÓN
    // ==========================================
    public function getValidaciones()
    {
        return response()->json(ValidacionEmision::with(['itemParrilla.programa', 'materialVideo', 'inspector'])->orderBy('id', 'desc')->get());
    }

    public function validarItem(Request $request)
    {
        $validated = $request->validate([
            'id_item_parrilla' => 'required|integer',
            'resultado_qc' => 'required|string',
            'id_material_video' => 'nullable|integer',
            'aspect_ratio' => 'nullable|string',
            'nivel_audio_db' => 'nullable|numeric',
            'observaciones' => 'nullable|string'
        ]);

        $val = ValidacionEmision::create([
            'id_item_parrilla' => $validated['id_item_parrilla'],
            'id_material_video' => $validated['id_material_video'] ?? null,
            'id_inspector_qc' => auth()->id() ?? 3,
            'resultado_qc' => $validated['resultado_qc'],
            'aspect_ratio' => $validated['aspect_ratio'] ?? '16:9',
            'nivel_audio_db' => $validated['nivel_audio_db'] ?? -24.00,
            'observaciones' => $validated['observaciones'] ?? 'Revisión técnica de sonido y luminancia',
            'fecha_validacion' => Carbon::now()
        ]);

        return response()->json(['success' => true, 'validacion' => $val]);
    }

    // ==========================================
    // CU6: PUBLICIDAD, SPOTS Y PAUTAS
    // ==========================================
    public function getClientes()
    {
        return response()->json(ClientePublicitario::with(['spots', 'pagos'])->orderBy('id', 'asc')->get());
    }

    public function createCliente(Request $request)
    {
        $validated = $request->validate([
            'razon_social' => 'required|string',
            'nit' => 'required|string|unique:cliente_publicitario,nit',
            'contacto' => 'nullable|string',
            'email' => 'nullable|email',
            'telefono' => 'nullable|string'
        ]);

        $cliente = ClientePublicitario::create([
            'razon_social' => $validated['razon_social'],
            'nit' => $validated['nit'],
            'contacto' => $validated['contacto'] ?? null,
            'email' => $validated['email'] ?? null,
            'telefono' => $validated['telefono'] ?? null,
            'estado' => 'ACTIVO'
        ]);

        return response()->json(['success' => true, 'cliente' => $cliente]);
    }

    public function getSpots()
    {
        return response()->json(SpotPublicitario::with('cliente')->orderBy('id', 'asc')->get());
    }

    public function createSpot(Request $request)
    {
        $validated = $request->validate([
            'id_cliente' => 'required|integer',
            'titulo_spot' => 'required|string',
            'duracion_segundos' => 'required|integer',
            'codigo_spot' => 'nullable|string',
            'fecha_vigencia_inicio' => 'nullable|date',
            'fecha_vigencia_fin' => 'nullable|date'
        ]);

        if (empty($validated['codigo_spot'])) {
            $count = SpotPublicitario::count() + 1;
            $validated['codigo_spot'] = 'SPOT-' . str_pad($count, 3, '0', STR_PAD_LEFT);
        }

        $spot = SpotPublicitario::create([
            'id_cliente' => $validated['id_cliente'],
            'codigo_spot' => $validated['codigo_spot'],
            'titulo_spot' => $validated['titulo_spot'],
            'duracion_segundos' => $validated['duracion_segundos'],
            'fecha_vigencia_inicio' => $validated['fecha_vigencia_inicio'] ?? Carbon::today(),
            'fecha_vigencia_fin' => $validated['fecha_vigencia_fin'] ?? Carbon::today()->addMonths(6),
            'estado' => 'ACTIVO'
        ]);

        return response()->json(['success' => true, 'spot' => $spot->load('cliente')]);
    }

    public function getPautas()
    {
        return response()->json(PautaComercial::with(['itemParrilla.programa', 'spot.cliente'])->orderBy('id', 'desc')->get());
    }

    public function createPauta(Request $request)
    {
        $validated = $request->validate([
            'id_item_parrilla' => 'required|integer',
            'id_spot' => 'required|integer',
            'tanda_bloque' => 'required|string',
            'orden' => 'nullable|integer',
            'hora_estimada' => 'nullable|string'
        ]);

        $pauta = PautaComercial::create([
            'id_item_parrilla' => $validated['id_item_parrilla'],
            'id_spot' => $validated['id_spot'],
            'tanda_bloque' => $validated['tanda_bloque'],
            'orden' => $validated['orden'] ?? 1,
            'hora_estimada' => $validated['hora_estimada'] ?? null,
            'estado' => 'PAUTADO'
        ]);

        return response()->json(['success' => true, 'pauta' => $pauta->load(['spot', 'itemParrilla'])]);
    }

    // ==========================================
    // CU7: EMISIÓN REAL (AS-RUN LOG)
    // ==========================================
    public function getEmisiones()
    {
        return response()->json(EmisionRealLog::with(['itemParrilla.programa', 'materialVideo'])->orderBy('hora_inicio_real', 'desc')->get());
    }

    public function conciliarEmision(Request $request)
    {
        $validated = $request->validate([
            'id_item_parrilla' => 'required|integer',
            'discrepancia_segundos' => 'nullable|integer',
            'estado_emision' => 'nullable|string',
            'observaciones' => 'nullable|string'
        ]);

        $now = Carbon::now();
        $emision = EmisionRealLog::create([
            'id_item_parrilla' => $validated['id_item_parrilla'],
            'id_material_video' => null,
            'hora_inicio_real' => $now->copy()->subMinutes(60),
            'hora_fin_real' => $now,
            'duracion_real_segundos' => 3600,
            'discrepancia_segundos' => $validated['discrepancia_segundos'] ?? 0,
            'estado_emision' => $validated['estado_emision'] ?? 'EMITIDO_CORRECTO',
            'operador_emision' => auth()->user()->nombre ?? 'Operador Master Grupo 12 SC',
            'observaciones' => $validated['observaciones'] ?? 'Conciliación legal de As-Run Log completada'
        ]);

        return response()->json(['success' => true, 'emision' => $emision]);
    }

    // ==========================================
    // CU8: REPORTES Y ESTADÍSTICAS
    // ==========================================
    public function getReporteGeneral()
    {
        $stats = [
            'total_usuarios' => Usuario::where('estado', 'ACTIVO')->count(),
            'total_programas' => Programa::where('estado', 'ACTIVO')->count(),
            'total_parrillas' => Parrilla::count(),
            'total_bloques' => ItemParrilla::count(),
            'materiales_listos' => MaterialVideo::where('estado', 'LISTO')->count(),
            'total_clientes' => ClientePublicitario::where('estado', 'ACTIVO')->count(),
            'total_spots' => SpotPublicitario::where('estado', 'ACTIVO')->count(),
            'total_pautas' => PautaComercial::count(),
            'emisiones_correctas' => EmisionRealLog::where('estado_emision', 'EMITIDO_CORRECTO')->count(),
            'total_pagos' => Pago::count(),
            'monto_recaudado_bob' => (float)Pago::where('estado', 'PAGADO')->sum('monto')
        ];

        return response()->json($stats);
    }

    // ==========================================
    // MÓDULO PAGOFACIL (PAGOS QR / CLIENTE / SPOT)
    // ==========================================
    public function generarPagoQr(Request $request, PagoFacilService $pagoFacil)
    {
        $validated = $request->validate([
            'id_cliente' => 'required|integer',
            'id_spot' => 'nullable|integer',
            'monto' => 'required|numeric|min:1',
            'concepto' => 'nullable|string',
            'moneda' => 'nullable|string'
        ]);

        $res = $pagoFacil->generarCobroQr($validated);
        return response()->json($res);
    }

    public function confirmarPago($transaccionId, PagoFacilService $pagoFacil)
    {
        $pago = $pagoFacil->confirmarPago($transaccionId, request()->all());
        return response()->json(['success' => true, 'pago' => $pago]);
    }

    public function getPagos()
    {
        return response()->json(Pago::with(['cliente', 'spot'])->orderBy('id', 'desc')->get());
    }
}
