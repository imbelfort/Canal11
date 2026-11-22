<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Usuario;
use App\Models\AuditoriaSistema;
use Illuminate\Support\Facades\Hash;
use Carbon\Carbon;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        $login = $request->input('login') ?? $request->input('email') ?? $request->input('usuario_sistema');
        $password = $request->input('password');

        if (!$login || !$password) {
            return response()->json([
                'success' => false,
                'message' => 'Credenciales incompletas. Ingrese usuario/correo y contraseña.'
            ], 422);
        }

        // Buscar por email o usuario_sistema
        $usuario = Usuario::with('roles')
            ->where('email', $login)
            ->orWhere('usuario_sistema', $login)
            ->first();

        if (!$usuario) {
            return response()->json([
                'success' => false,
                'message' => 'Usuario no encontrado en el sistema.'
            ], 404);
        }

        if ($usuario->estado !== 'ACTIVO') {
            return response()->json([
                'success' => false,
                'message' => "El usuario se encuentra {$usuario->estado}."
            ], 403);
        }

        // Verificación de password (texto plano o hash seguro)
        $passwordValid = false;
        if ($usuario->password === $password) {
            $passwordValid = true;
        } elseif (password_verify($password, $usuario->password)) {
            $passwordValid = true;
        }

        if (!$passwordValid) {
            return response()->json([
                'success' => false,
                'message' => 'Contraseña incorrecta.'
            ], 401);
        }

        $roles = $usuario->roles->pluck('nombre')->toArray();
        $token = $usuario->createToken('playout_token')->plainTextToken;

        // Registrar auditoría de inicio de sesión
        AuditoriaSistema::create([
            'id_usuario' => $usuario->id_usuario,
            'tabla_afectada' => 'usuario',
            'accion' => 'LOGIN',
            'detalle' => "Inicio de sesión exitoso desde Frontend ({$login}) con roles: " . implode(', ', $roles),
            'fecha_evento' => Carbon::now()
        ]);

        return response()->json([
            'success' => true,
            'token' => $token,
            'usuario' => [
                'id_usuario' => $usuario->id_usuario,
                'nombre' => $usuario->nombre,
                'apellidos' => $usuario->apellidos,
                'email' => $usuario->email,
                'usuario_sistema' => $usuario->usuario_sistema,
                'ci' => $usuario->ci,
                'roles' => $roles,
                'rol_principal' => $roles[0] ?? 'OPERADOR'
            ]
        ]);
    }

    public function logout(Request $request)
    {
        $user = $request->user();
        if ($user) {
            $user->currentAccessToken()->delete();
        }

        return response()->json(['success' => true, 'message' => 'Sesión cerrada correctamente.']);
    }

    public function me(Request $request)
    {
        $user = $request->user()->load('roles');
        return response()->json([
            'success' => true,
            'usuario' => $user,
            'roles' => $user->roles->pluck('nombre')
        ]);
    }
}
