import { useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, Play, Plus, Upload, X } from 'lucide-react';
import { requestJson } from '../../services/api/client';

import { WorkspaceDialog } from '../Common/WorkspaceDialog';
import { CatalogFile, mediaHeaders, qualityLabels, uploadCatalogVideo, uploadProgressLabel } from '../../services/parrillaMedia';

interface Entry {
  key: number;
  file: CatalogFile;
  eventType: 'VIDEO' | 'COMMERCIAL';
}

export function ParrillaComposer({ onSave, onClose }: { onSave: () => void; onClose: () => void }) {
  const [preview, setPreview] = useState<CatalogFile | null>(null);
  const [query, setQuery] = useState('');
  const [catalog, setCatalog] = useState<CatalogFile[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [programs, setPrograms] = useState<{ id: number; titulo: string }[]>([]);
  const [programId, setProgramId] = useState<number | null>(null);
  const [title, setTitle] = useState('');
  const [schedule, setSchedule] = useState('');
  const [notice, setNotice] = useState('');
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');
  const [catalogError, setCatalogError] = useState('');
  const [catalogVersion, setCatalogVersion] = useState(0);
  const nextKey = useRef(0);

  useEffect(() => {
    const controller = new AbortController();
    requestJson<{ id: number; titulo: string }[]>('/api/v1/programas', {
      headers: mediaHeaders(), signal: controller.signal,
    }).then(setPrograms).catch(() => {});
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      requestJson<CatalogFile[]>(`/api/parrilla/archivos?q=${encodeURIComponent(query)}`, {
        headers: mediaHeaders(), signal: controller.signal,
      }).then(files => {
        if (controller.signal.aborted) return;
        setCatalog(files);
        setCatalogError('');
      }).catch(err => {
        if (!controller.signal.aborted) setCatalogError(err.message);
      });
    }, 200);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, catalogVersion]);

  const add = (file: CatalogFile) => {
    const key = ++nextKey.current;
    setEntries(previous => [...previous, { key, file, eventType: 'VIDEO' }]);
  };

  const upload = async (files: File[]) => {
    if (!files.length) return;
    setError('');
    setNotice('');
    let ready = 0;
    const held: string[] = [];
    try {
      for (const [index, file] of files.entries()) {
        const saved = await uploadCatalogVideo(file, programId, value =>
          setProgress(`${index + 1}/${files.length} · ${uploadProgressLabel(value, file.name)}`));
        if (saved.qc?.status === 'APROBADO_TECNICO') {
          add(saved);
          ready++;
        } else {
          held.push(saved.titulo);
        }
      }
      if (held.length) setError(`Revisa en Control de calidad: ${held.join(', ')}.`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      if (ready) setNotice(`${ready} ${ready === 1 ? 'archivo agregado' : 'archivos agregados'} al orden de salida.`);
      setProgress('');
      setCatalogVersion(version => version + 1);
    }
  };

  const move = (index: number, offset: number) => {
    setEntries(previous => {
      const next = [...previous];
      [next[index], next[index + offset]] = [next[index + offset], next[index]];
      return next;
    });
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setProgress('Guardando bloque…');
    try {
      await requestJson('/api/parrilla/bloques', {
        method: 'POST',
        headers: { ...mediaHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          program_title: title.trim() || null,
          program_id: programId,
          scheduled_time: schedule || null,
          entries: entries.map(entry => ({ file_id: entry.file.id, event_type: entry.eventType })),
        }),
      });
      onSave();
    } catch (err) {
      setError((err as Error).message);
      setProgress('');
    }
  };

  const busy = Boolean(progress);
  const cuts = entries.filter(entry => entry.eventType === 'COMMERCIAL').length;
  return (
    <WorkspaceDialog wide title="Armar bloque de Parrilla" description="Selecciona los archivos y ordénalos como deben salir al aire." busy={busy} onClose={onClose}>
    <form className="parrilla-composer workspace-dialog-body" onSubmit={save}>
      {error && <p className="operations-error" role="alert">{error}</p>}
      {(progress || notice) && <p role="status">{progress || notice}</p>}
      <div className="parrilla-compose-fields">
        <label>Programa <small>Opcional</small>
          <input value={title} maxLength={200} disabled={busy} onChange={event => {
            setTitle(event.target.value);
            setProgramId(null);
          }} placeholder="Ej. Noticiero central" />
        </label>
        {programs.length > 0 && <label>Usar programa del BMS
          <select value={programId ?? ''} disabled={busy} onChange={event => {
            const program = programs.find(item => item.id === Number(event.target.value));
            setProgramId(program?.id ?? null);
            if (program) setTitle(program.titulo);
          }}>
            <option value="">Elegir del catálogo</option>
            {programs.map(program => <option key={program.id} value={program.id}>{program.titulo}</option>)}
          </select>
        </label>}
        <label>Hora de inicio <small>Opcional</small><input type="time" value={schedule} disabled={busy} onChange={event => setSchedule(event.target.value)} /></label>
      </div>
      <div className="parrilla-grid">
        <section>
          <h3>Catálogo de archivos <small>{catalog.length} encontrados</small></h3>
          <div className="operations-actions">
            <input type="search" placeholder="Buscar archivo" aria-label="Buscar archivo" value={query} onChange={event => setQuery(event.target.value)} />
            <label className="operations-upload">
              <Upload size={16} /> Subir videos
              <input type="file" aria-label="Subir videos" multiple disabled={busy} accept="video/mp4,video/webm,video/ogg,.ogv" onChange={event => {
                const files = Array.from(event.currentTarget.files ?? []);
                event.currentTarget.value = '';
                void upload(files);
              }} />
            </label>
          </div>
          {catalogError && <p role="alert">{catalogError}</p>}
          <ul className="parrilla-catalog">
            {catalog.map(file => (
              <li key={file.id}>
                <span>{file.titulo}<small>{file.origen} · {Math.round(file.duracion_ms / 1000)} s</small></span>
                <div className="operations-actions">
                  <button type="button" aria-label={`Ver ${file.titulo}`} onClick={() => setPreview(file)}><Play size={16} /></button>
                  <button type="button" disabled={busy || Boolean(file.qc && file.qc.status !== 'APROBADO_TECNICO')} onClick={() => add(file)} aria-label={`Agregar ${file.titulo}`}><Plus size={16} /></button>
                </div>
              </li>
            ))}
          </ul>

        </section>
        <section>
          <h3>Orden de salida <small>{entries.length - cuts} segmentos · {cuts} cortes</small></h3>
          {!entries.length && <p>Selecciona archivos del catálogo o sube videos desde tu equipo.</p>}
          <ol className="parrilla-draft">
            {entries.map(({ key, file, eventType }, index) => (
              <li key={key}>
                <span>{file.titulo}</span>
                <select aria-label={`Tipo de ${file.titulo}`} value={eventType} disabled={busy} onChange={event => {
                  const value = event.target.value as Entry['eventType'];
                  setEntries(previous => previous.map(entry => entry.key === key ? { ...entry, eventType: value } : entry));
                }}>
                  <option value="VIDEO">Segmento</option>
                  <option value="COMMERCIAL">Corte</option>
                </select>
                <div className="operations-actions">
                  <button type="button" aria-label={`Subir ${file.titulo}`} disabled={busy || index === 0} onClick={() => move(index, -1)}><ArrowUp size={14} /></button>
                  <button type="button" aria-label={`Bajar ${file.titulo}`} disabled={busy || index === entries.length - 1} onClick={() => move(index, 1)}><ArrowDown size={14} /></button>
                  <button type="button" aria-label={`Quitar ${file.titulo}`} disabled={busy} onClick={() => setEntries(previous => previous.filter(entry => entry.key !== key))}><X size={14} /></button>
                </div>
              </li>
            ))}
          </ol>
        </section>
      </div>
      <div className="operations-actions"><button type="submit" disabled={busy || !entries.length}><Plus size={16} /> Agregar a la Parrilla</button></div>
    </form>
    {preview && <WorkspaceDialog title={preview.titulo} onClose={() => setPreview(null)}>
      <div className="workspace-dialog-body">
        <video className="workspace-video" src={preview.ruta} controls playsInline preload="metadata" />
      </div>
    </WorkspaceDialog>}
    </WorkspaceDialog>
  );
}
