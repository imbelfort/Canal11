import { isReadyCatalogVideo, qualityLabels, type CatalogFile } from '../../services/parrillaMedia';

export function mediaDuration(ms: number) {
  const seconds = Math.round(ms / 1000);
  return [Math.floor(seconds / 3600), Math.floor(seconds / 60) % 60, seconds % 60]
    .map(part => String(part).padStart(2, '0')).join(':');
}

export function MediaDetails({ file }: { file: CatalogFile }) {
  const qc = file.qc;
  const video = qc?.video;
  const audio = qc?.audio;
  const ready = isReadyCatalogVideo(file);
  const resolution = video?.width && video.height ? `${video.width} × ${video.height}` : file.resolucion;
  const bitrate = Number(video?.bit_rate || qc?.bit_rate || 0);
  const format = [qc?.extension?.toUpperCase(), video?.codec_name?.toUpperCase()].filter(Boolean).join(' / ') || file.formato;
  const [frames, interval = 1] = (video?.avg_frame_rate ?? '').split('/').map(Number);
  const frameRate = interval > 0 && frames > 0 ? `${(frames / interval).toLocaleString('es-BO', { maximumFractionDigits: 2 })} fps` : null;
  const sampleRate = Number(audio?.sample_rate);
  const observations = [...new Set([...(qc?.issues ?? []), file.nota_qc, file.observaciones].filter(Boolean))];
  const state = qc ? qualityLabels[qc.status] : file.estado_mam ? (ready ? 'Listo en MAM' : file.estado_mam) : 'Sin revisar';

  return (
    <div className="program-media-details">
      <span className="audit-status" data-state={ready ? 'EMITIDO_CORRECTO' : qc?.status === 'OBSERVADO' ? 'FALLA_TECNICA' : undefined}>{state}</span>
      <dl>
        <div><dt>Duración</dt><dd>{file.duracion_ms > 0 ? mediaDuration(file.duracion_ms) : '—'}</dd></div>
        <div><dt>Video</dt><dd>{[resolution, format, frameRate, bitrate > 0 ? `${(bitrate / 1_000_000).toFixed(2)} Mbps${video?.bit_rate ? '' : ' total'}` : ''].filter(Boolean).join(' · ') || '—'}</dd></div>
        <div><dt>Audio</dt><dd>{audio ? [audio.codec_name?.toUpperCase(), audio.channels ? `${audio.channels} canales` : '', sampleRate > 0 ? `${sampleRate / 1000} kHz` : ''].filter(Boolean).join(' · ') || 'Sin datos de audio' : video ? 'Sin pista de audio' : 'Sin datos de audio'}</dd></div>
      </dl>
      {observations.length > 0 && <p><strong>Observaciones</strong> · {observations.join(' · ')}</p>}
    </div>
  );
}
