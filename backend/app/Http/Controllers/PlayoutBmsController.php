<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Usuario;
use App\Models\ArchivoParrilla;
use App\Services\MediaQualityCheck;
use Illuminate\Support\Facades\Storage;
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
use Illuminate\Support\Str;
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
        $spots = SpotPublicitario::with(['cliente', 'archivo'])
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
            'nombre' => 'required|string|max:100|unique:categoria_programa,nombre',
            'descripcion' => 'nullable|string'
        ], ['nombre.unique' => 'Ya existe una categoria con ese nombre. Seleccionala en la lista.']));
        return response()->json(['success' => true, 'categoria' => $cat]);
    }

    public function getProgramas()
    {
        return response()->json(Programa::with(['categoria', 'materiales'])->orderBy('id', 'asc')->get());
    }

    public function createPrograma(Request $request)
    {
        $validated = $request->validate([
            'titulo' => 'required|string|max:150',
            'id_categoria' => 'nullable|integer|exists:categoria_programa,id',
            'duracion_estandar_minutos' => 'required|integer|min:1',
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
        $parrilla = $this->parrillaDeHoy()
            ->with(['programador', 'items.programa.materiales', 'items.validaciones', 'items.pautas.spot.cliente'])
            ->first();

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
            'id_item_parrilla' => 'required|integer|exists:item_parrilla,id',
            'resultado_qc' => 'required|in:APROBADO_AIRE,RECHAZADO_FALLA_AUDIO,RECHAZADO_FALLA_VIDEO,RECHAZADO_SIN_MATERIAL,OBSERVADO,PENDIENTE',
            'id_material_video' => 'nullable|integer',
            'aspect_ratio' => 'nullable|string',
            'nivel_audio_db' => 'nullable|numeric',
            'observaciones' => 'nullable|string'
        ]);

        $item = ItemParrilla::find($validated['id_item_parrilla']);
        $matId = $validated['id_material_video'] ?? null;
        if (!$matId && $item && $item->id_programa && !$item->media_playout) {
            $mat = MaterialVideo::where('id_programa', $item->id_programa)->orderBy('id', 'desc')->first();
            if ($mat) $matId = $mat->id;
        }

        $val = ValidacionEmision::create([
            'id_item_parrilla' => $item->id,
            'id_material_video' => $matId,
            'id_inspector_qc' => $request->user('sanctum')?->getKey() ?? 3,
            'resultado_qc' => $validated['resultado_qc'],
            'aspect_ratio' => $validated['aspect_ratio'] ?? '16:9',
            'nivel_audio_db' => $validated['nivel_audio_db'] ?? -24,
            'observaciones' => $validated['observaciones'] ?? null,
            'fecha_validacion' => Carbon::now(),
        ]);

        return response()->json(['success' => true, 'validacion' => $val->load(['itemParrilla.programa', 'materialVideo', 'inspector'])]);
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
        return response()->json(SpotPublicitario::with(['cliente', 'archivo'])->orderBy('id', 'asc')->get());
    }

    public function createSpot(Request $request)
    {
        $validated = $request->validate([
            'id_cliente' => 'required|integer|exists:cliente_publicitario,id',
            'id_archivo_parrilla' => 'nullable|integer|exists:archivo_parrilla,id',
            'titulo_spot' => 'required|string|max:150',
            'duracion_segundos' => 'required|integer|min:1',
            'codigo_spot' => 'nullable|string',
            'fecha_vigencia_inicio' => 'nullable|date',
            'fecha_vigencia_fin' => 'nullable|date'
        ]);

        $file = isset($validated['id_archivo_parrilla']) ? ArchivoParrilla::findOrFail($validated['id_archivo_parrilla']) : null;
        abort_if($file && ($file->qc['status'] ?? null) !== 'APROBADO_TECNICO', 422, 'Selecciona un video aprobado por QC.');

        if (empty($validated['codigo_spot'])) {
            $count = SpotPublicitario::count() + 1;
            $validated['codigo_spot'] = 'SPOT-' . str_pad($count, 3, '0', STR_PAD_LEFT);
        }

        $spot = SpotPublicitario::create([
            'id_cliente' => $validated['id_cliente'],
            'id_archivo_parrilla' => $validated['id_archivo_parrilla'] ?? null,
            'codigo_spot' => $validated['codigo_spot'],
            'titulo_spot' => $validated['titulo_spot'],
            'duracion_segundos' => $file ? max(1, (int) round($file->duracion_ms / 1000)) : $validated['duracion_segundos'],
            'fecha_vigencia_inicio' => $validated['fecha_vigencia_inicio'] ?? Carbon::today(),
            'fecha_vigencia_fin' => $validated['fecha_vigencia_fin'] ?? Carbon::today()->addMonths(6),
            'estado' => 'ACTIVO'
        ]);

        return response()->json(['success' => true, 'spot' => $spot->load(['cliente', 'archivo'])]);
    }

    public function linkSpotFile(Request $request, SpotPublicitario $spot)
    {
        $data = $request->validate(['id_archivo_parrilla' => 'required|integer|exists:archivo_parrilla,id']);
        $file = ArchivoParrilla::findOrFail($data['id_archivo_parrilla']);
        abort_unless(($file->qc['status'] ?? null) === 'APROBADO_TECNICO', 422, 'Selecciona un video aprobado por QC.');
        $spot->update([
            'id_archivo_parrilla' => $file->id,
            'duracion_segundos' => max(1, (int) round($file->duracion_ms / 1000)),
        ]);

        return response()->json(['success' => true, 'spot' => $spot->load(['cliente', 'archivo'])]);
    }

    public function getPautas()
    {
        return response()->json(PautaComercial::with(['itemParrilla.programa', 'spot.cliente'])->orderBy('id', 'desc')->get());
    }

    public function createPauta(Request $request)
    {
        $validated = $request->validate([
            'id_item_parrilla' => 'required|integer|exists:item_parrilla,id',
            'id_spot' => 'required|integer|exists:spot_publicitario,id',
            'tanda_bloque' => 'required|in:CORTE_1,CORTE_2,CORTE_3,CORTE_4,INICIO_PROGRAMA,FIN_PROGRAMA',
            'orden' => 'nullable|integer|min:1',
            'hora_estimada' => 'nullable|date_format:H:i',
        ]);

        $pauta = DB::transaction(function () use ($validated) {
            $item = ItemParrilla::query()->lockForUpdate()->findOrFail($validated['id_item_parrilla']);
            $todayId = $this->parrillaDeHoy()->value('id');
            abort_if($item->id_parrilla !== $todayId || in_array($item->estado, ['EMITIDO', 'CANCELADO'])
                || ($item->media_playout['event_type'] ?? 'VIDEO') === 'COMMERCIAL', 422,
                'Selecciona un segmento pendiente de la Parrilla de hoy.');
            $spot = SpotPublicitario::with('archivo')->findOrFail($validated['id_spot']);
            abort_if($spot->estado !== 'ACTIVO' || !$spot->archivo, 422,
                'El spot debe estar activo y tener un archivo de video vinculado.');
            abort_if(($spot->archivo->qc['status'] ?? null) !== 'APROBADO_TECNICO', 422, 'El video del spot necesita aprobar el control técnico.');

            return $item->pautas()->create([
                'id_spot' => $spot->id,
                'tanda_bloque' => $validated['tanda_bloque'],
                'orden' => $validated['orden'] ?? ((int) $item->pautas()->reorder()->max('orden') + 1),
                'hora_estimada' => $validated['hora_estimada'] ?? null,
                'estado' => 'PAUTADO',
            ]);
        });

        return response()->json(['success' => true, 'pauta' => $pauta->load(['spot.cliente', 'itemParrilla.programa'])], 201);
    }

    public function cancelPauta(PautaComercial $pauta)
    {
        $changed = PautaComercial::whereKey($pauta->id)->where('estado', 'PAUTADO')->update(['estado' => 'CANCELADO']);
        abort_if(!$changed && $pauta->fresh()?->estado !== 'CANCELADO', 409, 'El spot ya no esta pendiente.');

        return response()->json(['success' => true]);
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
            'id_item_parrilla' => 'required|integer|exists:item_parrilla,id',
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
            'monto' => 'required|numeric|min:0.1',
            'concepto' => 'nullable|string',
            'moneda' => 'nullable|string'
        ]);

        $res = $pagoFacil->generarCobroQr($validated);
        return response()->json($res);
    }

    public function consultarPagoQr($transaccionId, PagoFacilService $pagoFacil)
    {
        $res = $pagoFacil->queryTransaction($transaccionId);
        return response()->json(['success' => true, 'values' => $res]);
    }

    public function handlePagoFacilCallback(Request $request, PagoFacilService $pagoFacil)
    {
        $response = $pagoFacil->handleCallback($request->all());
        return response()->json($response);
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

    // ==========================================
    // INTEGRACIÓN API PLAYOUT (WEB)
    // ==========================================
    private function parrillaDeHoy()
    {
        return Parrilla::whereDate('fecha', Carbon::today('America/La_Paz'))
            ->where('canal_senial', 'SENIAL_PRINCIPAL_HD')
            ->orderBy('id');
    }

    public function getPlayoutPlaylist()
    {
        return response()->json($this->compilePlayoutPlaylist());
    }

    private function compilePlayoutPlaylist(): array
    {
        $parrilla = $this->parrillaDeHoy()->with([
            'items.ultimaValidacion',
            'items.pautas.spot.archivo',
            'items' => fn ($query) => $query->withCount(['pautas' => fn ($pautas) => $pautas->where('estado', 'PAUTADO')]),
            'items.programa.materiales' => fn ($query) => $query->where('estado', 'LISTO')->orderByDesc('id'),
        ])->first();

        $files = ArchivoParrilla::whereIn('ruta', $parrilla?->items->map(fn ($item) => $item->media_playout['file_path'] ?? null)->filter()->all() ?? [])
            ->get()->keyBy('ruta');
        $items = $parrilla?->items->flatMap(function (ItemParrilla $item) use ($files, $parrilla) {
            $material = $item->programa?->materiales->first();
            $media = $item->media_playout ?? [];
            $path = $media['file_path'] ?? $material?->ruta_servidor;

            $segment = [
                'id' => $item->id,
                'title' => $media['title'] ?? $item->programa?->titulo ?? 'Bloque ' . $item->hora_inicio,
                'file_path' => $path,
                'duration_ms' => $media['duration_ms'] ?? (($material?->duracion_segundos ?? 0) * 1000),
                'in_point_ms' => $media['in_point_ms'] ?? 0,
                'out_point_ms' => $media['out_point_ms'] ?? 0,
                'event_type' => $media['event_type'] ?? 'VIDEO',
                'timing_mode' => $media['timing_mode'] ?? 'AUTO_FOLLOW',
                'scheduled_time' => $item->hora_inicio,
                'not_before' => $media['block_starts_at'] ?? null,
                'scheduled_at' => !empty($media['start_mode'])
                    ? Carbon::parse($parrilla->fecha . ' ' . $item->hora_inicio, 'America/La_Paz')->toIso8601String()
                    : null,
                'scheduled_spots' => $item->pautas_count,
                'spot_id' => $media['spot_id'] ?? null,
                'group_id' => $media['group_id'] ?? null,
                'program_title' => $media['program_title'] ?? $item->programa?->titulo,
                'cancelled' => $item->estado === 'CANCELADO',
                'status' => match (true) {
                    $item->estado === 'EMITIDO' => 'COMPLETED',
                    $item->estado === 'CANCELADO' || $files->get($path)?->bloqueadoPorQc() || in_array($item->ultimaValidacion?->resultado_qc, ['OBSERVADO', 'RECHAZADO_FALLA_AUDIO', 'RECHAZADO_FALLA_VIDEO', 'RECHAZADO_SIN_MATERIAL'], true) => 'SKIPPED',
                    !$path => 'MISSING',
                    default => 'READY',
                },
            ];
            $before = [];
            $after = [];
            $pautas = $item->pautas->sortBy([['orden', 'asc'], ['id', 'asc']]);
            foreach ($pautas as $pauta) {
                if (!in_array($pauta->estado, ['PAUTADO', 'EMITIDO'], true)) {
                    continue;
                }
                $spot = $pauta->spot;
                $isBefore = $pauta->tanda_bloque === 'INICIO_PROGRAMA';
                $entry = [
                    'id' => -$pauta->id,
                    'pauta_id' => $pauta->id,
                    'title' => $spot->titulo_spot,
                    'file_path' => $spot->archivo?->ruta,
                    'duration_ms' => $spot->archivo?->duracion_ms ?? $spot->duracion_segundos * 1000,
                    'event_type' => 'COMMERCIAL',
                    'timing_mode' => 'AUTO_FOLLOW',
                    'scheduled_time' => $pauta->hora_estimada,
                    'not_before' => $segment['not_before'],
                    'group_id' => $segment['group_id'],
                    'program_title' => $segment['program_title'],
                    'cue_label' => ($isBefore ? 'Antes de ' : 'Después de ') . $segment['title'],
                    'status' => match (true) {
                        $pauta->estado === 'EMITIDO' => 'COMPLETED',
                        $segment['status'] === 'SKIPPED' || $spot->estado !== 'ACTIVO' || $spot->archivo?->bloqueadoPorQc() => 'SKIPPED',
                        !$spot->archivo => 'MISSING',
                        default => 'READY',
                    },
                ];
                if ($isBefore) $before[] = $entry;
                else $after[] = $entry;
            }
            if ($segment['scheduled_at'] && $segment['status'] === 'READY') {
                foreach ($before as &$spotEntry) {
                    if ($spotEntry['status'] !== 'READY') {
                        continue;
                    }
                    $spotEntry['scheduled_at'] = $segment['scheduled_at'];
                    $spotEntry['timing_mode'] = 'HARD_START';
                    $segment['timing_mode'] = 'AUTO_FOLLOW';
                    $segment['scheduled_at'] = null;
                    break;
                }
                unset($spotEntry);
            }
            return [...$before, $segment, ...$after];
        }) ?? collect();

        return [
            'playlist' => ['id' => $parrilla?->id, 'name' => 'Parrilla de hoy', 'total_items' => $items->count()],
            'items' => $items,
        ];
    }

    public function validatePlayoutParrilla()
    {
        $playlist = $this->compilePlayoutPlaylist();
        $pending = $playlist['items']->reject(fn ($item) => ($item['cancelled'] ?? false) || $item['status'] === 'COMPLETED');
        $files = ArchivoParrilla::whereIn('ruta', $pending->pluck('file_path')->filter()->unique())->get()->keyBy('ruta');
        $errors = [];
        $warnings = [];

        foreach ($pending as $item) {
            $label = $item['title'];
            $path = $item['file_path'];
            $analysis = $files->get($path)?->qc;
            if ($item['status'] === 'SKIPPED') {
                $errors[] = $label . ': bloqueado o pendiente de control técnico.';
                continue;
            }
            if (!$path || !preg_match('~^(?:https?://|/(?!/))~i', $path)) {
                $errors[] = $label . ': no tiene una ruta de video reproducible.';
                continue;
            }
            if (preg_match('~^/api/parrilla/media/([A-Za-z0-9]+\.(?:mp4|webm|ogg|ogv))$~', $path, $local)
                && !Storage::disk('local')->exists('parrilla/' . $local[1])) {
                $errors[] = $label . ': falta el archivo en el servidor.';
                continue;
            }
            if ($item['duration_ms'] <= 0) {
                $errors[] = $label . ': falta una duración válida.';
                continue;
            }
            if ($analysis === null) {
                $warnings[] = $label . ': sin resultado de QC para este archivo.';
            } elseif ($analysis['status'] === 'APROBADO_TECNICO' && array_key_exists('audio', $analysis) && $analysis['audio'] === null) {
                $warnings[] = $label . ': no tiene pista de audio.';
            }
        }

        $last = null;
        $parrillaId = $playlist['playlist']['id'];
        $blocks = ItemParrilla::where('id_parrilla', $parrillaId)->whereNotIn('estado', ['CANCELADO', 'EMITIDO'])
            ->orderBy('hora_inicio')->orderBy('id')->get();
        foreach ($blocks as $block) {
            if ($block->hora_fin <= $block->hora_inicio) {
                $errors[] = "Bloque #{$block->id}: el fin debe ser posterior al inicio.";
                continue;
            }
            if ($last && $block->hora_inicio < $last->hora_fin) {
                $errors[] = "Cruce de horarios entre los bloques #{$last->id} y #{$block->id}.";
            }
            if (!$last || $block->hora_fin > $last->hora_fin) {
                $last = $block;
            }
        }

        return response()->json([
            'pending' => $pending->count(),
            'errors' => $errors,
            'warnings' => $warnings,
        ]);
    }

    public function getParrillaFiles(Request $request)
    {
        $filters = $request->validate(['q' => 'nullable|string|max:150', 'program_id' => 'nullable|integer|exists:programa,id']);
        $search = trim($filters['q'] ?? '');
        $programId = $filters['program_id'] ?? null;
        $ready = $request->boolean('ready');
        $stored = ArchivoParrilla::query()
            ->when($ready, fn ($query) => $query->whereRaw("qc->>'status' = ?", ['APROBADO_TECNICO']))
            ->when($programId, fn ($query) => $query->where('id_programa', $programId))
            ->when($search !== '', fn ($query) => $query->where('titulo', 'ILIKE', "%{$search}%"))
            ->orderBy('id')->when(!$programId, fn ($query) => $query->limit(100))->get()
            ->map(fn ($file) => [
                'id' => 'archivo:' . $file->id,
                'titulo' => $file->titulo,
                'ruta' => $file->ruta,
                'duracion_ms' => $file->duracion_ms,
                'origen' => 'Archivos subidos',
                'qc' => $file->qc,
                'disponible' => ($file->qc['status'] ?? null) === 'APROBADO_TECNICO',
            ]);
        $mam = MaterialVideo::query()
            ->when($ready || !$programId, fn ($query) => $query->where('estado', 'LISTO'))
            ->whereNotExists(ArchivoParrilla::query()->whereColumn('archivo_parrilla.ruta', 'material_video.ruta_servidor')->toBase())
            ->when($ready || !$programId, fn ($query) => $query->whereRaw('ruta_servidor ~* ?', ['^(https?://|/[^/])'])->where('duracion_segundos', '>', 0))
            ->when($programId, fn ($query) => $query->where('id_programa', $programId))
            ->when($search !== '', fn ($query) => $query->where('titulo_clip', 'ILIKE', "%{$search}%"))
            ->orderBy('id')->when(!$programId, fn ($query) => $query->limit(100))->get()
            ->map(fn ($file) => [
                'id' => 'mam:' . $file->id,
                'titulo' => $file->titulo_clip,
                'ruta' => $file->ruta_servidor,
                'duracion_ms' => $file->duracion_segundos * 1000,
                'origen' => 'MAM',
                'estado_mam' => $file->estado,
                'formato' => $file->formato,
                'resolucion' => $file->resolucion,
                'observaciones' => $file->observaciones,
                'disponible' => $file->estado === 'LISTO' && $file->duracion_segundos > 0
                    && preg_match('~^(?:https?://|/(?!/))~i', $file->ruta_servidor) === 1,
            ]);

        $files = $stored->concat($mam);
        if ($programId && $files->isNotEmpty()) {
            $routes = $files->pluck('ruta')->filter()->unique();
            $notesByRoute = ValidacionEmision::query()
                ->leftJoin('material_video', 'material_video.id', '=', 'validacion_emision.id_material_video')
                ->join('item_parrilla', 'item_parrilla.id', '=', 'validacion_emision.id_item_parrilla')
                ->whereNotNull('validacion_emision.observaciones')
                ->whereIn(DB::raw("COALESCE(material_video.ruta_servidor, item_parrilla.media_playout->>'file_path')"), $routes)
                ->orderByDesc('validacion_emision.id')
                ->get([DB::raw("COALESCE(material_video.ruta_servidor, item_parrilla.media_playout->>'file_path') AS ruta"), 'validacion_emision.observaciones'])
                ->unique('ruta')->keyBy('ruta');
            $files = $files->map(fn ($file) => $file + ['nota_qc' => $notesByRoute->get($file['ruta'])?->observaciones]);
        }
        return response()->json($programId ? $files->values() : $files->sortBy('titulo')->take(100)->values());
    }

    public function getQualityFiles(Request $request)
    {
        $data = $request->validate(['q' => 'nullable|string|max:150', 'program_id' => 'nullable|integer']);
        $files = ArchivoParrilla::with(['programa:id,titulo', 'spots:id,id_archivo_parrilla,titulo_spot'])
            ->when($data['program_id'] ?? null, fn ($query, $id) => $query->where('id_programa', $id))
            ->when(trim($data['q'] ?? '') !== '', fn ($query) => $query->where('titulo', 'ILIKE', '%' . trim($data['q']) . '%'))
            ->orderByDesc('id')->limit(100)->get();

        return response()->json($files);
    }

    public function updateMediaProgram(Request $request, ArchivoParrilla $archivo)
    {
        abort_unless($request->user('sanctum')?->canIngestMedia(), 403, 'Los vínculos de archivos corresponden a Contenidos.');
        $data = $request->validate(['program_id' => 'present|nullable|integer|exists:programa,id']);

        $file = DB::transaction(function () use ($request, $archivo, $data) {
            $file = ArchivoParrilla::query()->lockForUpdate()->findOrFail($archivo->id);
            $oldProgram = $file->id_programa;
            $file->update(['id_programa' => $data['program_id']]);
            $material = MaterialVideo::where('ruta_servidor', $file->ruta)
                ->where(fn ($query) => $query->where('codigo_material', 'MAM-QC-' . $file->id)
                    ->orWhere('id_programa', $oldProgram))->first();
            if ($material) {
                $material->update(['id_programa' => $file->id_programa]);
            } else {
                $this->registerMamFile($file, $request->user('sanctum')->getKey());
            }

            return $file;
        });

        return response()->json($file->load(['programa:id,titulo', 'spots:id,id_archivo_parrilla,titulo_spot']));
    }

    public function analyzeQualityFile(Request $request, ArchivoParrilla $archivo, MediaQualityCheck $quality)
    {
        abort_unless($request->user('sanctum')?->canIngestMedia(), 403, 'El control de archivos corresponde a Contenidos.');
        if ($request->header('Accept') !== 'application/x-ndjson') {
            return response()->json($this->runQualityAnalysis($archivo, $quality));
        }

        return response()->stream(function () use ($archivo, $quality) {
            $send = static function (array $event): void {
                echo json_encode($event, JSON_INVALID_UTF8_SUBSTITUTE | JSON_THROW_ON_ERROR) . "\n";
                if (ob_get_level() > 0) {
                    ob_flush();
                }
                flush();
            };
            $progress = static fn (int $percent, string $stage) => $send([
                'type' => 'progress', 'percent' => $percent, 'stage' => $stage,
            ]);

            try {
                $progress(25, 'checking');
                $file = $this->runQualityAnalysis($archivo, $quality, $progress);
                $send(['type' => 'done', 'file' => $file]);
            } catch (\Throwable $error) {
                report($error);
                $send(['type' => 'error']);
            }
        }, 200, [
            'Content-Type' => 'application/x-ndjson; charset=UTF-8',
            'Cache-Control' => 'no-cache, no-transform',
            'X-Accel-Buffering' => 'no',
        ]);
    }

    private function runQualityAnalysis(ArchivoParrilla $archivo, MediaQualityCheck $quality, ?callable $progress = null): ArchivoParrilla
    {
        $result = $quality->inspect($archivo->ruta, $progress ? fn () => $progress(50, 'reading') : null);
        if ($progress) {
            $progress(75, 'saving');
        }
        DB::transaction(function () use ($archivo, $result) {
            $archivo->update(['qc' => $result] + ($result['status'] === 'APROBADO_TECNICO'
                ? ['duracion_ms' => $result['duration_ms']] : []));
            MaterialVideo::where('ruta_servidor', $archivo->ruta)
                ->where('codigo_material', 'MAM-QC-' . $archivo->id)
                ->whereIn('estado', ['INGESTADO', 'LISTO', 'CUARENTENA'])
                ->update($this->mamTechnicalFields($archivo));
        });

        return $archivo->load(['programa:id,titulo', 'spots:id,id_archivo_parrilla,titulo_spot']);
    }

    public function storeParrillaFile(Request $request, MediaQualityCheck $quality)
    {
        abort_unless($request->user('sanctum')?->canIngestMedia(), 403, 'La ingesta de archivos corresponde a Contenidos.');
        $data = $request->validate([
            'video' => 'required|file|mimetypes:video/mp4,video/webm,video/ogg|max:512000',
            'title' => 'required|string|max:255',
            'duration_ms' => 'nullable|integer|min:1|max:86400000',
            'program_id' => 'nullable|integer|exists:programa,id',
        ]);
        $path = $data['video']->store('parrilla', 'local');
        abort_unless($path, 500, 'No se pudo guardar el video.');

        try {
            $route = '/api/parrilla/media/' . basename($path);
            $result = $quality->inspect($route);
            $file = DB::transaction(function () use ($request, $data, $route, $result) {
                $file = ArchivoParrilla::create([
                    'titulo' => $data['title'],
                    'ruta' => $route,
                    'duracion_ms' => $result['status'] === 'APROBADO_TECNICO' ? $result['duration_ms'] : ($data['duration_ms'] ?? 0),
                    'id_programa' => $data['program_id'] ?? null,
                    'qc' => $result,
                ]);
                if ($file->id_programa) {
                    $this->registerMamFile($file, $request->user('sanctum')->getKey());
                }

                return $file;
            });
            return response()->json(['id' => 'archivo:' . $file->id, 'origen' => 'Archivos subidos'] + $file->toArray(), 201);
        } catch (\Throwable $error) {
            Storage::disk('local')->delete($path);
            throw $error;
        }
    }

    private function registerMamFile(ArchivoParrilla $file, int $userId): void
    {
        MaterialVideo::create([
            'id_programa' => $file->id_programa,
            'codigo_material' => 'MAM-QC-' . $file->id,
            'titulo_clip' => Str::limit($file->titulo, 150, ''),
            'ruta_servidor' => $file->ruta,
            'id_responsable' => $userId,
            'fecha_ingesta' => now(),
        ] + $this->mamTechnicalFields($file));
    }

    private function mamTechnicalFields(ArchivoParrilla $file): array
    {
        $analysis = $file->qc ?? ['status' => 'PENDIENTE'];
        $video = $analysis['video'] ?? [];
        return [
            'formato' => strtoupper(pathinfo($file->ruta, PATHINFO_EXTENSION) . '_' . ($video['codec_name'] ?? 'PENDIENTE')),
            'resolucion' => isset($video['width'], $video['height']) ? "{$video['width']}x{$video['height']}" : 'PENDIENTE',
            'duracion_segundos' => (int) round(($analysis['duration_ms'] ?? $file->duracion_ms) / 1000),
            'estado' => match ($analysis['status']) {
                'APROBADO_TECNICO' => 'LISTO',
                'OBSERVADO' => 'CUARENTENA',
                default => 'INGESTADO',
            },
            'observaciones' => implode(' ', $analysis['issues'] ?? []),
        ];
    }

    public function addParrillaBlock(Request $request)
    {
        abort_unless($request->user('sanctum')?->canScheduleParrilla(), 403, 'Solo Programación y Administración pueden armar la Parrilla.');
        $data = $request->validate([
            'program_title' => 'nullable|string|max:200',
            'program_id' => 'nullable|integer|exists:programa,id',
            'scheduled_time' => 'nullable|date_format:H:i',
            'entries' => 'required|array|min:1|max:100',
            'entries.*.file_id' => ['required', 'regex:/^(archivo|mam|spot):[1-9][0-9]{0,17}$/'],
            'entries.*.event_type' => 'required|in:VIDEO,COMMERCIAL',
        ]);

        $program = isset($data['program_id']) ? Programa::findOrFail($data['program_id']) : null;
        $title = $program?->titulo ?? $data['program_title'] ?? null;
        $entries = collect($data['entries']);
        abort_if($title && !$entries->contains(fn ($entry) => $entry['event_type'] === 'VIDEO' && !str_starts_with($entry['file_id'], 'spot:')), 422,
            'Agrega al menos un segmento de programa.');
        $stored = ArchivoParrilla::query()
            ->whereIn('id', $entries->pluck('file_id')->filter(fn ($id) => str_starts_with($id, 'archivo:'))->map(fn ($id) => substr($id, 8)))
            ->get()->keyBy('id');
        $mam = MaterialVideo::where('estado', 'LISTO')
            ->whereIn('id', $entries->pluck('file_id')->filter(fn ($id) => str_starts_with($id, 'mam:'))->map(fn ($id) => substr($id, 4)))
            ->get()->keyBy('id');
        $spots = SpotPublicitario::with('archivo')->where('estado', 'ACTIVO')
            ->whereIn('id', $entries->pluck('file_id')->filter(fn ($id) => str_starts_with($id, 'spot:'))->map(fn ($id) => substr($id, 5)))
            ->get()->keyBy('id');
        $group = (string) Str::uuid();
        $items = $entries->values()->map(function (array $entry, int $index) use ($stored, $mam, $spots, $title, $group, $data, $program) {
            [$source, $id] = explode(':', $entry['file_id']);
            $spot = $source === 'spot' ? $spots->get($id) : null;
            $file = match ($source) {
                'archivo' => $stored->get($id),
                'mam' => $mam->get($id),
                'spot' => $spot?->archivo,
            };
            abort_unless($file, 422, 'Un archivo o spot ya no está disponible.');
            abort_if($source !== 'mam' && ($file->qc['status'] ?? null) !== 'APROBADO_TECNICO', 422,
                'Uno de los archivos necesita aprobar el control técnico.');

            return [
                'title' => $spot?->titulo_spot ?? $file->titulo ?? $file->titulo_clip,
                'file_path' => $file->ruta ?? $file->ruta_servidor,
                'duration_ms' => $file->duracion_ms ?? ($file->duracion_segundos * 1000),
                'event_type' => $spot ? 'COMMERCIAL' : $entry['event_type'],
                'spot_id' => $spot?->id,
                'scheduled_time' => $index === 0 ? ($data['scheduled_time'] ?? null) : null,
                'group_id' => $group,
                'program_title' => $title,
                'program_id' => $program?->id,
                'timing_mode' => $index === 0 ? 'HARD_START' : 'AUTO_FOLLOW',
                'start_mode' => $index === 0 ? (empty($data['scheduled_time']) ? 'NOW' : 'SCHEDULED') : null,
            ];
        });

        $request->merge(['items' => $items->all()]);
        return $this->savePlayoutItems($request, false)->setStatusCode(201);
    }

    public function uploadPlayoutMedia(Request $request, MediaQualityCheck $quality)
    {
        abort_unless($request->user('sanctum')?->canScheduleParrilla(), 403);
        $request->validate(['scheduled_time' => 'nullable|date_format:H:i']);
        $file = $this->storeParrillaFile($request, $quality)->getData(true);
        if ($file['qc']['status'] !== 'APROBADO_TECNICO') {
            return response()->json(['message' => 'El archivo quedó en Control de calidad para revision.', 'qc' => $file['qc']], 422);
        }
        $request->merge(['items' => [[
            'title' => $file['titulo'],
            'file_path' => $file['ruta'],
            'duration_ms' => $file['duracion_ms'],
            'scheduled_time' => $request->input('scheduled_time'),
            'event_type' => 'VIDEO',
            'timing_mode' => 'AUTO_FOLLOW',
        ]]]);

        return $this->savePlayoutItems($request, false)->setStatusCode(201);
    }

    public function getPlayoutMedia(string $file)
    {
        $disk = \Illuminate\Support\Facades\Storage::disk('local');
        $path = 'parrilla/' . $file;
        abort_unless($disk->exists($path), 404);

        return response()->file($disk->path($path), [
            'Content-Type' => $disk->mimeType($path),
            'X-Content-Type-Options' => 'nosniff',
        ]);
    }

    public function replacePlayoutPlaylist(Request $request)
    {
        abort_unless($request->user('sanctum')?->canScheduleParrilla(), 403);
        return $this->savePlayoutItems($request, true);
    }

    public function addPlayoutItem(Request $request)
    {
        abort_unless($request->user('sanctum')?->canScheduleParrilla(), 403);
        if (!$request->has('items') && $request->has('item')) {
            $request->merge(['items' => [$request->input('item')]]);
        }
        return $this->savePlayoutItems($request, false);
    }

    private function savePlayoutItems(Request $request, bool $replace)
    {
        $data = $request->validate([
            'items' => 'required|array|min:1',
            'items.*.title' => 'required|string|max:255',
            'items.*.file_path' => ['required', 'string', 'max:2048', 'regex:~^(?:https?://|/(?!/))~i'],
            'items.*.duration_ms' => 'required|integer|min:1|max:86400000',
            'items.*.event_type' => 'nullable|in:VIDEO,COMMERCIAL',
            'items.*.timing_mode' => 'nullable|in:AUTO_FOLLOW,HARD_START,MANUAL',
            'items.*.start_mode' => 'nullable|in:NOW,SCHEDULED',
            'items.*.scheduled_time' => 'nullable|required_if:items.*.start_mode,SCHEDULED|date_format:H:i',
            'items.*.group_id' => 'nullable|uuid',
            'items.*.program_title' => 'nullable|string|max:200',
            'items.*.program_id' => 'nullable|integer|exists:programa,id',
            'items.*.spot_id' => 'nullable|integer|exists:spot_publicitario,id',
            'items.*.in_point_ms' => 'nullable|integer|min:0',
            'items.*.out_point_ms' => 'nullable|integer|min:0',
        ]);

        $created = DB::transaction(function () use ($data, $request, $replace) {
            // Serializa la creaci?n de la parrilla diaria y el c?lculo del siguiente horario.
            DB::statement('LOCK TABLE parrilla IN SHARE ROW EXCLUSIVE MODE');
            $parrilla = $this->parrillaDeHoy()->first() ?? Parrilla::create([
                'fecha' => Carbon::today('America/La_Paz')->toDateString(),
                'canal_senial' => 'SENIAL_PRINCIPAL_HD',
                'descripcion' => 'Parrilla de hoy',
                'id_programador' => $request->user('sanctum')?->getKey() ?? Usuario::query()->orderBy('id_usuario')->value('id_usuario'),
                'estado' => 'BORRADOR',
                'fecha_creacion' => Carbon::now('America/La_Paz'),
            ]);

            if ($replace) {
                $this->deleteParrillaItems($parrilla);
            }

            $now = Carbon::now('America/La_Paz')->startOfSecond();
            $first = $data['items'][0];
            $mode = $first['start_mode'] ?? null;
            if ($mode) {
                $start = $mode === 'SCHEDULED'
                    ? Carbon::parse($parrilla->fecha . ' ' . $first['scheduled_time'], 'America/La_Paz')
                    : $now->copy();
                abort_if($start->lt($now), 422, 'La hora programada ya pas?. Elige una hora futura o Iniciar ahora.');
                $seconds = collect($data['items'])->sum(fn ($media) => (int) ceil($media['duration_ms'] / 1000));
                $end = $start->copy()->addSeconds($seconds);
                abort_unless($end->isSameDay($start), 422, 'La parrilla supera la medianoche.');
                $overlap = $parrilla->items()->whereNotIn('estado', ['CANCELADO', 'EMITIDO'])
                    ->where('hora_inicio', '<', $end->format('H:i:s'))
                    ->where('hora_fin', '>', $start->format('H:i:s'))->exists();
                abort_if($overlap, 409, 'Ese horario coincide con otro bloque pendiente. Elige una hora libre.');
            } else {
                $last = $parrilla->items()->max('hora_fin');
                $start = $last ? Carbon::parse($parrilla->fecha . ' ' . $last, 'America/La_Paz')->max($now) : $now->copy();
            }

            $blockStartsAt = $mode ? $start->toIso8601String() : null;
            return collect($data['items'])->map(function (array $media) use ($parrilla, &$start, $mode, $blockStartsAt) {
                if ($blockStartsAt) {
                    $media['block_starts_at'] = $blockStartsAt;
                }
                if (!$mode && !empty($media['scheduled_time'])) {
                    $scheduled = Carbon::parse($parrilla->fecha . ' ' . $media['scheduled_time'], 'America/La_Paz');
                    abort_if($scheduled->lt($start) && $parrilla->items()->exists(), 422,
                        'El horario elegido se cruza con los bloques existentes.');
                    $start = $scheduled;
                }

                $duration = (int) ceil($media['duration_ms'] / 1000);
                $end = $start->copy()->addSeconds($duration);
                abort_if(!$start->isSameDay($end), 422, 'La parrilla supera la medianoche.');

                $item = $parrilla->items()->create([
                    'id_programa' => $media['program_id'] ?? null,
                    'hora_inicio' => $start->format('H:i:s'),
                    'hora_fin' => $end->format('H:i:s'),
                    'tipo_emision' => 'GRABADO',
                    'estado' => 'PROGRAMADO',
                    'media_playout' => $media,
                ]);

                $start = $end;
                return ['id' => $item->id, 'scheduled_time' => $item->hora_inicio] + $media;
            });
        });

        return response()->json(['success' => true, 'items' => $created]);
    }

    private function deleteParrillaItems(Parrilla $parrilla, ?int $id = null): void
    {
        $items = $parrilla->items()->when($id !== null, fn ($query) => $query->whereKey($id));
        abort_if((clone $items)->where(fn ($query) => $query
            ->has('validaciones')->orHas('pautas')->orHas('emisionesReales'))->exists(), 409,
            'La selecci?n contiene bloques vinculados con Control de calidad, Pautas o Bit?cora.');
        $items->delete();
    }

    public function deletePlayoutItem(Request $request, int $id)
    {
        abort_unless($request->user('sanctum')?->canScheduleParrilla(), 403);
        $parrilla = $this->parrillaDeHoy()->firstOrFail();
        $this->deleteParrillaItems($parrilla, $id);

        return response()->json(['success' => true]);
    }

    public function clearPlayoutPlaylist(Request $request)
    {
        abort_unless($request->user('sanctum')?->canScheduleParrilla(), 403);
        if ($parrilla = $this->parrillaDeHoy()->first()) {
            $this->deleteParrillaItems($parrilla);
        }

        return response()->json(['success' => true]);
    }

    public function recordPlayoutCompletion(Request $request)
    {
        $data = $request->validate([
            'item_id' => 'required_without:pauta_id|prohibits:pauta_id|integer|min:1',
            'pauta_id' => 'required_without:item_id|prohibits:item_id|integer|min:1',
            'started_at' => 'required|date|before_or_equal:now',
            'duration_ms' => 'required|integer|min:0|max:86400000',
        ]);

        DB::transaction(function () use ($request, $data) {
            $pauta = isset($data['pauta_id'])
                ? PautaComercial::with('spot.archivo')->lockForUpdate()->findOrFail($data['pauta_id'])
                : null;
            $item = ItemParrilla::query()->lockForUpdate()->findOrFail($pauta?->id_item_parrilla ?? $data['item_id']);
            if (($pauta?->estado ?? $item->estado) === 'EMITIDO') {
                return;
            }
            abort_if($item->estado === 'CANCELADO' || ($pauta && $pauta->estado !== 'PAUTADO'), 409, 'El evento fue cancelado.');
            $seconds = (int) round($data['duration_ms'] / 1000);
            $planned = $pauta
                ? ($pauta->spot->archivo?->duracion_ms ?? $pauta->spot->duracion_segundos * 1000)
                : ($item->media_playout['duration_ms'] ?? null);
            $start = Carbon::parse($data['started_at'])->setTimezone('America/La_Paz');
            $end = Carbon::now('America/La_Paz');

            $item->emisionesReales()->create([
                'id_pauta_comercial' => $pauta?->id,
                'hora_inicio_real' => $start,
                'hora_fin_real' => $end,
                'duracion_real_segundos' => $seconds,
                'discrepancia_segundos' => $planned ? $seconds - (int) round($planned / 1000) : 0,
                'estado_emision' => 'EMITIDO_CORRECTO',
                'operador_emision' => $request->user()->nombre,
                'observaciones' => 'Reproduccion completada en el monitor web',
                'fecha_registro' => $end,
            ]);
            ($pauta ?? $item)->update(['estado' => 'EMITIDO']);
        });

        return response()->json(['success' => true]);
    }

    private function auditQuery(Request $request)
    {
        $filters = $request->validate([
            'startDate' => 'nullable|date_format:Y-m-d',
            'endDate' => 'nullable|date_format:Y-m-d',
            'search' => 'nullable|string|max:150',
            'status' => 'nullable|string|max:40',
        ]);
        $query = EmisionRealLog::with(['itemParrilla.programa', 'materialVideo', 'pauta.spot.archivo']);

        if ($start = $filters['startDate'] ?? null) {
            $query->where('hora_inicio_real', '>=', $start . ' 00:00:00');
        }
        if ($end = $filters['endDate'] ?? null) {
            $query->where('hora_inicio_real', '<', Carbon::parse($end, 'America/La_Paz')->addDay()->toDateString() . ' 00:00:00');
        }
        if ($search = trim($filters['search'] ?? '')) {
            $term = "%{$search}%";
            $query->where(function ($query) use ($term) {
                $query->whereHas('itemParrilla', fn ($items) => $items
                    ->whereRaw("media_playout->>'title' ILIKE ?", [$term])
                    ->orWhereRaw("media_playout->>'program_title' ILIKE ?", [$term])
                    ->orWhereRaw("media_playout->>'file_path' ILIKE ?", [$term])
                    ->orWhereHas('programa', fn ($programs) => $programs->where('titulo', 'ILIKE', $term)))
                    ->orWhereHas('materialVideo', fn ($material) => $material->where('ruta_servidor', 'ILIKE', $term))
                    ->orWhereHas('pauta.spot', fn ($spots) => $spots
                        ->where('titulo_spot', 'ILIKE', $term)
                        ->orWhereHas('archivo', fn ($files) => $files->where('ruta', 'ILIKE', $term)))
                    ->orWhere('operador_emision', 'ILIKE', $term);
            });
        }
        if (($status = $filters['status'] ?? null) && $status !== 'ALL') {
            $states = match ($status) {
                'PLAYED_SUCCESS' => ['EMITIDO_CORRECTO'],
                'FILE_CORRUPT_OR_MISSING' => ['FALLA_TECNICA', 'NO_EMITIDO'],
                'INTERRUPTED' => ['CORTE_ENERGIA', 'INTERRUPCION_NOTICIOSA'],
                default => [$status],
            };
            $query->whereIn('estado_emision', $states);
        }

        return $query->orderByDesc('hora_inicio_real')->orderByDesc('id');
    }

    private function auditEntry(EmisionRealLog $em): array
    {
        $item = $em->itemParrilla;
        $media = $item?->media_playout ?? [];
        $spot = $em->pauta?->spot;
        $status = $em->estado_emision;

        return [
            'id' => $em->id,
            'item_id' => $em->id_item_parrilla,
            'pauta_id' => $em->id_pauta_comercial,
            'spot_id' => $spot?->id ?? $media['spot_id'] ?? null,
            'title' => $spot?->titulo_spot ?? $media['title'] ?? $item?->programa?->titulo ?? 'Emisión en continuidad',
            'program_title' => $media['program_title'] ?? $item?->programa?->titulo,
            'file_path' => $spot ? $spot->archivo?->ruta : ($media['file_path'] ?? $em->materialVideo?->ruta_servidor),
            'event_type' => $spot ? 'COMMERCIAL' : ($media['event_type'] ?? 'VIDEO'),
            'planned_start' => $em->pauta ? $em->pauta->hora_estimada : $item?->hora_inicio,
            'started_at' => $em->hora_inicio_real ? Carbon::parse($em->hora_inicio_real, 'America/La_Paz')->toIso8601String() : null,
            'ended_at' => $em->hora_fin_real ? Carbon::parse($em->hora_fin_real, 'America/La_Paz')->toIso8601String() : null,
            'planned_duration_ms' => ($em->duracion_real_segundos - $em->discrepancia_segundos) * 1000,
            'actual_duration_ms' => $em->duracion_real_segundos * 1000,
            'discrepancy_ms' => $em->discrepancia_segundos * 1000,
            'broadcast_status' => $status,
            'status' => $status === 'EMITIDO_CORRECTO' ? 'SUCCESS' : ($status === 'NO_EMITIDO' ? 'SKIPPED' : 'ERROR'),
            'operator' => $em->operador_emision,
            'notes' => $em->observaciones,
        ];
    }

    public function getAuditLogs(Request $request)
    {
        $page = $request->validate([
            'limit' => 'nullable|integer|min:1|max:250',
            'offset' => 'nullable|integer|min:0',
        ]);
        $query = $this->auditQuery($request);
        return response()->json([
            'total' => (clone $query)->reorder()->count(),
            'logs' => $query->offset($page['offset'] ?? 0)->limit($page['limit'] ?? 50)->get()
                ->map(fn (EmisionRealLog $entry) => $this->auditEntry($entry)),
        ]);
    }

    public function exportAuditCsv(Request $request)
    {
        $query = $this->auditQuery($request);
        return response()->streamDownload(function () use ($query) {
            $stream = fopen('php://output', 'w');
            fwrite($stream, "\xEF\xBB\xBF");
            fputcsv($stream, ['ID', 'Contenido', 'Programa', 'Tipo', 'Archivo', 'Inicio previsto', 'Inicio real', 'Fin real', 'Previsto (ms)', 'Real (ms)', 'Diferencia (ms)', 'Estado', 'Operador', 'Observaciones'], ',', '"', '');
            foreach ($query->lazy(250) as $emision) {
                $entry = $this->auditEntry($emision);
                $values = [$entry['id'], $entry['title'], $entry['program_title'], $entry['event_type'], $entry['file_path'],
                    $entry['planned_start'], $entry['started_at'], $entry['ended_at'], $entry['planned_duration_ms'],
                    $entry['actual_duration_ms'], $entry['discrepancy_ms'], $entry['broadcast_status'], $entry['operator'], $entry['notes']];
                fputcsv($stream, array_map(fn ($value) => is_string($value) && preg_match('/^[\s]*[=+@-]/u', $value)
                    ? "'" . $value : $value, $values), ',', '"', '');
            }
            fclose($stream);
        }, 'as-run.csv', ['Content-Type' => 'text/csv; charset=UTF-8']);
    }

    public function getAuditStats()
    {
        $today = Carbon::today('America/La_Paz');
        $stats = EmisionRealLog::query()->selectRaw(
            "COUNT(*) AS total, COUNT(*) FILTER (WHERE estado_emision = 'EMITIDO_CORRECTO') AS correct,
             COUNT(*) FILTER (WHERE estado_emision IN ('FALLA_TECNICA', 'CORTE_ENERGIA', 'INTERRUPCION_NOTICIOSA', 'NO_EMITIDO')) AS failures,
             COUNT(*) FILTER (WHERE hora_inicio_real >= ? AND hora_inicio_real < ?) AS today,
             COALESCE(SUM(duracion_real_segundos), 0) AS seconds",
            [$today->toDateTimeString(), $today->copy()->addDay()->toDateTimeString()]
        )->first();

        return response()->json(['stats' => [
            'total_broadcasts' => (int) $stats->total,
            'today_broadcasts' => (int) $stats->today,
            'successful_broadcasts' => (int) $stats->correct,
            'failed_broadcasts' => (int) $stats->failures,
            'total_duration_hours' => round($stats->seconds / 3600, 2),
            'uptime_percentage' => $stats->total ? round($stats->correct / $stats->total * 100, 1) : null,
        ]]);
    }

    public function getIncidents()
    {
        $incidentes = ValidacionEmision::with(['itemParrilla.programa', 'inspector'])
            ->whereIn('resultado_qc', ['OBSERVADO', 'RECHAZADO_FALLA_AUDIO', 'RECHAZADO_FALLA_VIDEO', 'RECHAZADO_SIN_MATERIAL'])
            ->orderBy('id', 'desc')
            ->limit(30)
            ->get();

        $list = [];
        foreach ($incidentes as $inc) {
            $list[] = [
                'id' => $inc->id,
                'item_id' => $inc->id_item_parrilla,
                'title' => $inc->itemParrilla?->media_playout['title'] ?? $inc->itemParrilla?->programa?->titulo ?? 'Rechazo QC',
                'incident_type' => 'QC_REJECT',
                'severity' => 'WARNING',
                'details' => $inc->observaciones . ' (Audio: ' . $inc->nivel_audio_db . ' dB, Aspect: ' . $inc->aspect_ratio . ')',
                'created_at' => $inc->fecha_validacion,
                'resolved' => false
            ];
        }

        return response()->json([
            'incidents' => $list
        ]);
    }

    public function playoutCommand(Request $request, $action)
    {
        return response()->json(['message' => 'El transporte se controla desde el reproductor web.'], 501);
    }
}
