<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class EmisionRealLog extends Model
{
    protected $table = 'emision_real_log';
    public $timestamps = false;
    protected $fillable = [
        'id_item_parrilla',
        'id_pauta_comercial',
        'id_material_video',
        'hora_inicio_real',
        'hora_fin_real',
        'duracion_real_segundos',
        'discrepancia_segundos',
        'estado_emision',
        'operador_emision',
        'observaciones',
        'fecha_registro'
    ];

    public function pauta()
    {
        return $this->belongsTo(PautaComercial::class, 'id_pauta_comercial');
    }

    public function itemParrilla()
    {
        return $this->belongsTo(ItemParrilla::class, 'id_item_parrilla');
    }

    public function materialVideo()
    {
        return $this->belongsTo(MaterialVideo::class, 'id_material_video');
    }
}
