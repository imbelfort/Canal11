<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('material_video', fn (Blueprint $table) => $table->integer('id_programa')->nullable()->change());
    }

    public function down(): void
    {
        if (DB::table('material_video')->whereNull('id_programa')->exists()) {
            throw new RuntimeException('Hay materiales MAM sin programa. Vincula esos materiales antes de revertir.');
        }

        Schema::table('material_video', fn (Blueprint $table) => $table->integer('id_programa')->nullable(false)->change());
    }
};
