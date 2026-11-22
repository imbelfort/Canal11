import React from 'react';
import { PlaylistItem } from '../types/playout';
import { ArrowRightCircle } from 'lucide-react';

interface NextCueProps {
  nextItem: PlaylistItem | null;
}

export const NextCue: React.FC<NextCueProps> = ({ nextItem }) => {
  const formatDuration = (ms: number) => {
    if (!ms || ms < 0) return '00:00:00';
    const totalSec = Math.floor(ms / 1000);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(h)}:${pad(m)}:${pad(s)}`;
  };

  return (
    <div className="monitor-card" style={{ padding: '10px 12px', background: 'var(--bg-surface)' }}>
      <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--apple-cyan)', textTransform: 'uppercase', letterSpacing: '0.4px', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
        <ArrowRightCircle size={12} />
        <span>Próximo en Entrar (Next Cue)</span>
      </div>
      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {nextItem ? nextItem.title : 'Fin de lista de emisión'}
      </div>
      <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginTop: 2 }}>
        {nextItem ? `Duración: ${formatDuration(nextItem.duration_ms)} • Modo: ${nextItem.timing_mode}` : 'Sin elementos pendientes'}
      </div>
    </div>
  );
};
