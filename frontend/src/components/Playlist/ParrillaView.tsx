import { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import { Play, RefreshCw, SkipForward, Square, Trash2, Plus, Clock3, Film, ListVideo, Monitor, Radio } from 'lucide-react';
import { api } from '../../services/api';
import { mediaHeaders } from '../../services/parrillaMedia';
import { requestJson } from '../../services/api/client';
import { PlaylistItem } from '../../types/playout';
import { ParrillaComposer } from './ParrillaComposer';

function durationLabel(ms: number) {
  const seconds = Math.floor(ms / 1000);
  return [Math.floor(seconds / 3600), Math.floor(seconds / 60) % 60, seconds % 60]
    .map(part => String(part).padStart(2, '0')).join(':');
}

export function ParrillaView({ visible }: { visible: boolean }) {
  const [items, setItems] = useState<PlaylistItem[]>([]);
  const [current, setCurrent] = useState<PlaylistItem | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [composerOpen, setComposerOpen] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const video = useRef<HTMLVideoElement>(null);
  const startedAt = useRef<number | null>(null);
  const completed = useRef(false);
  const requestVersion = useRef(0);

  const refresh = useCallback(async () => {
    const version = ++requestVersion.current;
    try {
      const data = await api.getPlaylist();
      if (version === requestVersion.current) setItems(data.items);
    } catch (err) {
      if (version === requestVersion.current) setError((err as Error).message);
    } finally {
      if (version === requestVersion.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (visible) void refresh();
  }, [refresh, visible]);

  const playable = (item: PlaylistItem) => item.status === 'READY' &&
    /^(?:https?:\/\/|\/(?!\/))/i.test(item.file_path || '');

  const play = (item: PlaylistItem) => {
    if (!video.current) return;
    setError('');
    setCurrent(item);
    setPlaying(false);
    setElapsed(0);
    startedAt.current = null;
    completed.current = false;
    video.current.src = item.file_path;
    const player = video.current;
    void player.play().catch(err => {
      if (err.name !== 'AbortError') setError('El monitor no pudo reproducir este video. Revisa la ruta y el formato.');
    });
  };

  const stop = () => {
    video.current?.pause();
    video.current?.removeAttribute('src');
    video.current?.load();
    setCurrent(null);
    setPlaying(false);
    setElapsed(0);
    startedAt.current = null;
  };

  const playNext = () => {
    const index = current ? items.findIndex(item => item.id === current.id) : -1;
    const next = items.slice(index + 1).find(playable);
    if (next) play(next);
    else stop();
  };

  const finish = () => {
    if (!current || !startedAt.current || completed.current) return;
    completed.current = true;
    const began = startedAt.current;
    setPlaying(false);
    const duration = Math.max(0, (video.current?.currentTime ?? 0) * 1000 - (current.in_point_ms ?? 0));
    void requestJson('/api/parrilla/emisiones', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...mediaHeaders(),
      },
      body: JSON.stringify({ ...(current.pauta_id ? { pauta_id: current.pauta_id } : { item_id: current.id }), started_at: new Date(began).toISOString(), duration_ms: Math.round(duration) }),
    }).then(refresh).catch(err => setError(err.message));
    if (current.timing_mode === 'AUTO_FOLLOW') playNext();
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
      await refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const firstReady = items.find(playable);
  const currentIndex = current ? items.findIndex(item => item.id === current.id) : -1;
  const nextReady = items.slice(currentIndex + 1).find(playable);
  const commercialCount = items.filter(item => item.event_type === 'COMMERCIAL').length;
  const totalTime = items.reduce((sum, item) => sum + item.duration_ms, 0);
  return (
    <div className="parrilla-page">
      <header className="parrilla-heading parrilla-hero">
        <div><h1>Parrilla de hoy</h1>
          <p>{new Intl.DateTimeFormat('es-BO', { timeZone: 'America/La_Paz', weekday: 'long', day: 'numeric', month: 'long' }).format(new Date())}</p>
        </div>
        <div className="operations-actions">
          <button onClick={() => { setError(''); void refresh(); }} disabled={busy}><RefreshCw size={16} /> Actualizar</button>
          <button className="parrilla-primary" aria-haspopup="dialog" aria-expanded={composerOpen} onClick={() => setComposerOpen(true)}><Plus size={16} /> Armar bloque</button>
        </div>
      </header>
      <div className="parrilla-metrics" aria-label="Resumen de la parrilla">
        <div><ListVideo size={17} /><span><strong>{items.length - commercialCount}</strong> Segmentos</span></div>
        <div><Film size={17} /><span><strong>{commercialCount}</strong> Cortes</span></div>
        <div><Clock3 size={17} /><span><strong>{durationLabel(totalTime)}</strong> Duración total</span></div>
      </div>
      {error && <p className="operations-error" role="alert">{error}</p>}
      {composerOpen && <ParrillaComposer onClose={() => setComposerOpen(false)} onSave={() => {
        setComposerOpen(false);
        void refresh();
      }} />}
      <div className="parrilla-grid parrilla-playout">
        <section className="operations-panel parrilla-monitor">
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
              setElapsed(ms);
              if (current?.out_point_ms && ms >= current.out_point_ms) {
                event.currentTarget.pause();
                finish();
              }
            }}
            onEnded={finish}
            onError={() => { if (current) setError('El video no está disponible o su formato no es compatible.'); }}
          />
          <div className="parrilla-current">
            <strong>{current?.title || 'Sin reproducción'}</strong>
            {current && <time>{durationLabel(elapsed)} / {durationLabel(current.duration_ms)}</time>}
            {nextReady && <small>A continuación · {nextReady.title}</small>}
          </div>
          <div className="operations-actions">
            <button className="parrilla-primary" disabled={!firstReady || Boolean(current)} onClick={() => firstReady && play(firstReady)}><Play size={16} /> Iniciar</button>
            <button disabled={!current} onClick={playNext}><SkipForward size={16} /> Siguiente</button>
            <button disabled={!current} onClick={stop}><Square size={16} /> Detener</button>
          </div>
        </section>
        <section className="operations-panel">
          <div className="parrilla-panel-heading"><h2><ListVideo size={17} /> Orden de salida</h2><small>{items.length} elementos</small></div>
          {loading ? <p>Cargando parrilla…</p> : !items.length ? <div className="parrilla-empty">
            <ListVideo size={22} aria-hidden="true" />
            <p>La parrilla de hoy está vacía.</p>
            {!composerOpen && <div className="operations-actions"><button onClick={() => setComposerOpen(true)}>Agregar videos</button></div>}
          </div> : (
            <ol className="parrilla-list">
              {items.map((item, index) => (
                <Fragment key={item.id}>
                  {item.group_id && items[index - 1]?.group_id !== item.group_id && (
                    <li className="parrilla-group-heading"><strong>{item.program_title}</strong><small>{items.filter(record => record.group_id === item.group_id).length} archivos</small></li>
                  )}
                  <li className="parrilla-event" data-current={current?.id === item.id} data-commercial={item.event_type === 'COMMERCIAL'}>
                    <time>{item.scheduled_time?.slice(0, 5) || (item.pauta_id ? <Film size={16} aria-label="Spot" /> : '?')}</time>
                    <div className="parrilla-event-text">
                      <strong>{item.title}</strong>
                      <small>{item.cue_label || (item.event_type === 'COMMERCIAL' ? 'Corte' : 'Segmento')} ? {durationLabel(item.duration_ms)}</small>
                      <span className="parrilla-event-status" data-ready={playable(item)}>
                        {current?.id === item.id ? 'En monitor' : item.status === 'COMPLETED' ? 'Emitido' : playable(item) ? 'Listo' : item.status === 'SKIPPED' ? 'Bloqueado' : 'Sin video reproducible'}
                      </span>
                    </div>
                    <button disabled={!playable(item)} title="Reproducir" aria-label={`Reproducir ${item.title}`} onClick={() => play(item)}><Play size={16} /></button>
                    <button disabled={busy || current?.id === item.id || item.status === 'COMPLETED'} title="Quitar" aria-label={`Quitar ${item.title}`} onClick={() => void remove(item)}><Trash2 size={16} /></button>
                  </li>
                </Fragment>
              ))}
            </ol>
          )}
        </section>
      </div>
    </div>
  );
}
