<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Programa extends Model
{
    protected $table = 'programa';
    public $timestamps = false;
    protected $fillable = [
        'codigo',
        'titulo',
        'descripcion',
        'id_categoria',
        'clasificacion_edad',
        'duracion_estandar_minutos',
        'origen',
        'estado',
        'fecha_registro'
    ];

    public function categoria()
    {
        return $this->belongsTo(CategoriaPrograma::class, 'id_categoria');
    }

    public function materiales()
    {
        return $this->hasMany(MaterialVideo::class, 'id_programa');
    }

    public function itemsParrilla()
    {
        return $this->hasMany(ItemParrilla::class, 'id_programa');
    }
}
