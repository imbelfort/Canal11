import { useState, useEffect } from 'react';
import { PlayoutBroadcastState } from '../types/playout';

// Detector para saber si estamos ejecutándonos dentro del WebView nativo de Tauri
export const isTauriEnv = () => {
  if (typeof window === 'undefined') return false;
  return Boolean(
    ('__TAURI_INTERNALS__' in window) ||
    ('__TAURI__' in window) ||
    ((window as any).electronAPI?.isTauri)
  );
};

export function usePlayoutSocket() {
  const [playoutState, setPlayoutState] = useState<PlayoutBroadcastState | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    let unlistenFn: (() => void) | null = null;

    // Comunicación directa de eventos en memoria con cero latencia mediante Tauri IPC
    import('@tauri-apps/api/event').then(({ listen }) => {
      listen<any>('playout-telemetry', (event) => {
        setIsConnected(true);
        const raw = event.payload;
        if (raw) {
          const rawCur = raw.playlist?.current_item;
          const currentItem = rawCur ? {
            ...rawCur,
            in_point_ms: rawCur.in_point_ms || 0,
            out_point_ms: rawCur.out_point_ms || 0,
            duration_ms: rawCur.duration_ms || raw.clip_duration_ms || 0,
            event_type: rawCur.event_type || 'VIDEO',
            timing_mode: rawCur.timing_mode || 'AUTO_FOLLOW'
          } : null;

          const rawNext = raw.playlist?.next_item;
          const nextItem = rawNext ? {
            ...rawNext,
            in_point_ms: rawNext.in_point_ms || 0,
            out_point_ms: rawNext.out_point_ms || 0,
            duration_ms: rawNext.duration_ms || 0,
            event_type: rawNext.event_type || 'VIDEO',
            timing_mode: rawNext.timing_mode || 'AUTO_FOLLOW'
          } : null;

          const totalItems = raw.playlist?.items?.length ?? (raw.playlist?.total_items ?? (currentItem ? 1 : 0));
          const hasNextItem = Boolean(nextItem);

          setPlayoutState({
            state: raw.playout_state || 'IDLE',
            currentIndex: raw.playlist?.current_index ?? -1,
            currentItem,
            nextItem,
            hasNextItem,
            totalItems,
            elapsedMs: raw.clip_elapsed_ms ?? 0,
            effectiveDurationMs: raw.clip_duration_ms ?? 0,
            loopPlaylist: raw.playlist?.loop_enabled ?? false,
            engine: {
              activeProfile: raw.active_profile,
              framesCompleted: raw.frames_completed,
              framesDropped: raw.frames_dropped,
              videoUnderruns: raw.video_underruns,
              audioUnderruns: raw.audio_underruns
            },
            decklink: {
              devices: raw.devices || [],
              driverInstalled: raw.driver_installed,
              activeProfile: raw.active_profile,
              currentStandard: raw.current_standard
            },
            audio: {
              vuLeft: raw.vu_left_dbfs,
              vuRight: raw.vu_right_dbfs,
              appliedGainDb: raw.applied_gain_db
            }
          } as any);
        }
      }).then((fn) => {
        unlistenFn = fn;
        setIsConnected(true);
      }).catch((err) => {
        console.warn('[usePlayoutSocket] Error al registrar listener nativo de Tauri:', err);
      });
    }).catch(() => {});

    return () => {
      if (unlistenFn) unlistenFn();
    };
  }, []);

  return { playoutState, isConnected };
}
