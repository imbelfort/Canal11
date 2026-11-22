<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\PlayoutBmsController;

/*
|--------------------------------------------------------------------------
| Rutas API - Sistema BMS Playout Canal 11 Grupo 12 SC
|--------------------------------------------------------------------------
*/

// Rutas Públicas de Autenticación
Route::post('/auth/login', [AuthController::class, 'login']);

// Buscador Global tipo Gmail (Público/Autenticado)
Route::get('/search', [PlayoutBmsController::class, 'search']);

// Rutas de PagoFácil Callback / Consulta
Route::get('/pagos', [PlayoutBmsController::class, 'getPagos']);
Route::post('/pagos/generar-qr', [PlayoutBmsController::class, 'generarPagoQr']);
Route::get('/pagos/consultar/{transaccionId}', [PlayoutBmsController::class, 'consultarPagoQr']);
Route::post('/pagos/callback', [PlayoutBmsController::class, 'handlePagoFacilCallback']);
Route::post('/pagos/confirmar/{transaccionId}', [PlayoutBmsController::class, 'confirmarPago']);

// Rutas de Playout Web, Auditoría e Incidentes
Route::get('/playlist', [PlayoutBmsController::class, 'getPlayoutPlaylist']);
Route::post('/playlist/replace', [PlayoutBmsController::class, 'replacePlayoutPlaylist']);
Route::post('/playlist/items', [PlayoutBmsController::class, 'addPlayoutItem']);
Route::delete('/playlist/items/{id}', [PlayoutBmsController::class, 'deletePlayoutItem']);
Route::post('/playlist/clear', [PlayoutBmsController::class, 'clearPlayoutPlaylist']);

Route::get('/audit/logs', [PlayoutBmsController::class, 'getAuditLogs']);
Route::get('/audit/stats', [PlayoutBmsController::class, 'getAuditStats']);
Route::get('/audit/incidents', [PlayoutBmsController::class, 'getIncidents']);

Route::post('/playout/{action}', [PlayoutBmsController::class, 'playoutCommand']);

// Rutas Operativas del Sistema Playout (CU1 a CU8)
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/auth/me', [AuthController::class, 'me']);
    Route::post('/auth/logout', [AuthController::class, 'logout']);
});

// Rutas accesibles para sincronización con frontend
Route::prefix('v1')->group(function () {
    // CU1: Usuarios y Roles
    Route::get('/usuarios', [PlayoutBmsController::class, 'getUsuarios']);
    Route::post('/usuarios', [PlayoutBmsController::class, 'createUsuario']);
    Route::put('/usuarios/{id}', [PlayoutBmsController::class, 'updateUsuario']);
    Route::delete('/usuarios/{id}', [PlayoutBmsController::class, 'deleteUsuario']);
    Route::get('/roles', [PlayoutBmsController::class, 'getRoles']);
    Route::get('/auditoria', [PlayoutBmsController::class, 'getAuditoria']);

    // CU2: Catálogo de Programas y Categorías
    Route::get('/categorias', [PlayoutBmsController::class, 'getCategorias']);
    Route::post('/categorias', [PlayoutBmsController::class, 'createCategoria']);
    Route::get('/programas', [PlayoutBmsController::class, 'getProgramas']);
    Route::post('/programas', [PlayoutBmsController::class, 'createPrograma']);

    // CU3: Parrilla de Programación
    Route::get('/parrillas', [PlayoutBmsController::class, 'getParrillas']);
    Route::get('/parrilla/hoy', [PlayoutBmsController::class, 'getParrillaHoy']);
    Route::post('/parrillas', [PlayoutBmsController::class, 'createParrilla']);
    Route::put('/parrillas/{id}/estado', [PlayoutBmsController::class, 'updateParrillaEstado']);
    Route::post('/items', [PlayoutBmsController::class, 'addItemParrilla']);
    Route::delete('/items/{id}', [PlayoutBmsController::class, 'deleteItemParrilla']);

    // CU4: MAM - Materiales de Video
    Route::get('/materiales', [PlayoutBmsController::class, 'getMateriales']);
    Route::post('/materiales', [PlayoutBmsController::class, 'createMaterial']);
    Route::put('/materiales/{id}/estado', [PlayoutBmsController::class, 'updateMaterialEstado']);

    // CU5: Control de Calidad QC
    Route::get('/validaciones', [PlayoutBmsController::class, 'getValidaciones']);
    Route::post('/validaciones', [PlayoutBmsController::class, 'validarItem']);

    // CU6: Pautas, Spots y Clientes
    Route::get('/clientes', [PlayoutBmsController::class, 'getClientes']);
    Route::post('/clientes', [PlayoutBmsController::class, 'createCliente']);
    Route::get('/spots', [PlayoutBmsController::class, 'getSpots']);
    Route::post('/spots', [PlayoutBmsController::class, 'createSpot']);
    Route::get('/pautas', [PlayoutBmsController::class, 'getPautas']);
    Route::post('/pautas', [PlayoutBmsController::class, 'createPauta']);

    // CU7: Emisión Real (As-Run Log)
    Route::get('/emisiones', [PlayoutBmsController::class, 'getEmisiones']);
    Route::post('/emisiones/conciliar', [PlayoutBmsController::class, 'conciliarEmision']);

    // CU8: Reportes Estadísticos
    Route::get('/reportes/general', [PlayoutBmsController::class, 'getReporteGeneral']);

    // Buscador
    Route::get('/search', [PlayoutBmsController::class, 'search']);
});
