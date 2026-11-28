<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SpotPublicitario extends Model
{
    protected $table = 'spot_publicitario';
    public $timestamps = false;
    protected $fillable = [
        'id_cliente',
        'id_archivo_parrilla',
        'codigo_spot',
        'titulo_spot',
        'duracion_segundos',
        'fecha_vigencia_inicio',
        'fecha_vigencia_fin',
        'estado'
    ];

    public function archivo()
    {
        return $this->belongsTo(ArchivoParrilla::class, 'id_archivo_parrilla');
    }

    public function cliente()
    {
        return $this->belongsTo(ClientePublicitario::class, 'id_cliente');
    }

    public function pautas()
    {
        return $this->hasMany(PautaComercial::class, 'id_spot');
    }

    public function vigenteEn(string $date): bool
    {
        return $this->estado === 'ACTIVO' && $this->fecha_vigencia_inicio <= $date && $date <= $this->fecha_vigencia_fin;
    }
}
