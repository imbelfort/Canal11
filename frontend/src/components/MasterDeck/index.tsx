import React, { useRef, useState, useCallback } from 'react';
import { PlayoutBroadcastState } from '../../types/playout';
import { api } from '../../services/api';
import { MasterScreenRouter } from '../Player/MasterScreenRouter';
import { AlertCircle, X } from 'lucide-react';

import { useEngineState } from './useEngineState';
import { usePlayoutCommands } from './usePlayoutCommands';
import { PgmHeader } from './PgmHeader';
import { PgmTimecodeBar } from './PgmTimecodeBar';
import { NextItemBanner } from './NextItemBanner';
import { PgmTransportControls } from './PgmTransportControls';

export interface MasterDeckProps {
  playoutState: PlayoutBroadcastState | null;
  isMuted?: boolean;
  monitorVolume?: number;
  onToggleMonitorMute?: () => void;
  onMonitorVolumeChange?: (v: number) => void;
}

export const MasterDeck: React.FC<MasterDeckProps> = ({
  playoutState,
  isMuted: propIsMuted,
  monitorVolume: propMonitorVolume,
  onToggleMonitorMute,
  onMonitorVolumeChange
}) => {
  const [localIsMuted, setLocalIsMuted] = useState(true);
  const [localMonitorVolume, setLocalMonitorVolume] = useState<number>(1.0);

  // Niveles de audio medidos en el navegador: almacenados en useRef para EVITAR 30-60 re-renders por segundo en todo MasterDeck
  const liveAudioLevelsRef = useRef<{ left: number; right: number }>({ left: 0, right: 0 });

  // Hook 1: Extracción del estado veraz del motor (Rust / Node)
  const engineState = useEngineState(playoutState);

  // Hook 2: Manejo de comandos con antirrebote, banner de errores y emergencia desvinculada
  const commands = usePlayoutCommands({
    isPlaying: engineState.isPlaying,
    isPaused: engineState.isPaused,
    isLive: engineState.isLive,
    loop: Boolean(playoutState?.loop)
  });

  const isMuted = propIsMuted !== undefined ? propIsMuted : localIsMuted;
  const monitorVolume = propMonitorVolume !== undefined ? propMonitorVolume : localMonitorVolume;

  const handleToggleMute = useCallback(() => {
    if (onToggleMonitorMute) {
      onToggleMonitorMute();
    } else {
      setLocalIsMuted(prev => !prev);
    }
  }, [onToggleMonitorMute]);

  const handleMonitorVolumeChange = useCallback((v: number) => {
    if (onMonitorVolumeChange) {
      onMonitorVolumeChange(v);
    } else {
      setLocalMonitorVolume(v);
    }
  }, [onMonitorVolumeChange]);

  const handleAudioLevelsChange = useCallback((left: number, right: number) => {
    liveAudioLevelsRef.current = { left, right };
  }, []);

  const nextItemDuration = engineState.nextItem
    ? ((engineState.nextItem.out_point_ms && engineState.nextItem.out_point_ms > (engineState.nextItem.in_point_ms || 0))
        ? (engineState.nextItem.out_point_ms - (engineState.nextItem.in_point_ms || 0))
        : (engineState.nextItem.duration_ms || 0))
    : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0, height: '100%' }}>
      {/* Banner de error visible para comandos */}
      {commands.commandError && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '4px 8px',
          background: 'rgba(239, 68, 68, 0.2)',
          borderBottom: '1px solid var(--color-danger)',
          color: '#ff453a',
          fontSize: 11,
          fontWeight: 600
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <AlertCircle size={13} color="#ff453a" />
            <span>{commands.commandError}</span>
          </div>
          <button
            type="button"
            onClick={commands.clearCommandError}
            style={{ background: 'transparent', border: 'none', color: '#ff453a', cursor: 'pointer', padding: 0 }}
          >
            <X size={13} />
          </button>
        </div>
      )}

      {/* 1. SECCIÓN PRINCIPAL ARRIBA: MONITOR PGM (SALIDA AL AIRE) */}
      <div className="monitor-card" style={{ borderBottom: '1px solid var(--color-hairline)' }}>
        <PgmHeader
          sourceKind={engineState.sourceKind}
          isOnAir={engineState.isOnAir}
          isPaused={engineState.isPaused}
          isBlackFallback={engineState.isBlackFallback}
          isMuted={isMuted}
          monitorVolume={monitorVolume}
          onToggleMute={handleToggleMute}
          onMonitorVolumeChange={handleMonitorVolumeChange}
        />

        {/* Identificador de Emisión Actual */}
        <div style={{
          padding: '3px 8px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 6,
          background: 'rgba(255, 255, 255, 0.015)',
          minHeight: 22
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, minWidth: 0, overflow: 'hidden' }}>
            <span
              className="on-air-text-mask-faded"
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: 'var(--text-primary)'
              }}
              title={engineState.eventTitle}
            >
              {engineState.eventTitle}
            </span>
            {engineState.eventPath && (
              <span style={{
                fontSize: 9,
                fontFamily: 'var(--font-mono, monospace)',
                color: 'var(--color-text-muted)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}>
                • {engineState.eventPath}
              </span>
            )}
          </div>
          <span style={{ fontSize: 9, fontFamily: 'var(--font-mono, monospace)', color: 'var(--color-text-muted)', flexShrink: 0 }}>
            {engineState.profile}
          </span>
        </div>

        {/* Pantalla PGM en Vivo (16:9 con MasterScreenRouter) */}
        <MasterScreenRouter
          playoutState={playoutState}
          isMuted={isMuted}
          volume={isMuted ? 0 : monitorVolume}
          onToggleMute={handleToggleMute}
          onOpenAudioModal={handleOpenAudioModal}
          onAudioLevelsChange={handleAudioLevelsChange}
        />

        {/* Telemetría Dinámica de Tiempo */}
        <PgmTimecodeBar
          progressPercent={engineState.progressPercent}
          isNearEnd={engineState.isNearEnd}
          isCritical={engineState.isCritical}
          remainingSeconds={engineState.remainingSeconds}
          elapsedMs={engineState.elapsedMs}
          remainingMs={engineState.remainingMs}
          isLive={engineState.isLive}
          isOnAir={engineState.isOnAir}
          itemElapsedTC={playoutState?.timecodes?.itemElapsed}
        />

        {/* Barra de Próximo al Aire (Next Cue) */}
        <NextItemBanner
          hasNextItem={engineState.hasNextItem}
          nextItemTitle={engineState.nextItem?.title}
          nextItemDurationMs={nextItemDuration}
          isNextMissing={engineState.isNextMissing}
        />
      </div>

      {/* 2. BOTONERA MAESTRA (Play/Pausa, Siguiente, Detener y Respaldo de Emergencia) */}
      <PgmTransportControls
        isPlaying={engineState.isPlaying}
        isPaused={engineState.isPaused}
        isLive={engineState.isLive}
        isCommandInProgress={commands.isCommandInProgress}
        totalItems={engineState.totalItems}
        onPlayPause={commands.handlePlayPause}
        onNext={commands.handleNext}
        onStop={commands.handleStop}
        onEmergency={commands.handleEmergency}
      />
    </div>
  );
};

