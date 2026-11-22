<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Pago extends Model
{
    protected $table = 'pagos';
    public $timestamps = false;
    protected $fillable = [
        'id_cliente',
        'id_spot',
        'monto',
        'moneda',
        'concepto',
        'metodo_pago',
        'estado',
        'transaccion_id',
        'qr_imagen',
        'qr_cadena',
        'fecha_transaccion',
        'fecha_pago',
        'datos_adicionales'
    ];

    protected $casts = [
        'datos_adicionales' => 'array',
        'monto' => 'float'
    ];

    public function cliente()
    {
        return $this->belongsTo(ClientePublicitario::class, 'id_cliente');
    }

    public function spot()
    {
        return $this->belongsTo(SpotPublicitario::class, 'id_spot');
    }
}
