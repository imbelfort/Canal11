<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ClientePublicitario extends Model
{
    protected $table = 'cliente_publicitario';
    public $timestamps = false;
    protected $fillable = [
        'razon_social',
        'nit',
        'contacto',
        'email',
        'telefono',
        'estado'
    ];

    public function spots()
    {
        return $this->hasMany(SpotPublicitario::class, 'id_cliente');
    }

    public function pagos()
    {
        return $this->hasMany(Pago::class, 'id_cliente');
    }
}
