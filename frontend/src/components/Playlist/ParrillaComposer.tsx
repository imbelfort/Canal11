import { useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, GripVertical, Play, Plus, X } from 'lucide-react';
import { requestJson } from '../../services/api/client';
import { WorkspaceDialog } from '../Common/WorkspaceDialog';
import { MediaDetails, mediaDuration } from '../Common/MediaDetails';
import { type CatalogFile, isReadyCatalogVideo, mediaHeaders } from '../../services/parrillaMedia';

interface Entry {
  key: number;
  file: CatalogFile;
  eventType: 'VIDEO' | 'COMMERCIAL';
  automatic?: boolean;
}

interface Spot {
  id: number;
  titulo_spot: string;
  estado: string;
  cliente?: { razon_social: string };
  archivo?: { ruta: string; duracion_ms: number; qc?: { status: string } };
}

export function ParrillaComposer({ onSave, onClose }: { onSave: (count: number, startsAt: string, scheduled: boolean) => void; onClose: () => void }) {
  const [preview, setPreview] = useState<CatalogFile | null>(null);
  const [library, setLibrary] = useState<'program' | 'videos' | 'spots'>('videos');
  const [query, setQuery] = useState('');
  const [programFiles, setProgramFiles] = useState<CatalogFile[]>([]);
  const [catalog, setCatalog] = useState<CatalogFile[]>([]);
  const [spots, setSpots] = useState<Spot[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [programs, setPrograms] = useState<{ id: number; titulo: string }[]>([]);
  const [programId, setProgramId] = useState<number | null>(null);
  const [title, setTitle] = useState('');
  const [scheduleMode, setScheduleMode] = useState<'now' | 'scheduled'>('now');
  const [schedule, setSchedule] = useState('');
  const [saving, setSaving] = useState(false);
  const [loadingProgram, setLoadingProgram] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [catalogError, setCatalogError] = useState('');
  const nextKey = useRef(0);
  const programRequest = useRef<AbortController | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const options = { headers: mediaHeaders(), signal: controller.signal };
    requestJson<{ id: number; titulo: string }[]>('/api/v1/programas', options)
      .then(setPrograms).catch(err => { if (!controller.signal.aborted) setError(err.message); });
    requestJson<Spot[]>('/api/v1/spots', options)
      .then(setSpots).catch(err => { if (!controller.signal.aborted) setError(err.message); });
    return () => { controller.abort(); programRequest.current?.abort(); };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      requestJson<CatalogFile[]>(`/api/parrilla/archivos?ready=1&q=${encodeURIComponent(query)}`, {
        headers: mediaHeaders(), signal: controller.signal,
      }).then(files => {
        if (!controller.signal.aborted) { setCatalog(files); setCatalogError(''); }
      }).catch(err => {
        if (!controller.signal.aborted) setCatalogError(err.message);
      });
    }, 160);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [query]);

  const chooseProgram = async (id: number | null) => {
    programRequest.current?.abort();
    setProgramId(id);
    setProgramFiles([]);
    setLibrary(id ? 'program' : 'videos');
    setQuery('');
    setError('');
    setNotice('');
    setEntries(previous => previous.filter(entry => !entry.automatic));
    setSelected(null);
    if (!id) { setTitle(''); setLoadingProgram(false); return; }

    const controller = new AbortController();
    programRequest.current = controller;
    setTitle(programs.find(program => program.id === id)?.titulo ?? '');
    setLoadingProgram(true);
    try {
      const files = await requestJson<CatalogFile[]>(`/api/parrilla/archivos?program_id=${id}`, {
        headers: mediaHeaders(), signal: controller.signal,
      });
      if (controller.signal.aborted) return;
      setProgramFiles(files);
      const readyFiles = files.filter(isReadyCatalogVideo);
      const manual = entries.filter(entry => !entry.automatic);
      const existing = new Set(manual.map(entry => entry.file.id));
      const added: Entry[] = readyFiles.filter(file => !existing.has(file.id)).slice(0, Math.max(0, 100 - manual.length))
        .map(file => ({ key: ++nextKey.current, file, eventType: 'VIDEO', automatic: true }));
      setEntries(previous => [...added, ...previous]);
      setNotice(added.length
        ? `${added.length} ${added.length === 1 ? 'video agregado' : 'videos agregados'} del programa.${readyFiles.length > added.length ? ' Revisa el límite de 100 elementos o los que ya estaban agregados.' : ''}`
        : files.length ? 'Los videos del programa ya están en el borrador.' : 'Este programa todavía no tiene videos aprobados.');
    } catch (err) {
      if (!controller.signal.aborted) setError((err as Error).message);
    } finally {
      if (!controller.signal.aborted) setLoadingProgram(false);
    }
  };

  const add = (file: CatalogFile, eventType: Entry['eventType']) => {
    if (entries.length >= 100) return;
    const key = ++nextKey.current;
    setEntries(previous => {
      const index = previous.findIndex(entry => entry.key === selected);
      const position = index < 0 ? previous.length : index + 1;
      return [...previous.slice(0, position), { key, file, eventType }, ...previous.slice(position)];
    });
    setSelected(key);
    setNotice(`${file.titulo} se agregó al orden de salida.`);
  };

  const move = (key: number, targetKey: number) => {
    setEntries(previous => {
      const from = previous.findIndex(item => item.key === key);
      const to = previous.findIndex(item => item.key === targetKey);
      if (from < 0 || to < 0 || from === to) return previous;
      const next = [...previous];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (saving || loadingProgram || !entries.length) return;
    setError('');
    setSaving(true);
    try {
      const result = await requestJson<{ items: { scheduled_time: string }[] }>('/api/parrilla/bloques', {
        method: 'POST',
        headers: { ...mediaHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          program_title: title.trim() || null,
          program_id: programId,
          scheduled_time: scheduleMode === 'scheduled' ? schedule : null,
          entries: entries.map(entry => ({ file_id: entry.file.id, event_type: entry.eventType })),
        }),
      });
      onSave(result.items.length, result.items[0].scheduled_time, scheduleMode === 'scheduled');
    } catch (err) {
      setError((err as Error).message);
      setSaving(false);
    }
  };

  const busy = saving || loadingProgram;
  const filteredSpots = spots.filter(spot => spot.estado === 'ACTIVO' &&
    `${spot.titulo_spot} ${spot.cliente?.razon_social ?? ''}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
  const visibleFiles = library === 'program'
    ? programFiles.filter(file => file.titulo.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()))
    : catalog;
  const cuts = entries.filter(entry => entry.eventType === 'COMMERCIAL').length;

  return (
    <WorkspaceDialog wide="full" title="Armar bloque de Parrilla" busy={saving} onClose={onClose}>
      <form className="parrilla-composer workspace-dialog-body" onSubmit={save}>
        <div className="parrilla-compose-fields">
          <label>Programa del catálogo
            <select value={programId ?? ''} disabled={saving} onChange={event => void chooseProgram(Number(event.target.value) || null)}>
              <option value="">Bloque libre</option>
              {programs.map(program => <option key={program.id} value={program.id}>{program.titulo}</option>)}
            </select>
          </label>
          {!programId && <label>Nombre del bloque <small>Opcional</small>
            <input value={title} maxLength={200} disabled={busy} onChange={event => setTitle(event.target.value)} placeholder="Ej. Especial de la tarde" />
          </label>}
          <label>Inicio
            <select value={scheduleMode} disabled={busy} onChange={event => setScheduleMode(event.target.value === 'scheduled' ? 'scheduled' : 'now')}>
              <option value="now">Iniciar ahora</option>
              <option value="scheduled">Programar hora</option>
            </select>
          </label>
          {scheduleMode === 'scheduled' && <label>Hora de Bolivia
            <input type="time" value={schedule} required disabled={busy} onChange={event => setSchedule(event.target.value)} />
          </label>}
        </div>
        <div className="parrilla-grid builder-workspace">
          <section>
            <h3>Biblioteca</h3>
            <div className="operations-actions builder-library-tabs" aria-label="Tipo de contenido">
              {programId && <button type="button" aria-pressed={library === 'program'} onClick={() => { setLibrary('program'); setQuery(''); }}>Del programa ({programFiles.length})</button>}
              <button type="button" aria-pressed={library === 'videos'} onClick={() => { setLibrary('videos'); setQuery(''); }}>Videos</button>
              <button type="button" aria-pressed={library === 'spots'} onClick={() => { setLibrary('spots'); setQuery(''); }}>Spots</button>
            </div>
            <input type="search" aria-label={library === 'spots' ? 'Buscar spot' : 'Buscar video'} placeholder={library === 'spots' ? 'Buscar spot o anunciante' : 'Buscar video'} value={query} maxLength={150} onChange={event => setQuery(event.target.value)} />
            {library !== 'spots' ? <>
              {library === 'videos' && catalogError && <p role="alert">{catalogError}</p>}
              {loadingProgram && library === 'program' && <p role="status">Cargando los archivos del programa…</p>}
              {!visibleFiles.length && !loadingProgram && !catalogError && <p>No hay archivos para esta búsqueda.</p>}
              <ul className="parrilla-catalog program-media-list">
                {visibleFiles.map(file => {
                  const ready = isReadyCatalogVideo(file);
                  return <li key={file.id}>
                    <div className="program-media-heading">
                      <strong>{file.titulo}</strong>
                      <div className="operations-actions">
                        {/^(?:https?:\/\/|\/(?!\/))/i.test(file.ruta ?? '') && <button type="button" aria-label={`Ver ${file.titulo}`} onClick={() => setPreview(file)}><Play size={16} /></button>}
                        <button type="button" disabled={!ready || busy || entries.length >= 100} onClick={() => add(file, 'VIDEO')} aria-label={`Agregar ${file.titulo}`}><Plus size={16} /></button>
                      </div>
                    </div>
                    <MediaDetails file={file} />
                  </li>;
                })}
              </ul>
            </> : <>
              {!filteredSpots.length && <p>No hay spots activos para esta búsqueda.</p>}
              <ul className="parrilla-catalog">
                {filteredSpots.map(spot => {
                  const ready = spot.archivo?.qc?.status === 'APROBADO_TECNICO';
                  return <li key={spot.id}>
                    <span>{spot.titulo_spot}<small>{spot.cliente?.razon_social}{spot.cliente && ' · '}{ready && spot.archivo ? mediaDuration(spot.archivo.duracion_ms) : 'Requiere video aprobado'}</small></span>
                    <div className="operations-actions">
                      <button type="button" disabled={busy || !ready || entries.length >= 100} aria-label={`Agregar spot ${spot.titulo_spot}`} onClick={() => {
                        if (spot.archivo && ready) add({ id: `spot:${spot.id}`, titulo: spot.titulo_spot, ruta: spot.archivo.ruta, duracion_ms: spot.archivo.duracion_ms, origen: 'Spot' }, 'COMMERCIAL');
                      }}><Plus size={16} /></button>
                    </div>
                  </li>;
                })}
              </ul>
            </>}
          </section>
          <section>
            <h3>Orden de salida <small>{entries.length - cuts} segmentos · {cuts} cortes</small></h3>
            <p>Selecciona una fila para insertar después. Arrastra o usa las flechas para ordenar.</p>
            <ol className="parrilla-draft">
              {entries.map(({ key, file, eventType }, index) => (
                <li key={key} data-selected={selected === key} data-cut={eventType === 'COMMERCIAL'} draggable={!busy}
                  onDragStart={event => { event.dataTransfer.setData('text/plain', String(key)); setSelected(key); }}
                  onDragOver={event => { if (!busy) event.preventDefault(); }}
                  onDrop={event => { event.preventDefault(); if (!busy) move(Number(event.dataTransfer.getData('text/plain')), key); }}>
                  <GripVertical size={15} aria-hidden="true" />
                  <button type="button" className="builder-entry-title" aria-pressed={selected === key} disabled={busy} onClick={() => setSelected(selected === key ? null : key)}>
                    {file.titulo}<small>{file.id.startsWith('spot:') ? 'Spot' : eventType === 'COMMERCIAL' ? 'Corte' : 'Segmento'} · {mediaDuration(file.duracion_ms)}</small>
                  </button>
                  {!file.id.startsWith('spot:') && <select aria-label={`Tipo de ${file.titulo}`} value={eventType} disabled={busy} onChange={event => {
                    const value = event.target.value as Entry['eventType'];
                    setEntries(previous => previous.map(entry => entry.key === key ? { ...entry, eventType: value } : entry));
                  }}>
                    <option value="VIDEO">Segmento</option><option value="COMMERCIAL">Corte</option>
                  </select>}
                  <div className="operations-actions">
                    <button type="button" aria-label={`Subir ${file.titulo}`} disabled={busy || index === 0} onClick={() => move(key, entries[index - 1].key)}><ArrowUp size={14} /></button>
                    <button type="button" aria-label={`Bajar ${file.titulo}`} disabled={busy || index === entries.length - 1} onClick={() => move(key, entries[index + 1].key)}><ArrowDown size={14} /></button>
                    <button type="button" aria-label={`Quitar ${file.titulo}`} disabled={busy} onClick={() => {
                      if (selected === key) setSelected(null);
                      setEntries(previous => previous.filter(entry => entry.key !== key));
                    }}><X size={14} /></button>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        </div>
        <footer className="builder-save">
          <div>
            <strong>{entries.length} elementos · {mediaDuration(entries.reduce((sum, entry) => sum + entry.file.duracion_ms, 0))}</strong>
            <p role="status">{loadingProgram ? 'Buscando los videos aprobados del programa…' : notice}</p>
            {error && <p role="alert" className="operations-error">{error}</p>}
          </div>
          <div className="operations-actions">
            <button type="submit" className="parrilla-primary" disabled={busy || !entries.length || (scheduleMode === 'scheduled' && !schedule)}><Plus size={16} /> {saving ? 'Guardando…' : 'Guardar en Parrilla'}</button>
          </div>
        </footer>
      </form>
      {preview && <WorkspaceDialog title={preview.titulo} onClose={() => setPreview(null)}>
        <div className="workspace-dialog-body"><video className="workspace-video" src={preview.ruta} controls playsInline preload="metadata" /></div>
      </WorkspaceDialog>}
    </WorkspaceDialog>
  );
}
