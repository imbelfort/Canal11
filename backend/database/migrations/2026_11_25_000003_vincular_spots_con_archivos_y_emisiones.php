<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('spot_publicitario', function (Blueprint $table) {
            $table->foreignId('id_archivo_parrilla')->nullable()->constrained('archivo_parrilla');
        });
        Schema::table('emision_real_log', function (Blueprint $table) {
            $table->foreignId('id_pauta_comercial')->nullable()->constrained('pauta_comercial');
        });
    }

    public function down(): void
    {
        Schema::table('emision_real_log', fn (Blueprint $table) => $table->dropConstrainedForeignId('id_pauta_comercial'));
        Schema::table('spot_publicitario', fn (Blueprint $table) => $table->dropConstrainedForeignId('id_archivo_parrilla'));
    }
};
