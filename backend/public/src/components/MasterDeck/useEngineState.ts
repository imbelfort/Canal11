import { useMemo } from 'react';
import { PlayoutBroadcastState, NEAR_END_MS, CRITICAL_MS } from '../../types/playout';

export interface UseEngineStateResult {
  state: string;
  currentItem: PlayoutBroadcastState['currentItem'];
  nextItem: PlayoutBroadcastState['nextItem'];
  hasNextItem: boolean;
  totalItems: number;
  emergencyMedia: PlayoutBroadcastState['emergencyMedia'];
  profile: string;
  isLiveSdi: boolean;
  isLiveNdi: boolean;
  isLive: boolean;
  isPlaying: boolean;
  isPaused: boolean;
  isBlackFallback: boolean;
  isOnAir: boolean;
  isNextMissing: boolean;
  elapsedMs: number;
  remainingMs: number;
  progressPercent: number;
  remainingSeconds: number;
  isNearEnd: boolean;
  isCritical: boolean;
  eventTitle: string;
  eventPath: string;
  sourceKind: 'LIVE_NDI' | 'LIVE_SDI' | 'FILE' | 'EMERGENCY' | 'BLACK' | 'IDLE';
}

export function useEngineState(playoutState: PlayoutBroadcastState | null): UseEngineStateResult {
  return useMemo(() => {
    const state = playoutState?.state || 'IDLE';
    const currentItem = playoutState?.currentItem || null;
    const nextItem = playoutState?.nextItem || null;
    const hasNextItem = playoutState?.hasNextItem ?? false;
    const totalItems = playoutState?.totalItems ?? 0;
    const emergencyMedia = playoutState?.emergencyMedia;
    // Regla N2: El perfil broadcast activo proviene exclusivamente de la telemetría de Rust.
    // Si Rust no ha reportado telemetría aún o no está conectado, se muestra null / '--' (sin inventar norma).
    const profile = playoutState?.engine?.activeProfile || playoutState?.decklink?.activeProfile || playoutState?.broadcastStandard?.profile || '--';

    const isLiveSdi = state === 'LIVE_SDI' || currentItem?.event_type === 'LIVE_SDI';
    const isLiveNdi = state === 'LIVE_NDI' || currentItem?.event_type === 'LIVE_NDI';
    const isLive = isLiveSdi || isLiveNdi;
    const isPlaying = state === 'PLAYING';
    const isPaused = state === 'PAUSED';
    const isBlackFallback = state === 'BLACK_FALLBACK';
    const isOnAir = isPlaying || isPaused || isLive || state === 'EMERGENCY_FALLBACK' || isBlackFallback;

    const isNextMissing = Boolean(
      nextItem &&
      nextItem.event_type !== 'LIVE_SDI' &&
      nextItem.event_type !== 'LIVE_NDI' &&
      (nextItem.status === 'ERROR' || nextItem.status === 'FILE_CORRUPT_OR_MISSING' || nextItem.file_exists === false)
    );

    // Tiempos reales del clip gobernados preferentemente por Rust
    const elapsedMs = playoutState?.engine?.clipElapsedMs ?? (playoutState?.elapsedMs || 0);
    const durationMs = playoutState?.engine?.clipDurationMs ?? (currentItem?.duration_ms || 0);
    const remainingMs = isLive ? 0 : (durationMs > 0 ? Math.max(0, durationMs - elapsedMs) : (playoutState?.remainingMs || 0));
    const progressPercent = durationMs > 0 ? Math.min(100, Math.max(0, (elapsedMs / durationMs) * 100)) : (playoutState?.progressPercent || 0);
    
    const remainingSeconds = Math.ceil(remainingMs / 1000);
    // Destello de advertencia fin de clip solo cuando está activamente emitiendo (no pausado)
    const isNearEnd = isOnAir && !isPaused && !isLive && remainingMs > 0 && remainingMs <= NEAR_END_MS;
    const isCritical = isNearEnd && remainingMs <= CRITICAL_MS;

    let sourceKind: UseEngineStateResult['sourceKind'] = 'IDLE';
    let eventTitle = 'Sistema en Espera';
    let eventPath = 'Presione Iniciar para comenzar la transmisión';

    if (isLiveNdi) {
      sourceKind = 'LIVE_NDI';
      eventTitle = currentItem?.title || 'Transmisión en Vivo NDI (Red IP LAN)';
      eventPath = 'Fuente NDI IP en Red LAN';
    } else if (isLiveSdi) {
      sourceKind = 'LIVE_SDI';
      const sdiDeviceName = playoutState?.decklink?.deviceName || 'SDI';
      eventTitle = currentItem?.title || `Transmisión en Vivo SDI (${sdiDeviceName})`;
      eventPath = 'Canal SDI Entrada Directa';
    } else if (currentItem) {
      sourceKind = 'FILE';
      eventTitle = currentItem.title;
      eventPath = currentItem.file_path;
    } else if (state === 'EMERGENCY_FALLBACK') {
      sourceKind = 'EMERGENCY';
      eventTitle = emergencyMedia?.title || 'Cortinilla de Respaldo de Emergencia';
      eventPath = emergencyMedia?.file_path || 'Patrón Técnico SMPTE';
    } else if (isBlackFallback) {
      sourceKind = 'BLACK';
      eventTitle = 'Cuadro Negro Emitiéndose';
      eventPath = 'Salida de seguridad SDI activa';
    }

    return {
      state,
      currentItem,
      nextItem,
      hasNextItem,
      totalItems,
      emergencyMedia,
      profile,
      isLiveSdi,
      isLiveNdi,
      isLive,
      isPlaying,
      isPaused,
      isBlackFallback,
      isOnAir,
      isNextMissing,
      elapsedMs,
      remainingMs,
      progressPercent,
      remainingSeconds,
      isNearEnd,
      isCritical,
      eventTitle,
      eventPath,
      sourceKind
    };
  }, [playoutState]);
}

