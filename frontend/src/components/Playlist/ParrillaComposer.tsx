import { useToast } from '../../context/ToastContext';
import { useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, GripVertical, Play, Plus, X } from 'lucide-react';
import { requestJson } from '../../services/api/client';
import { bmsApi, programOrigins, programRatings, type CatalogProgram } from '../../services/bmsApi';
import { WorkspaceDialog } from '../Common/WorkspaceDialog';
import { MediaDetails, mediaDuration } from '../Common/MediaDetails';
import { type CatalogFile, type MediaQuality, isReadyCatalogVideo, mediaHeaders } from '../../services/parrillaMedia';
import { ProgramEditor } from '../BmsViews/ProgramEditor';

interface Entry {
  key: number;
  file: CatalogFile;
  eventType: 'VIDEO' | 'COMMERCIAL';
}

interface Spot {
  id: number;
  titulo_spot: string;
  estado: string;
  cliente?: { razon_social: string };
  archivo?: { ruta: string; duracion_ms: number; qc?: MediaQuality };
}

const boliviaClock = new Intl.DateTimeFormat('en-GB', { timeZone: 'America/La_Paz', timeStyle: 'medium', hourCycle: 'h23' });
const secondsOfDay = (time: string) => time.split(':').reduce((total, part) => total * 60 + Number(part), 0);
const clockLabel = (seconds: number) => mediaDuration(seconds * 1000);
const videoPath = /^(?:https?:\/\/|\/(?!\/))/i;

export function ParrillaComposer({ published, onSave, onClose }: { published: boolean; onSave: (count: number, startsAt: string, scheduled: boolean) => void; onClose: () => void }) {
  const notify = useToast();
  const [preview, setPreview] = useState<CatalogFile | null>(null);
  const [library, setLibrary] = useState<'program' | 'videos' | 'spots'>('videos');
  const [query, setQuery] = useState('');
  const [programFiles, setProgramFiles] = useState<CatalogFile[]>([]);
  const [catalog, setCatalog] = useState<CatalogFile[]>([]);
  const [spots, setSpots] = useState<Spot[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [programs, setPrograms] = useState<CatalogProgram[]>([]);
  const [editingProgram, setEditingProgram] = useState(false);
  const [programId, setProgramId] = useState<number | null>(null);
  const [title, setTitle] = useState('');
  const [scheduleMode, setScheduleMode] = useState<'now' | 'scheduled'>(published ? 'now' : 'scheduled');
  const [schedule, setSchedule] = useState('');
  const [saving, setSaving] = useState(false);
  const [loadingProgram, setLoadingProgram] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [catalogError, setCatalogError] = useState('');
  const [programError, setProgramError] = useState('');
  const [programFilesError, setProgramFilesError] = useState('');
  const [spotError, setSpotError] = useState('');
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [clock, setClock] = useState(() => secondsOfDay(boliviaClock.format(new Date())));
  const nextKey = useRef(0);
  const programRequest = useRef<AbortController | null>(null);

  useEffect(() => {
    const timer = window.setInterval(() => setClock(secondsOfDay(boliviaClock.format(new Date()))), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const options = { headers: mediaHeaders(), signal: controller.signal };
    bmsApi.getProgramas(controller.signal)
      .then(items => {
        if (!controller.signal.aborted) {
          const active = items.filter(item => item.estado === 'ACTIVO');
          setPrograms(previous => [...active, ...previous.filter(item => !active.some(program => program.id === item.id))]);
        }
      })
      .catch(err => { if (!controller.signal.aborted) setProgramError(err.message); });
    requestJson<Spot[]>('/api/v1/spots', options)
      .then(items => { if (!controller.signal.aborted) setSpots(items); })
      .catch(err => { if (!controller.signal.aborted) setSpotError(err.message); });
    return () => { controller.abort(); programRequest.current?.abort(); };
  }, []);

  useEffect(() => {
    if (library !== 'videos') return;
    const controller = new AbortController();
    setLoadingCatalog(true);
    setCatalogError('');
    const timer = window.setTimeout(() => {
      requestJson<CatalogFile[]>(`/api/parrilla/archivos?ready=1&q=${encodeURIComponent(query)}`, {
        headers: mediaHeaders(), signal: controller.signal,
      }).then(files => {
        if (!controller.signal.aborted) { setCatalog(files); setCatalogError(''); }
      }).catch(err => {
        if (!controller.signal.aborted) setCatalogError(err.message);
      }).finally(() => { if (!controller.signal.aborted) setLoadingCatalog(false); });
    }, 160);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [library, query]);

  const chooseProgram = async (id: number | null) => {
    programRequest.current?.abort();
    setProgramId(id);
    setProgramFiles([]);
    setProgramFilesError('');
    setLibrary(id ? 'program' : 'videos');
    setQuery('');
    setError('');
    setNotice('');
    if (!id) { setLoadingProgram(false); return; }

    const controller = new AbortController();
    programRequest.current = controller;
    setLoadingProgram(true);
    try {
      const files = await requestJson<CatalogFile[]>(`/api/parrilla/archivos?program_id=${id}`, {
        headers: mediaHeaders(), signal: controller.signal,
      });
      if (controller.signal.aborted) return;
      setProgramFiles(files);
    } catch (err) {
      if (!controller.signal.aborted) setProgramFilesError((err as Error).message);
    } finally {
      if (!controller.signal.aborted) setLoadingProgram(false);
    }
  };

  const add = (file: CatalogFile, eventType: Entry['eventType']) => {
    const key = ++nextKey.current;
    setEntries(previous => previous.length < 100 ? [...previous, { key, file, eventType }] : previous);
    setNotice(`Agregado al orden de salida: ${file.titulo}`);
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
    if (saving || blocker) return;
    setError('');
    setSaving(true);
    try {
      const result = await requestJson<{ items: { scheduled_time: string }[] }>('/api/parrilla/bloques', {
        method: 'POST',
        headers: { ...mediaHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          program_title: programId ? null : title.trim(),
          program_id: programId,
          scheduled_time: scheduleMode === 'scheduled' ? schedule : null,
          entries: entries.map(entry => ({ file_id: entry.file.id, event_type: entry.eventType })),
        }),
      });
      onSave(result.items.length, result.items[0].scheduled_time, scheduleMode === 'scheduled');
    } catch (err) {
      setError((err as Error).message);
      notify((err as Error).message, 'error');
      setSaving(false);
    }
  };

  const busy = saving || loadingProgram;
  const program = programs.find(item => item.id === programId);
  const filteredSpots = spots.filter(spot => spot.estado === 'ACTIVO' &&
    `${spot.titulo_spot} ${spot.cliente?.razon_social ?? ''}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
  const visibleFiles = library === 'program'
    ? programFiles.filter(file => file.titulo.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()))
    : catalog;
  const cuts = entries.filter(entry => entry.eventType === 'COMMERCIAL').length;
  const segments = entries.length - cuts;
  const start = scheduleMode === 'now' ? clock : schedule ? secondsOfDay(`${schedule}:00`) : null;
  let end = start;
  const timeline = entries.map(entry => {
    const at = end;
    const seconds = Math.ceil(entry.file.duracion_ms / 1000);
    if (end !== null) end += seconds;
    return { ...entry, at, seconds };
  });
  const total = timeline.reduce((seconds, entry) => seconds + entry.seconds, 0);
  const blocker = !programId && !title.trim() ? 'Indica un nombre para el bloque libre.'
    : !entries.length ? 'Agrega al menos un elemento al orden de salida.'
    : programId && cuts === entries.length ? 'Agrega al menos un segmento de programa.'
    : start === null ? 'Indica la hora de inicio.'
    : scheduleMode === 'scheduled' && start < clock ? 'Elige una hora futura de hoy.'
    : end !== null && end >= 86400 ? 'El bloque supera el día de programación.'
    : '';

  return (
    <WorkspaceDialog wide="full" title="Armar bloque" description="Identifica el bloque, elige el material y comprueba el orden de salida." busy={saving} onClose={onClose}>
      <form className="parrilla-composer workspace-dialog-body" onSubmit={save}>
        <section className="block-editor-panel" aria-labelledby="block-setup">
          <div className="block-editor-heading"><h3 id="block-setup">1. Datos del bloque</h3><span>Señal principal · Hoy</span></div>
          <div className="block-editor-fields">
            <label>Programa
              <select value={programId ?? ''} disabled={saving} onChange={event => void chooseProgram(Number(event.target.value) || null)}>
                <option value="">Bloque libre</option>
                {programs.map(item => <option key={item.id} value={item.id}>{item.titulo} · {item.codigo}</option>)}
              </select>
            </label>
            <div className="operations-actions block-new-program">
              <button type="button" disabled={saving} onClick={() => setEditingProgram(true)}><Plus size={16} /> Nuevo programa</button>
            </div>
            {!programId && <label>Nombre del bloque
              <input value={title} maxLength={200} required disabled={saving} onChange={event => setTitle(event.target.value)} placeholder="Ej. Especial de la tarde" />
            </label>}
            {published && <label>Modo de inicio
              <select value={scheduleMode} disabled={saving} onChange={event => setScheduleMode(event.target.value === 'scheduled' ? 'scheduled' : 'now')}>
                <option value="now">Iniciar ahora</option>
                <option value="scheduled">Hora fija</option>
              </select>
            </label>}
            {scheduleMode === 'scheduled' && <label>Hora de inicio (Bolivia)
              <input type="time" value={schedule} required disabled={saving} onChange={event => setSchedule(event.target.value)} />
            </label>}
          </div>
          {program && <dl className="block-program-facts">
            <div><dt>Categoría</dt><dd>{program.categoria?.nombre ?? '—'}</dd></div>
            <div><dt>Clasificación</dt><dd>{programRatings[program.clasificacion_edad]}</dd></div>
            <div><dt>Origen</dt><dd>{programOrigins[program.origen]}</dd></div>
            <div><dt>Duración habitual</dt><dd>{program.duracion_estandar_minutos} min</dd></div>
          </dl>}
          {programError && <p role="alert" className="operations-error">No se pudo cargar el catálogo. {programError}</p>}
        </section>

        <div className="block-editor-grid">
          <section className="block-editor-panel" aria-labelledby="block-library">
            <div className="block-editor-heading"><h3 id="block-library">2. Seleccionar material</h3></div>
            <div className="operations-actions builder-library-tabs" aria-label="Biblioteca de material">
              {programId && <button type="button" aria-pressed={library === 'program'} onClick={() => { setLibrary('program'); setQuery(''); }}>Del programa</button>}
              <button type="button" aria-pressed={library === 'videos'} onClick={() => { setLibrary('videos'); setQuery(''); }}>Videos listos</button>
              <button type="button" aria-pressed={library === 'spots'} onClick={() => { setLibrary('spots'); setQuery(''); }}>Spots</button>
            </div>
            <input className="block-library-search" type="search" aria-label={library === 'spots' ? 'Buscar spot' : 'Buscar video'} placeholder={library === 'spots' ? 'Buscar spot o anunciante' : 'Buscar video por título'} value={query} maxLength={150} onChange={event => setQuery(event.target.value)} />
            {library !== 'spots' ? <>
              {(library === 'videos' ? catalogError : programFilesError) && <p role="alert" className="operations-error">{library === 'videos' ? catalogError : programFilesError}</p>}
              {(library === 'program' ? loadingProgram : loadingCatalog) ? <p role="status" className="block-empty">Buscando archivos…</p>
                : !visibleFiles.length ? <p className="block-empty">{library === 'program' && !query ? 'Este programa no tiene archivos vinculados. Puedes elegir material en Videos listos.' : 'No hay videos para esta búsqueda.'}</p>
                : <ul className="block-media-list">
                  {visibleFiles.map(file => {
                    const ready = isReadyCatalogVideo(file) && file.duracion_ms > 0 && videoPath.test(file.ruta);
                    return <li key={file.id}>
                      <div className="block-material-row">
                        <div><strong>{file.titulo}</strong><small>{file.origen} · {file.duracion_ms > 0 ? mediaDuration(file.duracion_ms) : 'Sin duración'} · {ready ? 'Listo' : 'No disponible'}</small></div>
                        <div className="operations-actions">
                          {videoPath.test(file.ruta) && <button type="button" title="Vista previa" aria-label={`Ver ${file.titulo}`} onClick={() => setPreview(file)}><Play size={15} /></button>}
                          <button type="button" disabled={!ready || saving || entries.length >= 100} onClick={() => add(file, 'VIDEO')} aria-label={`Agregar ${file.titulo}`}><Plus size={15} /> Agregar</button>
                        </div>
                      </div>
                      <details><summary>Datos técnicos y QC</summary><MediaDetails file={file} /></details>
                    </li>;
                  })}
                </ul>}
            </> : <>
              {spotError && <p role="alert" className="operations-error">{spotError}</p>}
              {!filteredSpots.length && !spotError && <p className="block-empty">No hay spots activos para esta búsqueda.</p>}
              <ul className="block-media-list">
                {filteredSpots.map(spot => {
                  const file = spot.archivo && { id: `spot:${spot.id}`, titulo: spot.titulo_spot, ruta: spot.archivo.ruta, duracion_ms: spot.archivo.duracion_ms, origen: 'Spot', qc: spot.archivo.qc };
                  const ready = file && isReadyCatalogVideo(file) && file.duracion_ms > 0 && videoPath.test(file.ruta);
                  return <li key={spot.id}>
                    <div className="block-material-row">
                      <div><strong>{spot.titulo_spot}</strong><small>{spot.cliente?.razon_social}{spot.cliente && ' · '}{ready ? mediaDuration(file.duracion_ms) : 'Requiere video aprobado'}</small></div>
                      <div className="operations-actions">
                        {file && videoPath.test(file.ruta) && <button type="button" title="Vista previa" aria-label={`Ver ${spot.titulo_spot}`} onClick={() => setPreview(file)}><Play size={15} /></button>}
                        <button type="button" disabled={saving || !ready || entries.length >= 100} aria-label={`Agregar spot ${spot.titulo_spot}`} onClick={() => { if (ready) add(file, 'COMMERCIAL'); }}><Plus size={15} /> Agregar</button>
                      </div>
                    </div>
                    {file && <details><summary>Datos técnicos y QC</summary><MediaDetails file={file} /></details>}
                  </li>;
                })}
              </ul>
            </>}
          </section>

          <section className="block-editor-panel" aria-labelledby="block-order">
            <div className="block-editor-heading"><h3 id="block-order">3. Orden de salida</h3><span>{segments} {segments === 1 ? 'segmento' : 'segmentos'} · {cuts} {cuts === 1 ? 'corte' : 'cortes'}</span></div>
            {entries.length === 100 && <p role="status">Se alcanzó el límite de 100 elementos por bloque.</p>}
            {!entries.length ? <div className="block-empty block-empty-order">Agrega videos o spots desde la biblioteca. Aquí aparecerá su hora de salida estimada.</div>
              : <div className="block-order-scroll">
                <table className="block-order-table">
                  <thead><tr><th scope="col">Orden</th><th scope="col">Inicio est.</th><th scope="col">Material</th><th scope="col">Duración</th><th scope="col">Acciones</th></tr></thead>
                  <tbody>
                    {timeline.map(({ key, file, eventType, at, seconds }, index) => (
                      <tr key={key} data-cut={eventType === 'COMMERCIAL'} draggable={!busy}
                        onDragStart={event => event.dataTransfer.setData('text/plain', String(key))}
                        onDragOver={event => { if (!busy) event.preventDefault(); }}
                        onDrop={event => { event.preventDefault(); if (!busy) move(Number(event.dataTransfer.getData('text/plain')), key); }}>
                        <td><span className="block-order-number"><GripVertical size={14} aria-hidden="true" />{index + 1}</span></td>
                        <td><time>{at === null ? '—' : clockLabel(at)}</time></td>
                        <td className="block-order-title"><strong>{file.titulo}</strong>
                          {file.id.startsWith('spot:') ? <small>Spot comercial</small>
                            : <select aria-label={`Tipo de ${file.titulo}`} value={eventType} disabled={busy} onChange={event => {
                              const value = event.target.value as Entry['eventType'];
                              setEntries(previous => previous.map(entry => entry.key === key ? { ...entry, eventType: value } : entry));
                            }}><option value="VIDEO">Segmento</option><option value="COMMERCIAL">Corte</option></select>}
                        </td>
                        <td><time>{clockLabel(seconds)}</time></td>
                        <td><div className="operations-actions block-order-actions">
                          <button type="button" title="Subir" aria-label={`Subir ${file.titulo}`} disabled={busy || index === 0} onClick={() => move(key, entries[index - 1].key)}><ArrowUp size={15} /></button>
                          <button type="button" title="Bajar" aria-label={`Bajar ${file.titulo}`} disabled={busy || index === entries.length - 1} onClick={() => move(key, entries[index + 1].key)}><ArrowDown size={15} /></button>
                          <button type="button" title="Quitar" aria-label={`Quitar ${file.titulo}`} disabled={busy} onClick={() => setEntries(previous => previous.filter(entry => entry.key !== key))}><X size={15} /></button>
                        </div></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>}
            <p className="block-editor-help">Los horarios se calculan con la duración de los archivos. El servidor comprueba los cruces al guardar.</p>
          </section>
        </div>

        <footer className="builder-save block-editor-footer">
          <div>
            <dl className="block-program-facts">
              <div><dt>Inicio estimado</dt><dd>{start === null ? '—' : clockLabel(start)}</dd></div>
              <div><dt>Fin estimado</dt><dd>{end === null || !entries.length ? '—' : clockLabel(end)}</dd></div>
              <div><dt>Duración del bloque</dt><dd>{clockLabel(total)}</dd></div>
            </dl>
            {error ? <p role="alert" className="operations-error">{error}</p> : blocker ? <p className="block-editor-help">{blocker}</p> : <p role="status">{notice}</p>}
          </div>
          <div className="operations-actions">
            <button type="submit" className="parrilla-primary" disabled={busy || Boolean(blocker)}>{saving ? 'Guardando…' : 'Guardar bloque'}</button>
          </div>
        </footer>
      </form>
      {editingProgram && <ProgramEditor onClose={() => setEditingProgram(false)} onSave={item => {
        setPrograms(previous => [item, ...previous.filter(program => program.id !== item.id)]);
        setEditingProgram(false);
        void chooseProgram(item.id);
      }} />}
      {preview && <WorkspaceDialog title={preview.titulo} onClose={() => setPreview(null)}>
        <div className="workspace-dialog-body">
          <video className="workspace-video" src={preview.ruta} controls playsInline preload="metadata" />
          <MediaDetails file={preview} />
        </div>
      </WorkspaceDialog>}
    </WorkspaceDialog>
  );
}
