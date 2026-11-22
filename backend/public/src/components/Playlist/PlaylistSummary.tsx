import React from 'react';
import { Layers, Clock, Calendar, Radio, AlertTriangle } from 'lucide-react';

interface PlaylistSummaryProps {
  totalItems: number;
  totalDurationMs: number;
  projectedEndTime: Date | null;
  onAirItemTitle?: string;
  isCommercialOnAir?: boolean;
  missingCount?: number;
  onClearMissing?: () => void;
  remainingMs?: number;
  isOnAir?: boolean;
  engineState?: string;
  hasUnknownDurations?: boolean;
}

export const PlaylistSummary: React.FC<PlaylistSummaryProps> = React.memo(({
  totalItems,
  totalDurationMs,
  projectedEndTime,
  onAirItemTitle,
  isCommercialOnAir = false,
  missingCount = 0,
  onClearMissing,
  remainingMs = 0,
  isOnAir = false,
  engineState = 'IDLE',
  hasUnknownDurations = false
}) => {
  const formatTotalTime = (ms: number) => {
    if (!ms || ms <= 0) return '00h 00m 00s';
    const totalSec = Math.floor(ms / 1000);
    const days = Math.floor(totalSec / 86400);
    const hours = Math.floor((totalSec % 86400) / 3600);
    const minutes = Math.floor((totalSec % 3600) / 60);
    const seconds = totalSec % 60;

    const pad = (n: number) => String(n).padStart(2, '0');

    if (days > 0) {
      return `${days}d ${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`;
    }
    return `${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`;
  };

  const formatEndTime = (d: Date | null) => {
    if (!d) return '--:--:--';
    return d.toLocaleString('es-BO', {
      timeZone: 'America/La_Paz',
      weekday: 'short',
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  };

  const formatCountdownText = (ms: number) => {
    if (ms <= 0) return '0s';
    const totalSec = Math.ceil(ms / 1000);
    const hours = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;

    if (hours > 0) {
      return `${hours}h ${mins}m ${secs}s`;
    }
    if (mins > 0) {
      return `${mins}min ${secs}seg`;
    }
    return `${secs}seg`;
  };

  // Umbral unificado de alerta broadcast crítica (15 segundos)
  const CRITICAL_ALERT_MS = 15000;
  const remainingSecs = Math.ceil(remainingMs / 1000);
  const isCritical = isOnAir && remainingMs > 0 && remainingMs <= CRITICAL_ALERT_MS;

  // Estado veraz cuando no hay video activo o está en modo de espera/reserva
  const getIdleStateLabel = () => {
    switch (engineState) {
      case 'PAUSED':
        return 'PAUSADO (CONGELADO)';
      case 'LIVE_SDI':
        return 'EN VIVO SDI (ENTRADA DIRECTA)';
      case 'LIVE_NDI':
        return 'EN VIVO NDI (STREAM)';
      case 'EMERGENCY_FALLBACK':
        return 'FALLBACK DE EMERGENCIA ACTIVO';
      case 'BLACK_FALLBACK':
        return 'CUADRO NEGRO (SIN SEÑAL)';
      default:
        return 'EN ESPERA (DETENIDO)';
    }
  };

  return (
    <div className="stats-bar">
      {/* 1. Total Elementos */}
      <div className="stat-metric">
        <span className="num" style={{ color: 'var(--apple-cyan)' }}>{totalItems}</span>
        <span className="lbl">
          <Layers size={11} />
          Total Elementos
        </span>
      </div>

      {/* 2. Duración Total (con indicador de estimado si hay clips sin duración conocida) */}
      <div className="stat-metric" title={hasUnknownDurations ? "Duración estimada: contiene elementos con duración no detectada o transmisiones en vivo" : undefined}>
        <span className="num" style={{ color: 'var(--apple-green)' }}>
          {hasUnknownDurations && <span style={{ fontSize: 11, marginRight: 2, opacity: 0.85 }}>≥</span>}
          {formatTotalTime(totalDurationMs)}
        </span>
        <span className="lbl">
          <Clock size={11} />
          Duración Total {hasUnknownDurations ? '(Estimada)' : ''}
        </span>
      </div>

      {/* 3. Fin de Emisión Proyectado */}
      <div className="stat-metric">
        <span className="num" style={{ color: 'var(--apple-orange)' }}>
          {hasUnknownDurations && projectedEndTime && <span style={{ fontSize: 11, marginRight: 2, opacity: 0.85 }}>≥</span>}
          {formatEndTime(projectedEndTime)}
        </span>
        <span className="lbl">
          <Calendar size={11} />
          Fin de Emisión
        </span>
      </div>

      {/* 4. Tarjeta de Faltantes (con botón explícito para purgar sin disparar clics accidentales) */}
      {missingCount > 0 && (
        <div
          className="stat-metric"
          style={{
            border: '1px solid var(--color-danger, #ef4444)',
            backgroundColor: 'rgba(239, 68, 68, 0.12)',
            borderRadius: 6,
            padding: '4px 8px',
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}
        >
          <div>
            <span className="num" style={{ color: 'var(--color-danger, #ef4444)' }}>{missingCount}</span>
            <span className="lbl" style={{ color: 'var(--color-danger, #ef4444)', fontWeight: 600 }}>
              <AlertTriangle size={11} color="var(--color-danger, #ef4444)" />
              Faltantes
            </span>
          </div>

          {onClearMissing && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onClearMissing();
              }}
              style={{
                background: 'rgba(239, 68, 68, 0.25)',
                border: '1px solid rgba(239, 68, 68, 0.5)',
                color: 'var(--color-danger, #ef4444)',
                borderRadius: 4,
                padding: '2px 6px',
                fontSize: 10,
                fontWeight: 700,
                cursor: 'pointer',
                letterSpacing: '0.3px',
                transition: 'all 0.15s ease'
              }}
              title="Limpiar y remover elementos no encontrados de la pauta"
            >
              PURGAR
            </button>
          )}
        </div>
      )}

      {/* 5. Al Aire Actualmente */}
      {onAirItemTitle ? (
        <div
          className={`stat-metric on-air-beacon-card ${isCommercialOnAir ? 'is-commercial' : ''}`}
          style={{
            flex: 1,
            maxWidth: 480,
            background: isCritical ? 'rgba(239, 68, 68, 0.18)' : undefined,
            border: isCritical ? '1px solid var(--color-danger, #ef4444)' : undefined,
            transition: 'all 0.25s ease'
          }}
          title={`Emitiéndose actualmente al aire: ${onAirItemTitle}${isCommercialOnAir ? ' (Corte Comercial / Avance)' : ''}`}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 5 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span
                className={`on-air-pulse-dot ${isCritical ? 'blinking' : ''}`}
                style={{ background: isCritical ? 'var(--color-danger, #ef4444)' : undefined }}
              />
              <span
                className="lbl on-air-label"
                style={{
                  letterSpacing: '0.4px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4
                }}
              >
                <Radio size={11} className="on-air-radio-icon" color={isCritical ? 'var(--color-danger, #ef4444)' : undefined} />
                <span style={{ color: isCritical ? 'var(--color-danger, #ef4444)' : undefined, fontWeight: isCritical ? 700 : undefined }}>
                  {isCommercialOnAir ? 'AL AIRE • AVANCE / COMERCIAL' : 'AL AIRE ACTUALMENTE'}
                </span>
              </span>
            </div>

            {isOnAir && (
              <span
                className={isCritical ? 'countdown-critical-10s' : ''}
                style={{
                  fontSize: isCritical ? 12 : 11,
                  fontFamily: 'var(--font-family-mono, monospace)',
                  fontWeight: 700,
                  color: isCritical ? 'var(--color-danger, #ef4444)' : 'var(--color-primary)',
                  letterSpacing: '0.3px',
                  whiteSpace: 'nowrap'
                }}
              >
                {remainingMs > 0
                  ? (isCritical ? `FINALIZA: ${remainingSecs}s` : `Faltan ${formatCountdownText(remainingMs)}`)
                  : (engineState === 'LIVE_SDI' || engineState === 'LIVE_NDI' ? 'EN VIVO' : '--:--:--')}
              </span>
            )}
          </div>

          <span
            className="num on-air-title on-air-text-mask-faded"
            style={{
              fontSize: 12,
              marginTop: 2,
              letterSpacing: '0.2px',
              color: isCritical ? 'var(--color-danger, #ef4444)' : undefined
            }}
          >
            {onAirItemTitle}
          </span>
        </div>
      ) : (
        <div className="stat-metric" style={{ flex: 1, maxWidth: 360, opacity: 0.75 }}>
          <span className="lbl">
            <Radio size={11} />
            Al Aire Actualmente
          </span>
          <span className="num" style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
            {getIdleStateLabel()}
          </span>
        </div>
      )}
    </div>
  );
});

PlaylistSummary.displayName = 'PlaylistSummary';
