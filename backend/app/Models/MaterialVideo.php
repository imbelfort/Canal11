<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MaterialVideo extends Model
{
    protected $table = 'material_video';
    public $timestamps = false;
    protected $fillable = [
        'id_programa',
        'codigo_material',
        'titulo_clip',
        'formato',
        'resolucion',
        'duracion_segundos',
        'ruta_servidor',
        'estado',
        'id_responsable',
        'fecha_ingesta',
        'observaciones'
    ];

    public function programa()
    {
        return $this->belongsTo(Programa::class, 'id_programa');
    }

    public function responsable()
    {
        return $this->belongsTo(Usuario::class, 'id_responsable', 'id_usuario');
    }
}
