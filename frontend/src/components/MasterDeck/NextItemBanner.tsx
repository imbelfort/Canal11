import React from 'react';
import { ArrowRightCircle, AlertTriangle } from 'lucide-react';

export interface NextItemBannerProps {
  hasNextItem: boolean;
  nextItemTitle?: string;
  nextItemDurationMs?: number;
  isNextMissing: boolean;
}

const formatHHMMSS = (ms: number): string => {
  if (!ms || ms <= 0) return '--:--:--';
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
};

export const NextItemBanner: React.FC<NextItemBannerProps> = React.memo(({
  hasNextItem,
  nextItemTitle,
  nextItemDurationMs = 0,
  isNextMissing
}) => {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 6,
      padding: '2px 8px',
      background: isNextMissing ? 'rgba(255, 69, 58, 0.16)' : 'rgba(0,0,0,0.15)',
      borderBottom: '1px solid var(--border-subtle)',
      borderTop: isNextMissing ? '1px solid var(--color-danger, #ef4444)' : 'none'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, minWidth: 0, flex: 1, overflow: 'hidden' }}>
        {isNextMissing ? (
          <AlertTriangle size={12} color="var(--apple-red)" className="blinking" style={{ flexShrink: 0 }} />
        ) : (
          <ArrowRightCircle size={12} color="var(--color-cyan)" style={{ flexShrink: 0 }} />
        )}
        <span style={{
          fontSize: 10,
          fontWeight: 600,
          color: isNextMissing ? '#ff453a' : 'var(--color-ink-soft)',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis'
        }}>
          {isNextMissing ? 'ERROR EN SIGUIENTE: ' : 'SIG: '}
          {hasNextItem && nextItemTitle ? nextItemTitle : 'Fin de lista'}
        </span>
      </div>

      {hasNextItem && nextItemDurationMs > 0 && (
        <span style={{ fontSize: 9.5, fontFamily: 'var(--font-family-mono, monospace)', color: 'var(--color-text-muted)', flexShrink: 0 }}>
          {formatHHMMSS(nextItemDurationMs)}
        </span>
      )}
    </div>
  );
});

NextItemBanner.displayName = 'NextItemBanner';

