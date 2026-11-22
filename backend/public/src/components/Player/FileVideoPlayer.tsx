import React, { useEffect, useRef, useState, useCallback } from 'react';
import { isTauriEnv } from '../../services/api/client';
import { convertFileSrc } from '@tauri-apps/api/core';

export interface FileVideoPlayerProps {
  filePath: string;
  inPointMs?: number;
  durationMs?: number;
  elapsedMs?: number;
  isPlaying: boolean;
  isPaused: boolean;
  isMuted?: boolean;
  volume?: number;
  style?: React.CSSProperties;
  onError?: (error: any) => void;
  onEnded?: () => void;
  onAudioLevels?: (left: number, right: number) => void;
}

/**
 * FileVideoPlayer - Slice vertical independiente para decodificación y reproducción de archivos locales.
 *
 * Principio de Aislamiento Vertical:
 * - Gestiona exclusivamente el ciclo de vida del elemento <video> HTML5.
 * - Desacopla la carga física (video.src y video.load) de la sincronización de tiempo.
 * - Medición real de audio por Web Audio API (nivel 0 si el video no tiene audio o está en silencio).
 * - Protección contra cierres prematuros de conexión y errores no fatales de aborto.
 */
export const FileVideoPlayer: React.FC<FileVideoPlayerProps> = ({
  filePath,
  inPointMs = 0,
  durationMs = 30000,
  elapsedMs = 0,
  isPlaying,
  isPaused,
  isMuted = true,
  volume = 1.0,
  style,
  onError,
  onEnded,
  onAudioLevels
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const loadedPathRef = useRef<string | null>(null);
  const [hasDecodeError, setHasDecodeError] = useState(false);
  const isMetadataLoadedRef = useRef<boolean>(false);

  // Web Audio API para medición en tiempo real de niveles VU
  const audioContextRef = useRef<AudioContext | null>(null);
  const splitterRef = useRef<ChannelSplitterNode | null>(null);
  const analyserLRef = useRef<AnalyserNode | null>(null);
  const analyserRRef = useRef<AnalyserNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  const animFrameRef = useRef<number | null>(null);

  const getStreamUrl = useCallback((pathStr: string) => {
    if (!pathStr) return '';
    try {
      return convertFileSrc(pathStr);
    } catch (e) {
      console.error('[FileVideoPlayer] Error al convertir ruta con convertFileSrc:', e);
      return pathStr;
    }
  }, []);

  // Configurar Web Audio API una sola vez cuando el elemento <video> está disponible
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;

      if (!audioContextRef.current) {
        const ctx = new AudioCtx();
        audioContextRef.current = ctx;

        const source = ctx.createMediaElementSource(video);
        sourceNodeRef.current = source;

        const splitter = ctx.createChannelSplitter(2);
        splitterRef.current = splitter;

        const analyserL = ctx.createAnalyser();
        analyserL.fftSize = 64;
        analyserL.smoothingTimeConstant = 0.8;
        analyserLRef.current = analyserL;

        const analyserR = ctx.createAnalyser();
        analyserR.fftSize = 64;
        analyserR.smoothingTimeConstant = 0.8;
        analyserRRef.current = analyserR;

        const gainNode = ctx.createGain();
        gainNode.gain.value = isMuted ? 0 : volume;
        gainNodeRef.current = gainNode;

        source.connect(splitter);
        splitter.connect(analyserL, 0);
        splitter.connect(analyserR, 1 > (source.channelCount || 1) - 1 ? 0 : 1);

        source.connect(gainNode);
        gainNode.connect(ctx.destination);
      }
    } catch (e) {
      // Si el navegador ya enlazó el media element o no soporta Web Audio en esta fuente
      console.debug('[FileVideoPlayer] Web Audio API init bypass:', e);
    }

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  // Actualizar ganancia de audio de previsualización según `isMuted` y `volume` manual
  // MUTE MONITOR PC: Solo se silencia el gainNode que va a ctx.destination (parlantes locales de la PC).
  // El elemento <video> permanece al 100% de volumen para que los AnalyserNodes (Vúmetro PGM Master)
  // sigan recibiendo la señal de audio real transmitida al aire ininterrumpidamente.
  useEffect(() => {
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = isMuted ? 0 : volume;
    }
    if (videoRef.current) {
      // Si el navegador tiene Web Audio inicializado, dejamos el volumen del elemento en 1.0 y nunca lo silenciamos con muted=true
      if (!gainNodeRef.current) {
        videoRef.current.volume = isMuted ? 0 : Math.min(1, Math.max(0, volume));
      } else {
        videoRef.current.volume = 1.0;
        videoRef.current.muted = false;
      }
    }
  }, [isMuted, volume]);

  // Bucle de lectura de niveles VU reales (Solo se anima si hay reproducción real)
  useEffect(() => {
    if (!onAudioLevels) return;

    if (!isPlaying || isPaused || hasDecodeError) {
      onAudioLevels(0, 0);
      return;
    }

    if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume().catch(() => {});
    }

    const analyserL = analyserLRef.current;
    const analyserR = analyserRRef.current;
    if (!analyserL || !analyserR) {
      onAudioLevels(0, 0);
      return;
    }

    const dataL = new Uint8Array(analyserL.frequencyBinCount);
    const dataR = new Uint8Array(analyserR.frequencyBinCount);

    const updateLevels = () => {
      analyserL.getByteFrequencyData(dataL);
      analyserR.getByteFrequencyData(dataR);

      let sumL = 0;
      let sumR = 0;
      let maxL = 0;
      let maxR = 0;
      for (let i = 0; i < dataL.length; i++) {
        sumL += dataL[i];
        if (dataL[i] > maxL) maxL = dataL[i];
        sumR += dataR[i];
        if (dataR[i] > maxR) maxR = dataR[i];
      }

      const avgL = sumL / dataL.length;
      const avgR = sumR / dataR.length;

      // Ponderación broadcast: respuesta balanceada entre RMS y Picos
      const valL = Math.max(avgL * 1.2, maxL * 0.7);
      const valR = Math.max(avgR * 1.2, maxR * 0.7);

      // Si el video no tiene audio o el buffer está vacío, valL y valR serán <= 1
      const leftPct = valL > 1.5 ? Math.min(100, Math.round((valL / 180) * 100)) : 0;
      const rightPct = valR > 1.5 ? Math.min(100, Math.round((valR / 180) * 100)) : 0;

      onAudioLevels(leftPct, rightPct);
      animFrameRef.current = requestAnimationFrame(updateLevels);
    };

    animFrameRef.current = requestAnimationFrame(updateLevels);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlaying, isPaused, hasDecodeError, onAudioLevels]);

  // 1. CARGA FÍSICA: Se ejecuta ÚNICAMENTE cuando la ruta del archivo cambia
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !filePath) return;

    if (loadedPathRef.current !== filePath) {
      loadedPathRef.current = filePath;
      setHasDecodeError(false);
      isMetadataLoadedRef.current = false;

      const streamUrl = getStreamUrl(filePath);
      video.src = streamUrl;
      video.loop = false;
      video.load();

      if (isPlaying) {
        video.play().catch(() => {});
      } else {
        video.pause();
      }
    }
  }, [filePath, isPlaying, getStreamUrl]);

  // Manejador cuando los metadatos del video ya están listos en el navegador
  const handleLoadedMetadata = () => {
    isMetadataLoadedRef.current = true;
    const video = videoRef.current;
    if (!video) return;

    const initialSec = (inPointMs || 0) / 1000 + (elapsedMs || 0) / 1000;
    if (initialSec > 0 && Number.isFinite(initialSec)) {
      try {
        video.currentTime = initialSec;
      } catch {}
    }

    if (isPlaying) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  };

  // 2. SINCRONIZACIÓN TEMPORAL: Sincroniza posición y play/pause sin recargar video.src
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !filePath || hasDecodeError) return;

    if (isPlaying) {
      const inSec = (inPointMs || 0) / 1000;
      const targetSec = inSec + (elapsedMs || 0) / 1000;
      const durationSec = durationMs > 0 ? durationMs / 1000 : 3600;
      const maxSec = inSec + durationSec;

      if (isMetadataLoadedRef.current && !video.seeking) {
        const drift = targetSec - video.currentTime;
        const absDrift = Math.abs(drift);

        // Solo forzar seek si el desfase es significativo (> 2.5s) o si el video se detuvo por error de búfer
        if (absDrift > 2.5 || (video.ended && targetSec < maxSec - 0.5)) {
          try {
            if (targetSec < maxSec - 0.2) {
              video.currentTime = targetSec;
            }
          } catch {}
          video.playbackRate = 1.0;
        } else if (absDrift > 0.3) {
          // Ajuste proporcional suave de velocidad de reproducción (±1% a ±3%)
          // NO se altera video.currentTime directamente para evitar micro-saltos o tirones visuales
          const proportionalDelta = Math.max(-0.03, Math.min(0.03, drift * 0.05));
          video.playbackRate = +(1.0 + proportionalDelta).toFixed(4);
        } else {
          if (video.playbackRate !== 1.0) {
            video.playbackRate = 1.0;
          }
        }
      }

      if (durationMs === 0 || elapsedMs < durationMs) {
        if (video.paused) {
          video.play().catch(() => {});
        }
      } else {
        video.pause();
      }
    } else if (isPaused) {
      if (!video.paused) {
        video.pause();
      }
    } else {
      if (!video.paused) {
        video.pause();
      }
    }
  }, [isPlaying, isPaused, elapsedMs, inPointMs, durationMs, filePath, hasDecodeError]);

  const handleVideoError = (e: React.SyntheticEvent<HTMLVideoElement, Event>) => {
    const video = videoRef.current;
    const err = video?.error;

    // Código 1: MEDIA_ERR_ABORTED - El usuario pausó o interrumpió la carga de red; NO es un fallo de archivo
    if (err && err.code === 1) {
      console.debug(`[FileVideoPlayer] Carga interrumpida normalmente por pausa/seek (${filePath})`);
      return;
    }

    console.warn(`[FileVideoPlayer] Error de decodificación en video (${filePath}):`, err || e);
    setHasDecodeError(true);
    if (onError) onError(e);
  };

  return (
    <video
      ref={videoRef}
      className="video-screen"
      autoPlay={false}
      playsInline
      crossOrigin="anonymous"
      muted={false}
      onPlay={() => {
        if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
          audioContextRef.current.resume().catch(() => {});
        }
      }}
      onLoadedMetadata={handleLoadedMetadata}
      onEnded={(e) => {
        e.currentTarget.pause();
        if (onEnded) onEnded();
      }}
      onError={handleVideoError}
      style={{
        ...style,
        display: hasDecodeError ? 'none' : 'block'
      }}
    />
  );
};

