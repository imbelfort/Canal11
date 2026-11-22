<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ItemParrilla extends Model
{
    protected $table = 'item_parrilla';
    public $timestamps = false;
    protected $fillable = [
        'id_parrilla',
        'id_programa',
        'hora_inicio',
        'hora_fin',
        'tipo_emision',
        'estado',
        'observaciones'
    ];

    public function parrilla()
    {
        return $this->belongsTo(Parrilla::class, 'id_parrilla');
    }

    public function programa()
    {
        return $this->belongsTo(Programa::class, 'id_programa');
    }

    public function validaciones()
    {
        return $this->hasMany(ValidacionEmision::class, 'id_item_parrilla');
    }

    public function pautas()
    {
        return $this->hasMany(PautaComercial::class, 'id_item_parrilla')->orderBy('orden', 'asc');
    }

    public function emisionesReales()
    {
        return $this->hasMany(EmisionRealLog::class, 'id_item_parrilla');
    }
}
