import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { bmsApi, type AccessEvent, type AccessLogPage } from '../../services/bmsApi';
import { ErrorAlertBanner } from '../Common/ErrorAlertBanner';

const labels: Record<AccessEvent, string> = {
  login_success: 'Inicio de sesión exitoso',
  login_failure: 'Inicio de sesión fallido',
  access_denied: 'Acceso denegado',
  request: 'Solicitud API',
};
const date = new Intl.DateTimeFormat('es-BO', {
  dateStyle: 'short', timeStyle: 'medium', timeZone: 'America/La_Paz',
});
const format = new Intl.NumberFormat('es-BO', { maximumFractionDigits: 1 });

export function AccessLogView() {
  const [event, setEvent] = useState<AccessEvent | ''>('');
  const [page, setPage] = useState(1);
  const [cursor, setCursor] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const [data, setData] = useState<AccessLogPage | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    bmsApi.getAccessLogs(event, cursor, controller.signal)
      .then(result => { if (!controller.signal.aborted) setData(result); })
      .catch(err => { if (!controller.signal.aborted) setError(err.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [event, cursor, revision]);

  const refresh = () => setRevision(value => value + 1);
  const navigate = (target: string | null, pageNumber: number) => {
    setData(null);
    setCursor(target);
    setPage(pageNumber);
  };

  return (
    <div className="access-log">
      <section className="bms-card">
        <div className="access-log-heading">
          <h3 className="bms-card-title">Bitácora de accesos</h3>
          <div className="operations-actions">
            <label>Evento <select className="btn-tool" value={event} onChange={e => {
              setEvent(e.target.value as AccessEvent | '');
              navigate(null, 1);
            }}>
              <option value="">Todos</option>
              {Object.entries(labels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select></label>
            <button type="button" onClick={refresh} disabled={loading}><RefreshCw size={14} /> Actualizar</button>
          </div>
        </div>
        {error && <ErrorAlertBanner title="No se pudo cargar la bitácora" message={error} onRetry={refresh} onDismiss={() => setError('')} />}
        <div className="bms-table-container" aria-busy={loading} aria-label="Accesos a la API" tabIndex={0}>
          <table className="bms-table">
            <thead><tr>{['Fecha (Bolivia)', 'Evento', 'Usuario', 'IP', 'Ruta', 'HTTP', 'Tiempo'].map(label => <th key={label} scope="col">{label}</th>)}</tr></thead>
            <tbody>
              {!data?.entries.length && <tr><td colSpan={7}>{loading ? 'Cargando accesos…' : 'No hay accesos para mostrar.'}</td></tr>}
              {data?.entries.map(entry => <tr key={entry.id}>
                <td>{date.format(new Date(entry.occurred_at))}</td>
                <td><span className={`bms-status-indicator ${entry.status >= 400 ? 'status-err' : 'status-ok'}`}>{labels[entry.event]}</span></td>
                <td>{entry.user_id === null ? '—' : `#${entry.user_id}`}</td>
                <td><code>{entry.ip ?? '—'}</code></td>
                <td><code>{entry.method} {entry.route}</code></td>
                <td>{entry.status}</td>
                <td>{format.format(entry.duration_ms)} ms</td>
              </tr>)}
            </tbody>
          </table>
        </div>
        <div className="audit-pagination operations-actions">
          <button type="button" aria-label="Página anterior" disabled={loading || page === 1 || !data?.previous_cursor} onClick={() => navigate(page === 2 ? null : data?.previous_cursor ?? null, page - 1)}><ChevronLeft size={16} /></button>
          <span>Página {page}</span>
          <button type="button" aria-label="Página siguiente" disabled={loading || !data?.next_cursor} onClick={() => navigate(data?.next_cursor ?? null, page + 1)}><ChevronRight size={16} /></button>
        </div>
      </section>
      <section className="bms-card">
        <h3 className="bms-card-title">Rutas con mayor tiempo acumulado</h3>
        <p className="bms-text-muted">Últimas 24 horas · Tiempo de procesamiento de la API</p>
        <div className="bms-table-container" aria-busy={loading} aria-label="Actividad por ruta" tabIndex={0}>
          <table className="bms-table">
            <thead><tr>{['Ruta', 'Solicitudes', 'Tiempo acumulado', 'Promedio'].map(label => <th key={label} scope="col">{label}</th>)}</tr></thead>
            <tbody>
              {!data?.top_routes.length && <tr><td colSpan={4}>{loading ? 'Cargando rutas…' : 'No hay actividad en el período.'}</td></tr>}
              {data?.top_routes.map(route => <tr key={`${route.method} ${route.route}`}>
                <td><code>{route.method} {route.route}</code></td>
                <td>{format.format(route.requests)}</td>
                <td>{format.format(route.total_ms)} ms</td>
                <td>{format.format(route.average_ms)} ms</td>
              </tr>)}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
