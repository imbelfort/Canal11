<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('item_parrilla', function (Blueprint $table) {
            $table->integer('id_programa')->nullable()->change();
            $table->json('media_playout')->nullable();
        });
    }

    public function down(): void
    {
        if (\Illuminate\Support\Facades\DB::table('item_parrilla')->whereNull('id_programa')->exists()) {
            throw new \RuntimeException('Hay bloques directos sin programa. Vincula los bloques antes de revertir.');
        }

        Schema::table('item_parrilla', function (Blueprint $table) {
            $table->integer('id_programa')->nullable(false)->change();
            $table->dropColumn('media_playout');
        });
    }
};
