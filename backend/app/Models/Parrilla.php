<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Parrilla extends Model
{
    protected $table = 'parrilla';
    public $timestamps = false;
    protected $fillable = [
        'fecha',
        'canal_senial',
        'descripcion',
        'id_programador',
        'estado',
        'fecha_creacion'
    ];

    public function programador()
    {
        return $this->belongsTo(Usuario::class, 'id_programador', 'id_usuario');
    }

    public function items()
    {
        return $this->hasMany(ItemParrilla::class, 'id_parrilla')->orderBy('hora_inicio', 'asc');
    }
}
