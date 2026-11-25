export interface MediaQuality {
  status: 'APROBADO_TECNICO' | 'OBSERVADO' | 'PENDIENTE';
  checked_at: string;
  issues: string[];
  duration_ms?: number;
  video?: { codec_name?: string; width?: number; height?: number; avg_frame_rate?: string } | null;
  audio?: { codec_name?: string; channels?: number; sample_rate?: string } | null;
}

export const qualityLabels = {
  APROBADO_TECNICO: 'Aprobado técnico',
  OBSERVADO: 'Observado',
  PENDIENTE: 'Pendiente',
};

export interface CatalogFile {
  id: string;
  titulo: string;
  ruta: string;
  duracion_ms: number;
  origen: string;
  qc?: MediaQuality | null;
}

export const mediaHeaders = () => ({
  Accept: 'application/json',
  Authorization: 'Bearer ' + (localStorage.getItem('playout_token') || ''),
});

export type UploadProgress = { phase: 'upload'; percent: number | null } | { phase: 'qc' };

export function uploadProgressLabel(progress: UploadProgress, name: string) {
  if (progress.phase === 'qc') return `Archivo transferido. Analizando ${name}…`;
  return `Subiendo ${name}${progress.percent === null ? '…' : ` · ${progress.percent}%`}`;
}

export async function uploadCatalogVideo(
  file: File,
  programId?: number | null,
  onProgress?: (progress: UploadProgress) => void,
): Promise<CatalogFile> {
  if (!file.size) throw new Error('El archivo está vacío.');
  if (file.size > 500 * 1024 * 1024) throw new Error('El archivo supera el límite de 500 MB.');

  const form = new FormData();
  form.append('video', file);
  form.append('title', file.name.replace(/\.[^.]+$/, '').slice(0, 255) || 'Video');
  if (programId) form.append('program_id', String(programId));

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    let transferred = false;
    let waitTimer: number | undefined;
    const resetWait = (milliseconds: number) => {
      window.clearTimeout(waitTimer);
      waitTimer = window.setTimeout(() => xhr.abort(), milliseconds);
    };
    xhr.open('POST', '/api/parrilla/archivos');
    xhr.timeout = 15 * 60_000;
    Object.entries(mediaHeaders()).forEach(([name, value]) => xhr.setRequestHeader(name, value));
    xhr.upload.onprogress = event => {
      resetWait(60_000);
      onProgress?.({
        phase: 'upload',
        percent: event.lengthComputable ? Math.floor(100 * event.loaded / event.total) : null,
      });
    };
    xhr.upload.onload = () => {
      transferred = true;
      onProgress?.({ phase: 'qc' });
      resetWait(120_000);
    };
    xhr.onloadend = () => window.clearTimeout(waitTimer);
    xhr.onerror = () => reject(new Error('Se interrumpió la conexión durante la subida. Revisa el catálogo antes de volver a enviarla.'));
    xhr.ontimeout = xhr.onabort = () => reject(new Error(transferred
      ? 'El servidor no confirmó el análisis a tiempo. Actualiza el catálogo antes de volver a subir el archivo.'
      : 'La transferencia superó el tiempo de espera. Vuelve a intentar con una conexión estable.'));
    xhr.onload = () => {
      let result: (CatalogFile & { message?: string; errors?: Record<string, string[]> }) | undefined;
      try { result = JSON.parse(xhr.responseText); } catch { /* Some server errors are plain text. */ }
      if (xhr.status >= 200 && xhr.status < 300 && result?.id) {
        resolve(result);
        return;
      }
      const message = xhr.status === 401 ? 'Tu sesión expiró. Vuelve a iniciar sesión.'
        : xhr.status === 413 ? 'El servidor rechazó el tamaño del video.'
        : Object.values(result?.errors ?? {})[0]?.[0] || result?.message || `No se pudo guardar el video (HTTP ${xhr.status}).`;
      reject(new Error(message));
    };
    onProgress?.({ phase: 'upload', percent: 0 });
    resetWait(60_000);
    xhr.send(form);
  });
}
