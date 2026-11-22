import React from 'react';
import {
  Play,
  Pause,
  Square,
  SkipForward,
  ShieldAlert
} from 'lucide-react';

export interface PgmTransportControlsProps {
  isPlaying: boolean;
  isPaused: boolean;
  isLive: boolean;
  isCommandInProgress: boolean;
  totalItems: number;
  onPlayPause: () => void;
  onNext: () => void;
  onStop: () => void;
  onEmergency: () => void;
}

export const PgmTransportControls: React.FC<PgmTransportControlsProps> = React.memo(({
  isPlaying,
  isPaused,
  isLive,
  isCommandInProgress,
  totalItems,
  onPlayPause,
  onNext,
  onStop,
  onEmergency
}) => {
  return (
    <div className="controls-card" style={{ padding: '4px 8px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr 1fr', gap: 4 }}>
        {/* Play / Pausa usando icono Pause correspondiente */}
        <button
          type="button"
          className={`btn-cmd play ${isPlaying || isLive ? 'active' : ''}`}
          onClick={onPlayPause}
          disabled={isCommandInProgress}
          title={isPlaying ? 'Pausar emisión (Freeze)' : (isPaused ? 'Reanudar emisión' : isLive ? 'Detener señal en vivo' : 'Iniciar emisión (Play)')}
          style={{ minHeight: 28, height: 28, padding: '2px 6px', fontSize: 11, opacity: isCommandInProgress ? 0.7 : 1 }}
        >
          {isPlaying ? <Pause size={12} /> : (isLive ? <Square size={12} /> : <Play size={12} />)}
          <span>{isPlaying ? 'Pausa' : (isPaused ? 'Reanudar' : isLive ? 'Detener' : 'Iniciar')}</span>
        </button>

        {/* Siguiente */}
        <button
          type="button"
          className="btn-cmd next"
          onClick={onNext}
          disabled={isCommandInProgress || totalItems === 0}
          title={totalItems > 1 ? 'Saltar inmediatamente al siguiente video (Next)' : (totalItems === 1 ? 'Saltar elemento al aire' : 'No hay elementos en la lista')}
          style={{ minHeight: 28, height: 28, padding: '2px 6px', fontSize: 11, opacity: isCommandInProgress ? 0.7 : 1 }}
        >
          <SkipForward size={12} />
          <span>Siguiente</span>
        </button>

        {/* Detener */}
        <button
          type="button"
          className="btn-cmd stop"
          onClick={onStop}
          disabled={isCommandInProgress}
          title="Detener emisión (Stop)"
          style={{ minHeight: 28, height: 28, padding: '2px 6px', fontSize: 11, opacity: isCommandInProgress ? 0.7 : 1 }}
        >
          <Square size={12} />
          <span>Detener</span>
        </button>

        {/* Emergencia: NUNCA deshabilitado, ignora isCommandInProgress */}
        <button
          type="button"
          className="btn-emergency"
          onClick={onEmergency}
          title="Disparar conmutación inmediata a contingencia (fallback/cuadro negro)"
          style={{ minHeight: 28, height: 28, padding: '2px 6px', fontSize: 10.5, justifyContent: 'center' }}
        >
          <ShieldAlert size={12} />
          <span>Respaldo</span>
        </button>
      </div>
    </div>
  );
});

PgmTransportControls.displayName = 'PgmTransportControls';

