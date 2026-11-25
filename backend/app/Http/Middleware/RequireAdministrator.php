<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RequireAdministrator
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        abort_unless(
            $user?->estado === 'ACTIVO' && $user->roles()->where('nombre', 'ADMINISTRADOR')->exists(),
            403
        );

        return $next($request);
    }
}
