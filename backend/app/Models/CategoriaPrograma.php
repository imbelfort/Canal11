<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CategoriaPrograma extends Model
{
    protected $table = 'categoria_programa';
    public $timestamps = false;
    protected $fillable = ['nombre', 'descripcion', 'estado'];

    public function programas()
    {
        return $this->hasMany(Programa::class, 'id_categoria');
    }
}
