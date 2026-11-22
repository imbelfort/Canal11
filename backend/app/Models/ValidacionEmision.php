<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ValidacionEmision extends Model
{
    protected $table = 'validacion_emision';
    public $timestamps = false;
    protected $fillable = [
        'id_item_parrilla',
        'id_material_video',
        'id_inspector_qc',
        'resultado_qc',
        'aspect_ratio',
        'nivel_audio_db',
        'observaciones',
        'fecha_validacion'
    ];

    public function itemParrilla()
    {
        return $this->belongsTo(ItemParrilla::class, 'id_item_parrilla');
    }

    public function materialVideo()
    {
        return $this->belongsTo(MaterialVideo::class, 'id_material_video');
    }

    public function inspector()
    {
        return $this->belongsTo(Usuario::class, 'id_inspector_qc', 'id_usuario');
    }
}
