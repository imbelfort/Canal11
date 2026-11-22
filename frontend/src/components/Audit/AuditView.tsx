import React, { useState, useEffect, useRef } from 'react';
import { AsRunLog, AuditStats as AuditStatsType } from '../../types/playout';
import { AuditStats } from './AuditStats';
import { api } from '../../services/api';
import {
  Download,
  RefreshCw,
  Search,
  FileText,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  HardDrive
} from 'lucide-react';
import { ErrorAlertBanner } from '../Common/ErrorAlertBanner';

export const AuditView: React.FC = () => {
  const [logs, setLogs] = useState<AsRunLog[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [stats, setStats] = useState<AuditStatsType | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(50);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const fetchData = async (targetPage = page) => {
    setIsLoading(true);
    try {
      const offset = (targetPage - 1) * pageSize;
      const [logsData, statsData] = await Promise.all([
        api.getAuditLogs({
          status: statusFilter,
          search: searchTerm,
          limit: pageSize,
          offset
        }),
        api.getAuditStats()
      ]);
      const list = Array.isArray(logsData?.logs) ? logsData.logs : (Array.isArray(logsData) ? logsData : []);
      setLogs(list);
      setTotal(typeof logsData?.total === 'number' ? logsData.total : list.length);
      setStats(statsData);
      setErrorMessage(null);
    } catch (e: any) {
      const detail = e instanceof Error ? e.message : 'Error desconocido al consultar registros de auditoría';
      setErrorMessage(`No se pudo obtener la auditoría As-Run: ${detail}`);
      console.error('[AuditView] Error al cargar auditoría:', e);
    } finally {
      setIsLoading(false);
    }
  };

  // Carga inicial y ante cambio de filtros o página
  useEffect(() => {
    fetchData(page);
  }, [page, pageSize, statusFilter]);

  // Actualización periódica sólo si el operador está en la primera página y sin búsqueda activa
  useEffect(() => {
    if (page !== 1 || searchTerm.trim().length > 0) return;
    const interval = setInterval(() => {
      fetchData(1);
    }, 5000);
    return () => clearInterval(interval);
  }, [page, pageSize, statusFilter, searchTerm]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchData(1);
  };

  const handleExportCsv = () => {
    try {
      const url = api.getExportCsvUrl({ status: statusFilter, search: searchTerm });
      window.open(url, '_blank');
    } catch (e: any) {
      setErrorMessage(`Error al generar enlace de descarga CSV: ${e.message}`);
    }
  };

  const startIdx = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const endIdx = Math.min(page * pageSize, total);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <AuditStats stats={stats} />

      {errorMessage && (
        <ErrorAlertBanner
          title="Aviso de Auditoría"
          message={errorMessage}
          onRetry={() => fetchData(page)}
          onDismiss={() => setErrorMessage(null)}
        />
      )}

      <div className="audit-toolbar" style={{ flexShrink: 0 }}>
        <div className="toolbar-group">
          <select
            className="btn-tool"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="ALL">Todos los Estados</option>
            <option value="PLAYED_SUCCESS">Solo Exitosos</option>
            <option value="FILE_CORRUPT_OR_MISSING">Solo Fallas / No encontrados</option>
            <option value="INTERRUPTED">Interrumpidos</option>
            <option value="EMERGENCY_FALLBACK">Cortinillas de Emergencia</option>
          </select>

          <form onSubmit={handleSearchSubmit} style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <Search size={13} style={{ position: 'absolute', left: 8, color: 'var(--text-tertiary)' }} />
            <input
              type="text"
              placeholder="Buscar por título o archivo..."
              className="btn-tool"
              style={{ paddingLeft: 26, width: 220 }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </form>

          <button className="btn-tool" onClick={() => fetchData(page)} disabled={isLoading} title="Refrescar lista actual">
            <RefreshCw size={12} className={isLoading ? 'spinning' : ''} />
            <span>Actualizar</span>
          </button>
        </div>

        <div className="toolbar-group">
          <button
            className="btn-tool"
            onClick={() => {
              const url = api.getDailyReportTxtUrl();
              window.open(url, '_blank');
            }}
            title="Descargar reporte oficial de continuidad del día en texto plano físico (AsRun_YYYY-MM-DD.txt)"
          >
            <FileText size={13} color="var(--apple-green)" />
            <span>As-Run del Día (TXT Físico)</span>
          </button>

          <button className="btn-tool primary" onClick={handleExportCsv} title="Descargar exportación completa de auditoría en formato CSV">
            <Download size={13} />
            <span>Descargar As-Run (CSV)</span>
          </button>
        </div>
      </div>

      {/* Tabla con scroll independiente */}
      <div className="table-scroll-container" style={{ flex: 1, overflowY: 'auto' }}>
        <table className="playlist-table">
          <thead>
            <tr>
              <th style={{ width: 50 }}>ID</th>
              <th style={{ width: 90 }}>Fecha</th>
              <th style={{ width: 80 }}>Inicio</th>
              <th style={{ width: 80 }}>Fin</th>
              <th>Título del Contenido</th>
              <th>Ruta del Archivo</th>
              <th style={{ width: 80 }}>Plan</th>
              <th style={{ width: 80 }}>Real</th>
              <th style={{ width: 70 }}>Discrep.</th>
              <th style={{ width: 110 }}>Estado</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr>
                <td colSpan={10} style={{ textAlign: 'center', padding: 30, color: 'var(--text-tertiary)' }}>
                  {isLoading ? 'Cargando registros de auditoría...' : 'No hay registros de auditoría para los filtros aplicados.'}
                </td>
              </tr>
            ) : (
              logs.map((log) => {
                const plannedSec = ((log.planned_duration_ms || 0) / 1000).toFixed(1);
                const actualSec = ((log.actual_duration_ms || 0) / 1000).toFixed(1);
                const diffSec = ((log.duration_discrepancy_ms || 0) / 1000).toFixed(1);

                let badge = <span className="badge-status played">Emitido</span>;
                if (log.status === 'FILE_CORRUPT_OR_MISSING' || log.status === 'ERROR') {
                  badge = <span className="badge-status error">No Encontrado</span>;
                } else if (log.status === 'INTERRUPTED') {
                  badge = <span className="badge-status" style={{ background: 'rgba(255, 159, 10, 0.15)', color: 'var(--apple-orange)' }}>Cortado</span>;
                } else if (log.status === 'EMERGENCY_FALLBACK') {
                  badge = <span className="badge-status" style={{ background: 'rgba(255, 69, 58, 0.15)', color: 'var(--apple-red)' }}>Respaldo</span>;
                }

                return (
                  <tr key={log.id}>
                    <td style={{ color: 'var(--text-tertiary)' }}>{log.id}</td>
                    <td>{log.timestamp ? log.timestamp.slice(0, 10) : ''}</td>
                    <td style={{ fontFamily: 'var(--font-mono)' }}>
                      {log.actual_start ? (() => {
                        try {
                          return new Date(log.actual_start).toLocaleTimeString();
                        } catch {
                          return String(log.actual_start);
                        }
                      })() : ''}
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)' }}>
                      {log.actual_end ? (() => {
                        try {
                          return new Date(log.actual_end).toLocaleTimeString();
                        } catch {
                          return String(log.actual_end);
                        }
                      })() : ''}
                    </td>
                    <td><strong>{log.event_title}</strong></td>
                    <td style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                      {log.file_path}
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)' }}>{plannedSec}s</td>
                    <td style={{ fontFamily: 'var(--font-mono)' }}>{actualSec}s</td>
                    <td style={{ fontFamily: 'var(--font-mono)', color: Number(diffSec) < 0 ? 'var(--apple-red)' : 'var(--apple-green)' }}>
                      {diffSec}s
                    </td>
                    <td>{badge}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Barra de Paginación y Respaldo Físico */}
      <footer style={{
        padding: '6px 14px',
        background: 'var(--color-canvas-soft)',
        borderTop: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
        gap: 12,
        fontSize: 11
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--color-text-muted)' }}>
          <HardDrive size={13} color="var(--color-primary)" />
          <span>
            Mostrando <strong>{startIdx} - {endIdx}</strong> de <strong>{total}</strong> emisiones en base de datos • Historial permanente respaldado en archivos físicos diarios TXT
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--color-text-muted)' }}>
            <span>Filas:</span>
            <select
              className="btn-tool"
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
              style={{ padding: '2px 6px', height: 24, fontSize: 11 }}
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={250}>250</option>
            </select>
          </label>

          <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <button
              type="button"
              className="btn-tool"
              onClick={() => setPage(1)}
              disabled={page <= 1 || isLoading}
              title="Primera Página"
              style={{ padding: '2px 6px', height: 24 }}
            >
              <ChevronsLeft size={13} />
            </button>
            <button
              type="button"
              className="btn-tool"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1 || isLoading}
              title="Página Anterior"
              style={{ padding: '2px 6px', height: 24 }}
            >
              <ChevronLeft size={13} />
            </button>

            <span style={{ padding: '0 6px', fontWeight: 600, color: 'var(--color-ink)' }}>
              Página {page} de {totalPages}
            </span>

            <button
              type="button"
              className="btn-tool"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || isLoading}
              title="Página Siguiente"
              style={{ padding: '2px 6px', height: 24 }}
            >
              <ChevronRight size={13} />
            </button>
            <button
              type="button"
              className="btn-tool"
              onClick={() => setPage(totalPages)}
              disabled={page >= totalPages || isLoading}
              title="Última Página"
              style={{ padding: '2px 6px', height: 24 }}
            >
              <ChevronsRight size={13} />
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};
