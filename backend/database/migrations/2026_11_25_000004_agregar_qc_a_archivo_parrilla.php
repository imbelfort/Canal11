<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('archivo_parrilla', function (Blueprint $table) {
            $table->json('qc')->nullable();
            $table->integer('id_programa')->nullable()->index();
            $table->foreign('id_programa')->references('id')->on('programa')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('archivo_parrilla', function (Blueprint $table) {
            $table->dropForeign(['id_programa']);
            $table->dropIndex(['id_programa']);
            $table->dropColumn(['qc', 'id_programa']);
        });
    }
};
