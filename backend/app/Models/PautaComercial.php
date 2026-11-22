<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PautaComercial extends Model
{
    protected $table = 'pauta_comercial';
    public $timestamps = false;
    protected $fillable = [
        'id_item_parrilla',
        'id_spot',
        'tanda_bloque',
        'orden',
        'hora_estimada',
        'estado'
    ];

    public function itemParrilla()
    {
        return $this->belongsTo(ItemParrilla::class, 'id_item_parrilla');
    }

    public function spot()
    {
        return $this->belongsTo(SpotPublicitario::class, 'id_spot');
    }
}
