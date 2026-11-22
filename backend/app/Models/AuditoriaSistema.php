<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AuditoriaSistema extends Model
{
    protected $table = 'auditoria_sistema';
    public $timestamps = false;
    protected $fillable = [
        'id_usuario',
        'tabla_afectada',
        'accion',
        'detalle',
        'fecha_evento'
    ];

    public function usuario()
    {
        return $this->belongsTo(Usuario::class, 'id_usuario', 'id_usuario');
    }
}
