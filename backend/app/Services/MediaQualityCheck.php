<?php

namespace App\Services;

use Illuminate\Support\Facades\Storage;
use Symfony\Component\Process\ExecutableFinder;
use Symfony\Component\Process\Exception\RuntimeException;
use Symfony\Component\Process\Process;

class MediaQualityCheck
{
    public function inspect(string $route, ?callable $onReadMetadata = null): array
    {
        $result = ['status' => 'PENDIENTE', 'checked_at' => now()->toIso8601String()];
        if (!preg_match('~^/api/parrilla/media/([A-Za-z0-9]+\.(?:mp4|webm|ogg|ogv))$~', $route, $matches)) {
            return array_replace($result, ['status' => 'OBSERVADO', 'issues' => ['Ruta de video inválida.']]);
        }

        $disk = Storage::disk('local');
        $path = 'parrilla/' . $matches[1];
        if (!$disk->exists($path)) {
            return array_replace($result, ['status' => 'OBSERVADO', 'issues' => ['El archivo de video no está disponible.']]);
        }

        $result['size_bytes'] = $disk->size($path);
        $result['extension'] = pathinfo($path, PATHINFO_EXTENSION);

        $binary = (new ExecutableFinder())->find('ffprobe');
        if (!$binary) {
            return $result + ['issues' => ['FFprobe no está disponible en el servidor.']];
        }

        if ($onReadMetadata) {
            $onReadMetadata();
        }

        $process = new Process([$binary, '-v', 'error', '-protocol_whitelist', 'file',
            '-show_entries', 'format=duration,format_name,bit_rate:stream=codec_type,codec_name,width,height,avg_frame_rate,bit_rate,channels,sample_rate:stream_disposition=attached_pic',
            '-of', 'json', '-i', $disk->path($path)], timeout: 25);
        try {
            $process->run();
        } catch (RuntimeException) {
            return $result + ['issues' => ['No se pudo completar el análisis en el servidor.']];
        }

        $metadata = json_decode($process->getOutput(), true) ?? [];
        $streams = collect($metadata['streams'] ?? []);
        $video = $streams->first(fn ($stream) => ($stream['codec_type'] ?? '') === 'video' && !($stream['disposition']['attached_pic'] ?? false));
        $audio = $streams->firstWhere('codec_type', 'audio');
        $duration = (int) round((float) ($metadata['format']['duration'] ?? 0) * 1000);
        $issues = [];
        if (!$process->isSuccessful() || !$video || empty($video['width']) || empty($video['height']) || $duration < 1 || $duration > 86400000) {
            $issues[] = 'El archivo no contiene un video con resolución y duración válidas.';
        } elseif (!in_array($video['codec_name'] ?? '', ['h264', 'vp8', 'vp9', 'av1', 'theora'], true)) {
            $issues[] = 'El códec de video no es compatible con el playout web.';
        }

        return array_replace($result, [
            'status' => $issues ? 'OBSERVADO' : 'APROBADO_TECNICO',
            'issues' => $issues,
            'duration_ms' => $duration,
            'format_name' => $metadata['format']['format_name'] ?? null,
            'bit_rate' => isset($metadata['format']['bit_rate']) ? (int) $metadata['format']['bit_rate'] : null,
            'video' => $video,
            'audio' => $audio,
        ]);
    }
}
