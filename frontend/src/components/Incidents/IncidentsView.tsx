import React, { useState, useEffect } from 'react';
import { SystemIncident } from '../../types/playout';
import { api } from '../../services/api';
import { RefreshCw, AlertCircle } from 'lucide-react';
import { ErrorAlertBanner } from '../Common/ErrorAlertBanner';

export const IncidentsView: React.FC = () => {
  const [incidents, setIncidents] = useState<SystemIncident[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchIncidents = async () => {
    try {
      const data = await api.getIncidents();
      setIncidents(data);
      setErrorMessage(null);
    } catch (e: any) {
      const detail = e instanceof Error ? e.message : 'Error desconocido al consultar el historial de incidentes';
      setErrorMessage(`No se pudo obtener el historial de incidentes: ${detail}`);
      console.error('[IncidentsView] Error al cargar incidentes:', e);
    }
  };

  useEffect(() => {
    fetchIncidents();
  }, []);

  return (
    <div style={{ padding: 14, overflowY: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <AlertCircle size={15} color="var(--apple-red)" />
          <h3 style={{ color: 'var(--text-primary)', fontSize: 13, fontWeight: 500 }}>
            Historial de Incidentes y Protocolo de Continuidad
          </h3>
        </div>
        <button className="btn-tool" onClick={fetchIncidents}>
          <RefreshCw size={12} />
          <span>Actualizar</span>
        </button>
      </div>

      {errorMessage && (
        <div style={{ marginBottom: 12 }}>
          <ErrorAlertBanner
            title="Aviso de Registro de Incidentes"
            message={errorMessage}
            onRetry={fetchIncidents}
            onDismiss={() => setErrorMessage(null)}
          />
        </div>
      )}

      <div className="table-scroll-container">
        <table className="playlist-table">
          <thead>
            <tr>
              <th style={{ width: 50 }}>ID</th>
              <th style={{ width: 140 }}>Timestamp</th>
              <th style={{ width: 90 }}>Severidad</th>
              <th style={{ width: 90 }}>Origen</th>
              <th>Descripción del Incidente / Acción de Continuidad</th>
            </tr>
          </thead>
          <tbody>
            {incidents.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: 30, color: 'var(--text-tertiary)' }}>
                  No se han registrado fallas ni incidentes de continuidad. Sistema operando nominalmente.
                </td>
              </tr>
            ) : (
              incidents.map((inc) => {
                let badgeStyle: React.CSSProperties = { background: 'var(--color-live-subtle)', color: 'var(--color-live)' };
                if (inc.severity === 'WARNING') badgeStyle = { background: 'var(--color-warning-subtle)', color: 'var(--color-warning)' };
                if (inc.severity === 'INFO') badgeStyle = { background: 'var(--color-info-subtle)', color: 'var(--color-info)' };
                if (inc.severity === 'ERROR') badgeStyle = { background: 'var(--color-live-subtle)', color: 'var(--color-live)' };

                return (
                  <tr key={inc.id}>
                    <td style={{ color: 'var(--text-tertiary)' }}>{inc.id}</td>
                    <td style={{ fontFamily: 'var(--font-mono)' }}>{inc.timestamp}</td>
                    <td>
                      <span className="badge-status" style={badgeStyle}>
                        {inc.severity}
                      </span>
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>{inc.source}</td>
                    <td style={{ color: 'var(--text-primary)' }}>{inc.description}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
