import React from 'react';
import { AlertTriangle, Check, RefreshCw } from 'lucide-react';
import { formatDuration, formatHoursMinutesSeconds } from './types';

interface BuilderHeaderCardsProps {
  totalDurationMs: number;
  totalCount: number;
  videoCount: number;
  liveCount: number;
  spotCount: number;
  selectedCount: number;
  selectedDurationMs: number;
  selectedMinutesFormatted: string;
  selectedPct: string;
  onDeselectAll: () => void;
  missingCount: number;
  isValidating?: boolean;
  onVerifyFiles: () => void;
  onPurgeMissing: () => void;
}

export const BuilderHeaderCards: React.FC<BuilderHeaderCardsProps> = ({
  totalDurationMs,
  totalCount,
  videoCount,
  liveCount,
  spotCount,
  selectedCount,
  selectedDurationMs,
  selectedMinutesFormatted,
  selectedPct,
  onDeselectAll,
  missingCount,
  isValidating = false,
  onVerifyFiles,
  onPurgeMissing
}) => {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '1.2fr 1.1fr 1.4fr 1.2fr',
      gap: 8,
      alignItems: 'stretch'
    }}>
      {/* Card 1: TOTAL DE HORAS (COMPACTO Y RIGIDO) */}
      <div style={{
        background: 'var(--color-field)',
        border: '1px solid var(--color-hairline)',
        borderRadius: 6,
        padding: '6px 12px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        height: 52,
        boxSizing: 'border-box',
        overflow: 'hidden'
      }}>
        <div style={{
          fontSize: 9,
          fontWeight: 700,
          color: 'var(--color-text-muted)',
          textTransform: 'uppercase',
          letterSpacing: '0.4px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span>DURACIÓN TOTAL</span>
          {totalDurationMs >= 86400000 && (
            <span style={{ color: 'var(--color-cyan)', fontWeight: 700, fontSize: 8.5 }}>MULTIDÍA</span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 2 }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-primary)', fontFamily: 'var(--font-family-mono)', letterSpacing: '0.4px' }}>
            {formatHoursMinutesSeconds(totalDurationMs)}
          </span>
          <span style={{ fontSize: 9.5, color: 'var(--color-text-muted)', fontFamily: 'var(--font-family-mono)' }}>
            TC {formatDuration(totalDurationMs)};00
          </span>
        </div>
      </div>

      {/* Card 2: CANTIDAD DE ELEMENTOS (COMPACTO Y RIGIDO) */}
      <div style={{
        background: 'var(--color-field)',
        border: '1px solid var(--color-hairline)',
        borderRadius: 6,
        padding: '6px 12px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        height: 52,
        boxSizing: 'border-box',
        overflow: 'hidden'
      }}>
        <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
          TOTAL ELEMENTOS
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 2 }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-ink)' }}>
            {totalCount} <span style={{ fontSize: 10, fontWeight: 500, color: 'var(--color-text-muted)' }}>eventos</span>
          </span>
          <span style={{ fontSize: 9.5, color: 'var(--color-text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {videoCount}V • {spotCount}P • {liveCount}L
          </span>
        </div>
      </div>

      {/* Card 3: CÁLCULO DE SELECCIÓN DE BLOQUE / TANDA */}
      <div style={{
        background: selectedCount > 0 ? 'rgba(0, 122, 255, 0.08)' : 'var(--color-field)',
        border: selectedCount > 0 ? '1px solid var(--apple-blue, #0a84ff)' : '1px solid var(--color-hairline)',
        borderRadius: 6,
        padding: '6px 12px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        height: 52,
        boxSizing: 'border-box',
        overflow: 'hidden'
      }}>
        <div style={{
          fontSize: 9,
          fontWeight: 700,
          color: selectedCount > 0 ? 'var(--apple-blue, #0a84ff)' : 'var(--color-text-muted)',
          textTransform: 'uppercase',
          letterSpacing: '0.4px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span>MEDIDOR DE BLOQUE</span>
          {selectedCount > 0 && (
            <button
              type="button"
              className="btn-tool"
              onClick={onDeselectAll}
              style={{ fontSize: 8.5, padding: '0 4px', height: 16, lineHeight: '14px' }}
              title="Deseleccionar todos"
            >
              ✕ Desmarcar
            </button>
          )}
        </div>

        {selectedCount > 0 ? (
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 2 }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--apple-blue, #0a84ff)', fontFamily: 'var(--font-family-mono)' }}>
              {formatHoursMinutesSeconds(selectedDurationMs)}
            </span>
            <span style={{ fontSize: 9.5, color: 'var(--color-ink)', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {selectedCount} sel ({selectedMinutesFormatted} min • {selectedPct}%)
            </span>
          </div>
        ) : (
          <div style={{ fontSize: 10, color: 'var(--color-text-muted)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            0 seleccionados (Clic/Shift para medir)
          </div>
        )}
      </div>

      {/* Card 4: VERIFICACIÓN INTELIGENTE DE ARCHIVOS EN DISCO */}
      <div style={{
        background: missingCount > 0 ? 'rgba(239, 68, 68, 0.12)' : 'var(--color-field)',
        border: missingCount > 0 ? '1px solid #ef4444' : '1px solid var(--color-hairline)',
        borderRadius: 6,
        padding: '6px 12px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        height: 52,
        boxSizing: 'border-box',
        overflow: 'hidden'
      }}>
        <div style={{
          fontSize: 9,
          fontWeight: 700,
          color: missingCount > 0 ? '#ef4444' : 'var(--color-text-muted)',
          textTransform: 'uppercase',
          letterSpacing: '0.4px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span>ARCHIVOS EN DISCO</span>
          <button
            type="button"
            className="ide-icon-btn"
            onClick={onVerifyFiles}
            disabled={isValidating}
            style={{ padding: '1px 3px', border: 'none', background: 'transparent', cursor: 'pointer' }}
            title="Re-verificar existencia física de archivos"
          >
            <RefreshCw size={10} className={isValidating ? 'spin' : ''} color="var(--color-text-muted)" />
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
          {missingCount > 0 ? (
            <>
              <span style={{ fontSize: 12.5, fontWeight: 700, color: '#ef4444', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <AlertTriangle size={12} color="#ef4444" />
                {missingCount} Faltan
              </span>
              <button
                type="button"
                className="btn-tool"
                onClick={onPurgeMissing}
                style={{
                  fontSize: 8.5,
                  padding: '1px 6px',
                  height: 18,
                  lineHeight: '16px',
                  background: 'rgba(239, 68, 68, 0.2)',
                  color: '#ef4444',
                  border: '1px solid rgba(239, 68, 68, 0.5)',
                  fontWeight: 600,
                  cursor: 'pointer',
                  borderRadius: 3
                }}
                title="Eliminar todos los elementos cuyos archivos no existen en disco"
              >
                Purgar ({missingCount})
              </button>
            </>
          ) : isValidating ? (
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-primary)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <RefreshCw size={11} className="spin" color="var(--color-primary)" />
              Comprobando...
            </span>
          ) : (
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-success)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <Check size={13} color="var(--color-success)" strokeWidth={2.5} />
              100% OK en disco
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
