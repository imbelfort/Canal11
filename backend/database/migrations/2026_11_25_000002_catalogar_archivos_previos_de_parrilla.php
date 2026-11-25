<?php

use App\Models\ItemParrilla;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

return new class extends Migration
{
    public function up(): void
    {
        $disk = Storage::disk('local');
        ItemParrilla::query()->whereNotNull('media_playout')->select(['id', 'media_playout'])
            ->chunkById(200, function ($items) use ($disk) {
                $files = [];
                foreach ($items as $item) {
                    $media = $item->media_playout;
                    $route = $media['file_path'] ?? '';
                    $duration = (int) ($media['duration_ms'] ?? 0);
                    if ($duration < 1 || !preg_match('~^/api/parrilla/media/[a-zA-Z0-9]+\.(mp4|webm|ogg|ogv)$~', $route)
                        || !$disk->exists('parrilla/' . basename($route))) {
                        continue;
                    }
                    $files[$route] = [
                        'titulo' => $media['title'],
                        'ruta' => $route,
                        'duracion_ms' => $duration,
                    ];
                }
                if ($files) {
                    DB::table('archivo_parrilla')->insertOrIgnore(array_values($files));
                }
            });
    }

    public function down(): void
    {
        // Retain files that operators may have reused since the backfill.
    }
};
