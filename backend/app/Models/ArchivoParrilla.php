<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ArchivoParrilla extends Model
{
    protected $table = 'archivo_parrilla';
    public $timestamps = false;
    protected $fillable = ['titulo', 'ruta', 'duracion_ms', 'id_programa', 'qc'];
    protected $casts = ['qc' => 'array'];

    public function programa()
    {
        return $this->belongsTo(Programa::class, 'id_programa');
    }

    public function spots()
    {
        return $this->hasMany(SpotPublicitario::class, 'id_archivo_parrilla');
    }

    public function bloqueadoPorQc(): bool
    {
        return $this->qc !== null && $this->qc['status'] !== 'APROBADO_TECNICO';
    }

}
