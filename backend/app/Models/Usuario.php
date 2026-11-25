<?php

namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;
use Laravel\Sanctum\HasApiTokens;

class Usuario extends Authenticatable
{
    use HasApiTokens;

    protected $table = 'usuario';
    protected $primaryKey = 'id_usuario';
    public $timestamps = false;

    protected $fillable = [
        'nombre',
        'apellidos',
        'ci',
        'email',
        'telefono',
        'direccion',
        'foto',
        'usuario_sistema',
        'password',
        'estado',
        'fecha_nacimiento',
        'fecha_creacion',
        'fecha_modificacion'
    ];

    protected $hidden = [
        'password',
    ];

    public function roles()
    {
        return $this->belongsToMany(Rol::class, 'usuario_roles', 'id_usuario', 'id_rol');
    }

    public function canScheduleParrilla(): bool
    {
        return $this->roles()->whereIn('nombre', ['ADMINISTRADOR', 'PROGRAMADOR'])->exists();
    }

    public function canIngestMedia(): bool
    {
        return $this->roles()->whereIn('nombre', ['ADMINISTRADOR', 'ENCARGADO_CONTENIDOS'])->exists();
    }

    public function getAuthPassword()
    {
        return $this->password;
    }
}
