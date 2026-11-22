import React, { useRef, useState, useCallback } from 'react';
import { PlayoutBroadcastState } from '../../types/playout';
import { api } from '../../services/api';
import { MasterScreenRouter } from '../Player/MasterScreenRouter';
import { MasterInputPreview } from '../Player/MasterInputPreview';
import { MasterAudioModal } from '../Audio/MasterAudioModal';
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
  onOpenAudioModal?: () => void;
}

export const MasterDeck: React.FC<MasterDeckProps> = ({
  playoutState,
  isMuted: propIsMuted,
  monitorVolume: propMonitorVolume,
  onToggleMonitorMute,
  onMonitorVolumeChange,
  onOpenAudioModal
}) => {
  const [localIsMuted, setLocalIsMuted] = useState(true);
  const [localAudioModalOpen, setLocalAudioModalOpen] = useState(false);
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

  const handleOpenAudioModal = useCallback(() => {
    if (onOpenAudioModal) {
      onOpenAudioModal();
    } else {
      setLocalAudioModalOpen(true);
    }
  }, [onOpenAudioModal]);

  // Manejo de alternado de CG (Ítem vs Maestro)
  const itemCgEnabled = Boolean(
    engineState.currentItem?.cg_enabled ??
    engineState.currentItem?.show_graphics ??
    playoutState?.graphics?.masterEnabled ??
    true
  );
  const masterCgEnabled = Boolean(playoutState?.graphics?.masterEnabled ?? true);
  const cgConfirmed = playoutState?.graphics?.nativeTelemetry?.visible !== undefined;

  const handleToggleItemCg = useCallback(async () => {
    if (!engineState.currentItem?.id) return;
    try {
      await api.toggleItemGraphics(engineState.currentItem.id, !itemCgEnabled);
    } catch (err: any) {
      console.error('Error al alternar CG del elemento actual:', err);
    }
  }, [engineState.currentItem?.id, itemCgEnabled]);

  const handleToggleMasterCg = useCallback(async () => {
    try {
      await api.toggleMasterGraphics(!masterCgEnabled);
    } catch (err: any) {
      console.error('Error al alternar CG maestro:', err);
    }
  }, [masterCgEnabled]);

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
          hasOnAirItem={Boolean(engineState.currentItem)}
          itemCgEnabled={itemCgEnabled}
          masterCgEnabled={masterCgEnabled}
          cgConfirmed={cgConfirmed}
          onToggleItemCg={handleToggleItemCg}
          onToggleMasterCg={handleToggleMasterCg}
          isOnAir={engineState.isOnAir}
          isPaused={engineState.isPaused}
          isBlackFallback={engineState.isBlackFallback}
          isMuted={isMuted}
          monitorVolume={monitorVolume}
          onToggleMute={handleToggleMute}
          onMonitorVolumeChange={handleMonitorVolumeChange}
          onOpenAudioModal={handleOpenAudioModal}
          masterVolumeDb={playoutState?.masterAudio?.volumeDb}
          isAudioActive={playoutState?.masterAudio?.active}
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

      {/* 3. SECCIÓN INFERIOR: MONITOR COMPACTO DE ENTRADA / PREVIEW (SDI / NDI) */}
      <MasterInputPreview
        isOnAir={engineState.isOnAir}
        isLive={engineState.isLive}
        profile={engineState.profile}
        isCompact={true}
      />

      {/* Modal Dedicado de Procesamiento Master de Audio */}
      {!onOpenAudioModal && (
        <MasterAudioModal
          isOpen={localAudioModalOpen}
          onClose={() => setLocalAudioModalOpen(false)}
          playoutState={playoutState}
          monitorMuted={isMuted}
          monitorVolume={monitorVolume}
          onToggleMonitorMute={handleToggleMute}
          onMonitorVolumeChange={handleMonitorVolumeChange}
          leftLevel={liveAudioLevelsRef.current.left}
          rightLevel={liveAudioLevelsRef.current.right}
        />
      )}
    </div>
  );
};

