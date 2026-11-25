<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('archivo_parrilla', function (Blueprint $table) {
            $table->id();
            $table->string('titulo');
            $table->string('ruta')->unique();
            $table->unsignedInteger('duracion_ms');
            $table->timestamp('created_at')->useCurrent();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('archivo_parrilla');
    }
};
