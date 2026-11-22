<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SpotPublicitario extends Model
{
    protected $table = 'spot_publicitario';
    public $timestamps = false;
    protected $fillable = [
        'id_cliente',
        'codigo_spot',
        'titulo_spot',
        'duracion_segundos',
        'fecha_vigencia_inicio',
        'fecha_vigencia_fin',
        'estado'
    ];

    public function cliente()
    {
        return $this->belongsTo(ClientePublicitario::class, 'id_cliente');
    }

    public function pautas()
    {
        return $this->hasMany(PautaComercial::class, 'id_spot');
    }
}
