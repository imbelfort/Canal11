import { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import { Play, RefreshCw, SkipForward, Square, Trash2, Plus, Clock3, Film, ListVideo, Monitor, Radio, ShieldCheck } from 'lucide-react';
import { usePreferences } from '../../context/PreferencesContext';
import { useToast } from '../../context/ToastContext';
import { api } from '../../services/api';
import { mediaHeaders } from '../../services/parrillaMedia';
import { requestJson } from '../../services/api/client';
import { PlaylistItem } from '../../types/playout';
import { WorkspaceDialog } from '../Common/WorkspaceDialog';
import { ParrillaValidationDialog } from './ParrillaValidationDialog';
import { ParrillaComposer } from './ParrillaComposer';

function durationLabel(ms: number) {
  const seconds = Math.floor(ms / 1000);
  return [Math.floor(seconds / 3600), Math.floor(seconds / 60) % 60, seconds % 60]
    .map(part => String(part).padStart(2, '0')).join(':');
}

const hasPreview = (item: PlaylistItem) => /^(?:https?:\/\/|\/(?!\/))/i.test(item.file_path || '');
const playable = (item: PlaylistItem) => item.status === 'READY' && hasPreview(item);
const scheduledAt = (item: PlaylistItem) => item.scheduled_at ? Date.parse(item.scheduled_at) : null;
const canStart = (item: PlaylistItem) => {
  const earliest = item.not_before ? Date.parse(item.not_before) : 0;
  const scheduled = scheduledAt(item) ?? 0;
  return playable(item) && Math.max(earliest, scheduled) <= Date.now();
};

export function ParrillaView({ visible }: { visible: boolean }) {
  const { user } = usePreferences();
  const notify = useToast();
  const canSchedule = user?.roles.some(role => role === 'PROGRAMADOR' || role === 'ADMINISTRADOR');
  const [items, setItems] = useState<PlaylistItem[]>([]);
  const [schedule, setSchedule] = useState<{ id: number | null; status: string | null } | null>(null);
  const published = schedule?.status === 'PUBLICADA';
  const canOperate = canSchedule && published;
  const [preview, setPreview] = useState<PlaylistItem | null>(null);
  const [current, setCurrent] = useState<PlaylistItem | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [validationOpen, setValidationOpen] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const video = useRef<HTMLVideoElement>(null);
  const startedAt = useRef<number | null>(null);
  const completed = useRef(false);
  const requestVersion = useRef(0);
  const attemptedStarts = useRef(new Set<number>());
  const finishedLocally = useRef(new Set<number>());
  const activeId = useRef<number | null>(null);

  const refresh = useCallback(async (announce = false) => {
    const version = ++requestVersion.current;
    try {
      const data = await api.getPlaylist();
      if (version === requestVersion.current) {
        setSchedule(data.playlist);
        setItems(data.items.map(item => finishedLocally.current.has(item.id) ? { ...item, status: 'COMPLETED' } : item));
        if (announce) notify('Parrilla actualizada.');
      }
    } catch (err) {
      if (version === requestVersion.current) {
        setError((err as Error).message);
        if (announce) notify((err as Error).message, 'error');
      }
    } finally {
      if (version === requestVersion.current) setLoading(false);
    }
  }, [notify]);

  useEffect(() => {
    if (visible) void refresh();
    if (!visible && !canSchedule) return;
    const timer = window.setInterval(refresh, 5000);
    return () => window.clearInterval(timer);
  }, [canSchedule, refresh, visible]);

  const stop = useCallback(() => {
    activeId.current = null;
    video.current?.pause();
    video.current?.removeAttribute('src');
    video.current?.load();
    setCurrent(null);
    setPlaying(false);
    setElapsed(0);
    startedAt.current = null;
  }, []);

  const play = useCallback((item: PlaylistItem) => {
    if (!canOperate || !video.current || !canStart(item)) return;
    activeId.current = item.id;
    attemptedStarts.current.add(item.id);
    setError('');
    setCurrent(item);
    setPlaying(false);
    setElapsed(0);
    startedAt.current = null;
    completed.current = false;
    video.current.src = item.file_path;
    const player = video.current;
    void player.play().catch(err => {
      if (err.name === 'AbortError' || activeId.current !== item.id) return;
      stop();
      setError('El monitor no pudo reproducir este video. Revisa la ruta y el formato.');
      notify('El monitor no pudo reproducir este video.', 'error');
    });
  }, [canOperate, notify, stop]);

  const playNext = (automatic = false) => {
    const index = current ? items.findIndex(item => item.id === current.id) : -1;
    const next = items.slice(index + 1).find(item => playable(item) && !finishedLocally.current.has(item.id));
    const canFollow = next?.timing_mode !== 'MANUAL_CUE'
      && (!current?.group_id || current.group_id === next?.group_id || next?.timing_mode === 'HARD_START');
    if (next && canStart(next) && (!automatic || canFollow)) {
      play(next);
    } else stop();
  };

  const registerRun = useCallback((disposition: 'EMITIDO_CORRECTO' | 'DESPLAZADO' | 'FALLA_TECNICA') => {
    if (!canSchedule || !current || current.id !== activeId.current || !startedAt.current || completed.current) return false;
    completed.current = true;
    finishedLocally.current.add(current.id);
    setItems(previous => previous.map(item => item.id === current.id ? { ...item, status: 'COMPLETED' } : item));
    const began = startedAt.current;
    setPlaying(false);
    const duration = Math.max(0, (video.current?.currentTime ?? 0) * 1000 - (current.in_point_ms ?? 0));
    void requestJson('/api/parrilla/emisiones', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...mediaHeaders(),
      },
      body: JSON.stringify({
        ...(current.pauta_id ? { pauta_id: current.pauta_id } : { item_id: current.id }),
        started_at: new Date(began).toISOString(),
        duration_ms: Math.round(duration),
        disposition,
      }),
    }).then(() => refresh()).catch(err => {
      const message = `No se pudo registrar la emisión de «${current.title}». ${err.message}`;
      setError(message);
      notify(message, 'error');
    });
    return true;
  }, [canSchedule, current, notify, refresh]);

  useEffect(() => {
    if (!canOperate) return;
    const startDue = () => {
      const now = Date.now();
      const due = items.findLast(item => {
        const start = scheduledAt(item);
        return item.timing_mode === 'HARD_START' && start !== null && now - start <= 60_000
          && canStart(item);
      });
      if (due && !attemptedStarts.current.has(due.id) && !finishedLocally.current.has(due.id)) {
        registerRun('DESPLAZADO');
        play(due);
      }
    };
    startDue();
    const timer = window.setInterval(startDue, 500);
    return () => window.clearInterval(timer);
  }, [canOperate, items, play, registerRun]);

  const finish = () => {
    if (registerRun('EMITIDO_CORRECTO')) playNext(true);
  };

  const changeScheduleStatus = async (status: string) => {
    if (!schedule?.id) return;
    if (status === 'CERRADA' && !window.confirm('¿Cerrar la parrilla de hoy?')) return;
    setBusy(true);
    setError('');
    try {
      await requestJson(`/api/v1/parrillas/${schedule.id}/estado`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...mediaHeaders() },
        body: JSON.stringify({ estado: status }),
      });
      notify(`Parrilla ${status.toLocaleLowerCase('es-BO')}.`);
      await refresh();
    } catch (err) {
      setError((err as Error).message);
      notify((err as Error).message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (item: PlaylistItem) => {
    if (!window.confirm(`¿Quitar "${item.title}" de la Parrilla?`)) return;
    setBusy(true);
    setError('');
    try {
      if (item.pauta_id) {
        await requestJson(`/api/v1/pautas/${item.pauta_id}`, { method: 'DELETE', headers: mediaHeaders() });
      } else {
        await api.deleteItem(item.id);
      }
      notify(`«${item.title}» se retiró de la Parrilla.`);
      await refresh();
    } catch (err) {
      setError((err as Error).message);
      notify((err as Error).message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const closed = schedule?.status === 'CERRADA';
  const firstReady = canOperate ? items.find(canStart) : undefined;
  const nextStatus = schedule?.status === 'BORRADOR' ? ['APROBADA', 'Aprobar']
    : schedule?.status === 'APROBADA' ? ['PUBLICADA', 'Publicar']
    : schedule?.status === 'PUBLICADA' ? ['CERRADA', 'Cerrar parrilla'] : null;
  const currentIndex = current ? items.findIndex(item => item.id === current.id) : -1;
  const nextReady = items.slice(currentIndex + 1).find(playable);
  const commercialCount = items.filter(item => item.event_type === 'COMMERCIAL').length;
  const totalTime = items.reduce((sum, item) => sum + item.duration_ms, 0);
  return (
    <div className="parrilla-page">
      <header className="parrilla-heading parrilla-hero">
        <div><h1>Parrilla de hoy</h1>
          <p>{new Intl.DateTimeFormat('es-BO', { timeZone: 'America/La_Paz', weekday: 'long', day: 'numeric', month: 'long' }).format(new Date())}{schedule?.status && ` · ${schedule.status}`}{!canSchedule && ' · Modo consulta'}</p>
        </div>
        <div className="operations-actions">
          <button onClick={() => { setError(''); void refresh(true); }} disabled={busy}><RefreshCw size={16} /> Actualizar</button>
          <button type="button" aria-haspopup="dialog" onClick={() => setValidationOpen(true)}><ShieldCheck size={16} /> Validar Parrilla</button>
          {canSchedule && nextStatus && <button type="button" disabled={busy || Boolean(current)} onClick={() => void changeScheduleStatus(nextStatus[0])}>{nextStatus[1]}</button>}
          {canSchedule && !closed && <button className="parrilla-primary" aria-haspopup="dialog" aria-expanded={composerOpen} onClick={() => setComposerOpen(true)}><Plus size={16} /> Armar bloque</button>}
        </div>
      </header>
      <div className="parrilla-metrics" aria-label="Resumen de la parrilla">
        <div><ListVideo size={17} /><span><strong>{items.length - commercialCount}</strong> Segmentos</span></div>
        <div><Film size={17} /><span><strong>{commercialCount}</strong> Cortes</span></div>
        <div><Clock3 size={17} /><span><strong>{durationLabel(totalTime)}</strong> Duración total</span></div>
      </div>
      {error && <p className="operations-error" role="alert">{error}</p>}
      {canSchedule && !closed && composerOpen && <ParrillaComposer key={String(published)} published={published} onClose={() => setComposerOpen(false)} onSave={(count, startsAt, scheduled) => {
        notify(`Bloque guardado con ${count} ${count === 1 ? 'elemento' : 'elementos'}. ${scheduled ? 'Programado' : 'Inicio'} a las ${startsAt} (hora de Bolivia).`);
        setComposerOpen(false);
        void refresh();
      }} />}
      <div className="parrilla-grid parrilla-playout" data-readonly={!canSchedule}>
        {canSchedule && <section className="operations-panel parrilla-monitor">
          <div className="parrilla-panel-heading">
            <h2><Monitor size={17} /> Monitor de salida</h2>
            <span className="parrilla-onair" data-playing={playing}><Radio size={14} /> {playing ? 'Reproduciendo' : current ? 'En espera' : 'Detenido'}</span>
          </div>
          <video ref={video} controls playsInline muted preload="metadata"
            onLoadedMetadata={() => {
              if (video.current && current?.in_point_ms) video.current.currentTime = current.in_point_ms / 1000;
            }}
            onPlaying={() => { startedAt.current ??= Date.now(); setPlaying(true); }}
            onPause={() => setPlaying(false)}
            onTimeUpdate={event => {
              const ms = event.currentTarget.currentTime * 1000;
              setElapsed(Math.max(0, ms - (current?.in_point_ms ?? 0)));
              if (current?.out_point_ms && ms >= current.out_point_ms) {
                event.currentTarget.pause();
                finish();
              }
            }}
            onEnded={finish}
            onError={() => {
              if (!current || current.id !== activeId.current) return;
              registerRun('FALLA_TECNICA');
              stop();
              setError('El video no está disponible o su formato no es compatible.');
              notify('El video no está disponible o su formato no es compatible.', 'error');
            }}
          />
          <div className="parrilla-current">
            <strong>{current?.title || 'Sin reproducción'}</strong>
            {current && <time>{durationLabel(elapsed)} / {durationLabel(current.duration_ms)}</time>}
            {nextReady && <small>A continuación · {nextReady.title}</small>}
          </div>
          <div className="operations-actions">
            <button className="parrilla-primary" disabled={!firstReady || Boolean(current)} onClick={() => firstReady && play(firstReady)}><Play size={16} /> Iniciar</button>
            <button disabled={!current || !canOperate} onClick={() => { registerRun('DESPLAZADO'); playNext(); }}><SkipForward size={16} /> Siguiente</button>
            <button disabled={!current} onClick={() => { registerRun('DESPLAZADO'); stop(); }}><Square size={16} /> Detener</button>
          </div>
        </section>}
        <section className="operations-panel">
          <div className="parrilla-panel-heading"><h2><ListVideo size={17} /> Orden de salida</h2><small>{items.length} elementos</small></div>
          {loading ? <p>Cargando parrilla…</p> : !items.length ? <div className="parrilla-empty">
            <ListVideo size={22} aria-hidden="true" />
            <p>La parrilla de hoy está vacía.</p>
            {canSchedule && !closed && !composerOpen && <div className="operations-actions"><button onClick={() => setComposerOpen(true)}>Armar primer bloque</button></div>}
          </div> : (
            <ol className="parrilla-list">
              {items.map((item, index) => (
                <Fragment key={item.id}>
                  {item.group_id && item.program_title && items[index - 1]?.group_id !== item.group_id && (
                    <li className="parrilla-group-heading"><strong>{item.program_title}</strong><small>{items.filter(record => record.group_id === item.group_id).length} archivos</small></li>
                  )}
                  <li className="parrilla-event" data-current={current?.id === item.id} data-commercial={item.event_type === 'COMMERCIAL'}>
                    <time>{item.scheduled_time?.slice(0, 5) || (item.pauta_id ? <Film size={16} aria-label="Spot" /> : '—')}</time>
                    <div className="parrilla-event-text">
                      <strong>{item.title}</strong>
                      <small>{item.cue_label || (item.spot_id ? 'Spot comercial' : item.event_type === 'COMMERCIAL' ? 'Corte' : 'Segmento')} · {durationLabel(item.duration_ms)}</small>
                      <span className="parrilla-event-status" data-ready={playable(item)}>
                        {current?.id === item.id ? 'En monitor' : item.status === 'COMPLETED' ? 'Emitido' : playable(item) && !canStart(item) ? 'Programado' : playable(item) ? 'Listo' : item.status === 'SKIPPED' ? 'Bloqueado' : 'Sin video reproducible'}
                      </span>
                    </div>
                    <button disabled={!(canOperate ? !current && canStart(item) : hasPreview(item))} title={canOperate ? 'Reproducir' : 'Ver video'} aria-label={`${canOperate ? 'Reproducir' : 'Ver'} ${item.title}`} onClick={() => canOperate ? play(item) : setPreview(item)}><Play size={16} /></button>
                    {canSchedule && !closed && <button disabled={busy || current?.id === item.id || item.status === 'COMPLETED' || item.cancelled} title="Quitar" aria-label={`Quitar ${item.title}`} onClick={() => void remove(item)}><Trash2 size={16} /></button>}
                  </li>
                </Fragment>
              ))}
            </ol>
          )}
        </section>
      </div>
      {preview && <WorkspaceDialog title={preview.title} description="Vista previa del archivo" onClose={() => setPreview(null)}>
        <div className="workspace-dialog-body">
          <video className="workspace-video" src={preview.file_path} controls playsInline preload="metadata" />
        </div>
      </WorkspaceDialog>}
      {validationOpen && <ParrillaValidationDialog onClose={() => setValidationOpen(false)} />}
    </div>
  );
}
