import { Fragment, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Download, RefreshCw, Search } from 'lucide-react';
import type { AsRunLog, AuditStats as AuditStatsData } from '../../types/playout';
import { AuditStats } from './AuditStats';
import { api } from '../../services/api';
import { ErrorAlertBanner } from '../Common/ErrorAlertBanner';

const columns = ['Fecha', 'Contenido', 'Inicio previsto', 'Inicio real', 'Fin real', 'Duración', 'Diferencia', 'Estado'];
const statusLabels: Record<string, string> = {
  EMITIDO_CORRECTO: 'Emitido',
  DESPLAZADO: 'Desplazado',
  CORTE_ENERGIA: 'Corte de energía',
  FALLA_TECNICA: 'Falla técnica',
  INTERRUPCION_NOTICIOSA: 'Interrupción noticiosa',
  NO_EMITIDO: 'No emitido',
};
const date = new Intl.DateTimeFormat('es-BO', { dateStyle: 'short', timeZone: 'America/La_Paz' });
const time = new Intl.DateTimeFormat('es-BO', { timeZone: 'America/La_Paz', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' });
const number = new Intl.NumberFormat('es-BO', { maximumFractionDigits: 1 });
const datePart = (formatter: Intl.DateTimeFormat, value: string | null) => {
  if (!value) return '—';
  const parsed = new Date(value.includes('T') ? value : value.replace(' ', 'T') + '-04:00');
  return Number.isNaN(parsed.getTime()) ? '—' : formatter.format(parsed);
};
const seconds = (ms: number) => `${number.format(ms / 1000)} s`;

export function AuditView() {
  const [logs, setLogs] = useState<AsRunLog[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<AuditStatsData | null>(null);
  const [status, setStatus] = useState('ALL');
  const [draft, setDraft] = useState('');
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [revision, setRevision] = useState(0);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  useEffect(() => {
    let active = true;
    const fetchLogs = async () => {
      try {
        const [result, summary] = await Promise.all([
          api.getAuditLogs({ status, search, startDate, endDate, limit: pageSize, offset: (page - 1) * pageSize }),
          api.getAuditStats(),
        ]);
        if (!active) return;
        const lastPage = Math.max(1, Math.ceil(result.total / pageSize));
        if (page > lastPage) {
          setPage(lastPage);
          return;
        }
        setLogs(result.logs);
        setTotal(result.total);
        setStats(summary);
        setError('');
      } catch (err) {
        if (active) setError((err as Error).message);
      } finally {
        if (active) setLoading(false);
      }
    };
    setLoading(true);
    void fetchLogs();
    const timer = page === 1 && !search && !startDate && !endDate ? window.setInterval(fetchLogs, 10_000) : undefined;
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [status, search, startDate, endDate, page, pageSize, revision]);

  const reload = () => setRevision(value => value + 1);

  return (
    <div className="audit-screen">
      <header className="audit-heading">
        <div><h1>Bitácora As-Run</h1><p>{total} registros · Hora de Bolivia (UTC−4)</p></div>
        <div className="operations-actions">
          <button type="button" disabled={loading} onClick={reload}><RefreshCw size={15} /> Actualizar</button>
          <a className="btn-tool primary" href={api.getExportCsvUrl({ status, search, startDate, endDate })}><Download size={15} /> Exportar CSV</a>
        </div>
      </header>
      <AuditStats stats={stats} />
      {error && <ErrorAlertBanner title="No se pudo cargar la Bitácora" message={error} onRetry={reload} onDismiss={() => setError('')} />}
      <form className="audit-filters" onSubmit={event => {
        event.preventDefault();
        setPage(1);
        setSearch(draft.trim());
      }}>
        <label>Buscar<input type="search" value={draft} maxLength={150} placeholder="Contenido, archivo u operador" onChange={event => setDraft(event.target.value)} /></label>
        <label>Estado<select value={status} onChange={event => { setStatus(event.target.value); setPage(1); }}>
          <option value="ALL">Todos los estados</option>
          {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select></label>
        <label>Desde<input type="date" value={startDate} max={endDate || undefined} onChange={event => { setStartDate(event.target.value); setPage(1); }} /></label>
        <label>Hasta<input type="date" value={endDate} min={startDate || undefined} onChange={event => { setEndDate(event.target.value); setPage(1); }} /></label>
        <button type="submit" className="btn-tool"><Search size={15} /> Buscar</button>
      </form>
      <div className="table-scroll-container audit-log-table" tabIndex={0} aria-label="Registros de emisión" aria-busy={loading}>
        <table className="playlist-table">
          <thead><tr>{columns.map(column => <th key={column} scope="col">{column}</th>)}</tr></thead>
          <tbody>
            {!logs.length && <tr><td colSpan={columns.length}>{loading ? 'Cargando emisiones…' : 'No hay emisiones que coincidan con los filtros.'}</td></tr>}
            {logs.map(log => {
              const commercial = log.event_type === 'COMMERCIAL';
              const open = expanded === log.id;
              return (
                <Fragment key={log.id}>
                  <tr>
                    <td>{datePart(date, log.started_at)}</td>
                    <td><button type="button" className="audit-entry-title" aria-expanded={open} onClick={() => setExpanded(open ? null : log.id)}>{log.title}</button>
                      <small>{log.pauta_id ? 'Spot pautado' : commercial ? 'Corte' : 'Segmento'}{log.program_title && log.program_title !== log.title ? ` · ${log.program_title}` : ''}</small>
                    </td>
                    <td>{log.planned_start?.slice(0, 8) || '—'}</td>
                    <td>{datePart(time, log.started_at)}</td>
                    <td>{datePart(time, log.ended_at)}</td>
                    <td><strong>{seconds(log.actual_duration_ms)}</strong><small>Prevista {seconds(log.planned_duration_ms)}</small></td>
                    <td>{log.discrepancy_ms > 0 ? '+' : ''}{seconds(log.discrepancy_ms)}</td>
                    <td><span className="audit-status" data-state={log.broadcast_status}>{statusLabels[log.broadcast_status] ?? log.broadcast_status}</span></td>
                  </tr>
                  {open && <tr className="audit-entry-details"><td colSpan={columns.length}>
                    <dl>
                      <div><dt>Registro</dt><dd>#{log.id} · Bloque #{log.item_id}{log.pauta_id ? ` · Pauta #${log.pauta_id}` : ''}</dd></div>
                      <div><dt>Operador</dt><dd>{log.operator || '—'}</dd></div>
                      <div><dt>Archivo</dt><dd>{log.file_path || '—'}</dd></div>
                      <div><dt>Observaciones</dt><dd>{log.notes || '—'}</dd></div>
                    </dl>
                  </td></tr>}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
      <footer className="audit-pagination">
        <span>{total ? `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, total)} de ${total}` : '0 resultados'}</span>
        <label>Filas <select className="btn-tool" value={pageSize} onChange={event => { setPageSize(Number(event.target.value)); setPage(1); }}>
          {[25, 50, 100, 250].map(size => <option key={size}>{size}</option>)}
        </select></label>
        <div className="operations-actions">
          <button type="button" disabled={page === 1 || loading} aria-label="Página anterior" onClick={() => setPage(page - 1)}><ChevronLeft size={16} /></button>
          <span>Página {page} de {totalPages}</span>
          <button type="button" disabled={page >= totalPages || loading} aria-label="Página siguiente" onClick={() => setPage(page + 1)}><ChevronRight size={16} /></button>
        </div>
      </footer>
    </div>
  );
}
