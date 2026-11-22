import React from 'react';

export interface PgmTimecodeBarProps {
  progressPercent: number;
  isNearEnd: boolean;
  isCritical: boolean;
  remainingSeconds: number;
  elapsedMs: number;
  remainingMs: number;
  isLive: boolean;
  isOnAir: boolean;
  itemElapsedTC?: string;
}

const formatHHMMSS = (ms: number): string => {
  if (ms <= 0) return '00:00:00';
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
};

const formatRemainingHHMMSS = (ms: number): string => {
  if (ms <= 0) return '00:00:00';
  const totalSec = Math.ceil(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
};

export const PgmTimecodeBar: React.FC<PgmTimecodeBarProps> = React.memo(({
  progressPercent,
  isNearEnd,
  isCritical,
  remainingSeconds,
  elapsedMs,
  remainingMs,
  isLive,
  isOnAir,
  itemElapsedTC
}) => {
  const elapsedFormatted = itemElapsedTC || formatHHMMSS(elapsedMs);
  const remainingFormatted = isLive
    ? 'EN VIVO'
    : (remainingMs > 0 ? formatRemainingHHMMSS(remainingMs) : (isOnAir ? '--:--:--' : '00:00:00'));

  return (
    <div style={{
      padding: '4px 8px',
      background: 'var(--color-canvas-soft)',
      borderBottom: '1px solid var(--border-subtle)',
      display: 'flex',
      flexDirection: 'column',
      gap: 3
    }}>
      {/* Barra de progreso de emisión */}
      <div className="progress-track" style={{ height: 3, margin: 0, borderRadius: 2, background: 'rgba(255,255,255,0.06)' }}>
        <div
          className={`progress-fill ${isNearEnd ? 'near-end-fill' : ''}`}
          style={{
            width: `${Math.min(100, Math.max(0, progressPercent))}%`,
            backgroundColor: isCritical ? 'var(--color-danger, #ef4444)' : (isNearEnd ? 'var(--color-live)' : undefined)
          }}
        />
      </div>

      {/* Fila: Tiempos Transcurrido y Restante */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ fontSize: 8, fontWeight: 700, color: 'var(--color-text-muted)' }}>TX</span>
          <span style={{ fontFamily: 'var(--font-family-mono, monospace)', fontSize: 12, fontWeight: 700, color: 'var(--color-ink)' }}>
            {elapsedFormatted}
          </span>
        </div>

        {isNearEnd && (
          <span
            className={`m3-near-end-pill ${isCritical ? 'countdown-critical-10s' : ''}`}
            style={{
              padding: '1px 6px',
              fontSize: isCritical ? 10 : 9,
              background: isCritical ? 'rgba(239, 68, 68, 0.25)' : undefined,
              border: isCritical ? '1px solid var(--color-danger, #ef4444)' : undefined,
              color: isCritical ? 'var(--color-danger, #ef4444)' : undefined
            }}
          >
            <span className="tally-dot blinking" style={{ width: 4, height: 4, background: isCritical ? 'var(--color-danger, #ef4444)' : undefined }} />
            FIN ({remainingSeconds}s)
          </span>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ fontSize: 8, fontWeight: 700, color: 'var(--color-text-muted)' }}>REM</span>
          <span
            className={isCritical ? 'countdown-critical-10s' : ''}
            style={{
              fontFamily: 'var(--font-family-mono, monospace)',
              fontSize: isCritical ? 13 : 12,
              fontWeight: 700,
              color: isCritical ? 'var(--color-danger, #ef4444)' : (isNearEnd ? 'var(--color-live)' : 'var(--color-primary)')
            }}
          >
            {isLive ? remainingFormatted : `-${remainingFormatted}`}
          </span>
        </div>
      </div>
    </div>
  );
});

PgmTimecodeBar.displayName = 'PgmTimecodeBar';

