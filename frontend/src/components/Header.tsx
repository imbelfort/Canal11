import React from 'react';
import { PlayoutBroadcastState } from '../types/playout';
import { Tv, Clock } from 'lucide-react';

interface HeaderProps {
  playoutState: PlayoutBroadcastState | null;
  isConnected: boolean;
}

export const Header: React.FC<HeaderProps> = ({ playoutState, isConnected }) => {
  const masterTimecode = playoutState?.timecodes?.stationMaster || '00:00:00;00';

  return (
    <header className="master-header">
      <div className="brand-section">
        <span className="station-logo">IB-Cast</span>
        <span className="header-badge">Master</span>
      </div>

      <div className="header-status-group">
        <div className="status-pill">
          <div className={`status-dot ${isConnected ? 'online' : ''}`}></div>
          <span>{isConnected ? 'En Línea' : 'Desconectado'}</span>
        </div>

        <div className="status-pill decklink">
          <Tv size={13} />
          <span>SDI Master</span>
        </div>

        <div className="master-clock" title="Hora Estación Master (UTC-4)">
          <Clock size={13} style={{ color: 'var(--text-secondary)' }} />
          <span>{masterTimecode}</span>
          <span style={{ fontSize: 9, color: 'var(--text-tertiary)', marginLeft: 3 }}>BOT</span>
        </div>
      </div>
    </header>
  );
};
