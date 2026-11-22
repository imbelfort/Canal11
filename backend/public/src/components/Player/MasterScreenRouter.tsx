import React, { useRef, useEffect, useState } from 'react';
import { PlayoutBroadcastState } from '../../types/playout';
import { FileVideoPlayer } from './FileVideoPlayer';
import { NdiPreviewPlayer } from '../Ndi/NdiPreviewPlayer';
import { DeckLinkPreviewPlayer } from '../DeckLink/DeckLinkPreviewPlayer';
import { GraphicsOverlay } from '../Graphics/GraphicsOverlay';

export interface MasterScreenRouterProps {
  playoutState: PlayoutBroadcastState | null;
  isMuted?: boolean;
  volume?: number;
  onToggleMute?: () => void;
  onOpenAudioModal?: () => void;
  onAudioLevelsChange?: (left: number, right: number) => void;
  leftLevel?: number;
  rightLevel?: number;
}

/**
 * MasterScreenRouter - Conmutador y enrutador visual de pantalla (Slice Vertical).
 *
 * Responsabilidad Única:
 * - Determinar de manera mutuamente excluyente qué fuente de video corresponde mostrar.
 * - Desacopla por completo la decodificación de archivos locales de las señales NDI y SDI.
 * - Superpone la capa maestra de gráficos al aire (CG: logo, reloj, clima, ticker) con z-index controlado.
 */
export const MasterScreenRouter: React.FC<MasterScreenRouterProps> = ({
  playoutState,
  isMuted,
  volume = 1.0,
  onToggleMute,
  onOpenAudioModal,
  onAudioLevelsChange,
  leftLevel: propLeft = 0,
  rightLevel: propRight = 0
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [videoError, setVideoError] = useState(false);
  const [fileAudioLevels, setFileAudioLevels] = useState<{ left: number; right: number }>({ left: 0, right: 0 });

  const state = playoutState?.state || 'IDLE';
  const currentItem = playoutState?.currentItem;
  const emergencyMedia = playoutState?.emergencyMedia;
  const profile = playoutState?.engine?.activeProfile || playoutState?.decklink?.activeProfile || playoutState?.broadcastStandard?.profile || '--';
  const isEmergencyVideo = state === 'EMERGENCY_FALLBACK' && emergencyMedia?.mode === 'FILE' && Boolean(emergencyMedia.file_path);

  // 1. Discriminación estricta y mutuamente excluyente de tipos de fuentes
  // Basada primordialmente en event_type según el esquema broadcast de base de datos
  const isNdiItem = currentItem?.event_type === 'LIVE_NDI';
  const isSdiItem = currentItem?.event_type === 'LIVE_SDI';

  const isLiveNdi = (state as string) === 'LIVE_NDI' || (state !== 'IDLE' && isNdiItem);
  const isLiveSdi = !isLiveNdi && (state === 'LIVE_SDI' || (state !== 'IDLE' && isSdiItem));

  const isMediaFile = Boolean(
    currentItem &&
    !isNdiItem &&
    !isSdiItem &&
    currentItem.event_type !== 'LIVE_SDI' &&
    currentItem.event_type !== 'LIVE_NDI' &&
    currentItem.event_type !== 'GRAPHIC'
  );

  // Niveles VU reales: Si es archivo multimedia, usa la medición real de Web Audio de FileVideoPlayer;
  // Si está en pausa o IDLE o el archivo no tiene audio, los niveles serán 0
  const activeLeft = isMediaFile ? (state === 'PLAYING' ? fileAudioLevels.left : 0) : (state === 'LIVE_SDI' || (state as string) === 'LIVE_NDI' ? propLeft : 0);
  const activeRight = isMediaFile ? (state === 'PLAYING' ? fileAudioLevels.right : 0) : (state === 'LIVE_SDI' || (state as string) === 'LIVE_NDI' ? propRight : 0);

  // Reiniciar estado de error al cambiar de elemento o estado de emisión
  useEffect(() => {
    setVideoError(false);
  }, [currentItem?.id, currentItem?.file_path, state, emergencyMedia?.file_path]);

  // Renderizado dinámico de patrones de prueba y reposo (SMPTE, Emergencia, Standby)
  useEffect(() => {
    let animId: number | null = null;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = 640;
    canvas.height = 360;

    const render = () => {
      if (state === 'EMERGENCY_FALLBACK' && !isEmergencyVideo) {
        // Barras de color SMPTE oficiales de emergencia
        const colors = ['#c0c0c0', '#c0c000', '#00c0c0', '#00c000', '#c000c0', '#c00000', '#0000c0'];
        const barWidth = canvas.width / colors.length;
        colors.forEach((col, idx) => {
          ctx.fillStyle = col;
          ctx.fillRect(idx * barWidth, 0, barWidth, canvas.height * 0.7);
        });

        ctx.fillStyle = '#111';
        ctx.fillRect(0, canvas.height * 0.7, canvas.width, canvas.height * 0.3);

        ctx.fillStyle = '#ff453a';
        ctx.fillRect(0, canvas.height * 0.4, canvas.width, 50);

        ctx.fillStyle = '#fff';
        ctx.font = 'bold 16px -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('IB-CAST - CORTINILLA DE RESPALDO', canvas.width / 2, canvas.height * 0.4 + 32);
      } else if (isMediaFile && videoError) {
        // Mensaje explícito en caso de archivo inaccesible
        ctx.fillStyle = '#0a0d14';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = '#ff453a';
        ctx.font = '600 15px -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('ERROR DE DECODIFICACIÓN O ARCHIVO NO DISPONIBLE', canvas.width / 2, canvas.height / 2 - 10);

        ctx.fillStyle = '#8e918f';
        ctx.font = '12px monospace';
        ctx.fillText(currentItem?.title || '', canvas.width / 2, canvas.height / 2 + 15);
      } else if (!isMediaFile && !isLiveSdi && !isLiveNdi && !isEmergencyVideo) {
        // Modo reposo / Sin emisión
        ctx.fillStyle = '#080a10';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
        ctx.lineWidth = 1;
        for (let y = 0; y < canvas.height; y += 6) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(canvas.width, y);
          ctx.stroke();
        }

        ctx.fillStyle = '#1a1f2c';
        ctx.fillRect(canvas.width / 2 - 140, canvas.height / 2 - 40, 280, 80);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.strokeRect(canvas.width / 2 - 140, canvas.height / 2 - 40, 280, 80);

        ctx.fillStyle = '#8e918f';
        ctx.font = '600 14px -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('SISTEMA EN ESPERA', canvas.width / 2, canvas.height / 2 - 8);

        ctx.fillStyle = '#5e6260';
        ctx.font = '11px monospace';
        ctx.fillText('Presione Iniciar para comenzar emisión', canvas.width / 2, canvas.height / 2 + 16);
      }
    };

    render();
    return () => {
      if (animId !== null) cancelAnimationFrame(animId);
    };
  }, [state, isEmergencyVideo, isMediaFile, isLiveSdi, isLiveNdi, videoError, currentItem?.title, profile]);

  return (
    <div className="screen-container">
      {/* 1. SEÑAL NDI EN VIVO (Red IP LAN) */}
      {isLiveNdi ? (
        <NdiPreviewPlayer
          sourceQuery={currentItem?.file_path || currentItem?.title || ''}
          sourceName={currentItem?.title}
          height="100%"
          showOverlay={false}
          style={{ border: 'none', borderRadius: 0, width: '100%', height: '100%' }}
        />
      ) : isLiveSdi ? (
        /* 2. SEÑAL SDI EN VIVO (Blackmagic DeckLink) */
        <DeckLinkPreviewPlayer
          inputId={currentItem?.file_path || ''}
          inputName={currentItem?.title || playoutState?.decklink?.deviceName || 'Blackmagic SDI In'}
          format={profile}
          height="100%"
          showOverlay={false}
          style={{ border: 'none', borderRadius: 0, width: '100%', height: '100%' }}
        />
      ) : isEmergencyVideo && emergencyMedia?.file_path ? (
        /* 3. RESPALDO POR ARCHIVO DE VIDEO DE EMERGENCIA */
        <FileVideoPlayer
          filePath={emergencyMedia.file_path}
          isPlaying={true}
          isPaused={false}
          isMuted={isMuted}
          volume={volume}
          onError={() => setVideoError(true)}
        />
      ) : isMediaFile && currentItem?.file_path && !videoError ? (
        /* 4. ARCHIVO MULTIMEDIA DE ESCALETA (Video / Comercial) */
        <FileVideoPlayer
          filePath={currentItem.file_path}
          inPointMs={currentItem.in_point_ms}
          durationMs={currentItem.duration_ms}
          elapsedMs={playoutState?.elapsedMs || 0}
          isPlaying={state === 'PLAYING'}
          isPaused={state === 'PAUSED'}
          isMuted={isMuted}
          volume={volume}
          onError={() => setVideoError(true)}
          onAudioLevels={(left, right) => {
            setFileAudioLevels({ left, right });
            if (onAudioLevelsChange) {
              onAudioLevelsChange(left, right);
            }
          }}
        />
      ) : (
        /* 5. PATRÓN TÉCNICO / STANDBY CANVAS */
        <canvas
          ref={canvasRef}
          className="video-screen"
          style={{ display: 'block' }}
        />
      )}

      {/* 6. CAPA MAESTRA DE GRÁFICOS AL AIRE (CG / Reloj / Mosca / Clima / Ticker) */}
      <GraphicsOverlay
        graphics={playoutState?.graphics}
        stationTimecode={playoutState?.timecodes?.stationMaster}
        isPaused={state === 'PAUSED'}
      />

      {/* 7. BARRAS VU METER MASTER (Medición Real de Audio con Calibración EBU R128) */}
      <div
        className="vu-meter-bar interactive-vu"
        onClick={onOpenAudioModal}
        style={{ cursor: onOpenAudioModal ? 'pointer' : undefined }}
        title={`Vúmetro Master PGM (Salida Estéreo 48 kHz)\nNorma Activa: ${playoutState?.masterAudio?.standard || 'EBU R128 (-23 LUFS)'}\nGanancia Master: ${playoutState?.masterAudio?.volumeDb !== undefined ? (playoutState.masterAudio.volumeDb > 0 ? `+${playoutState.masterAudio.volumeDb}` : `${playoutState.masterAudio.volumeDb}`) : '0.0'} dB\nLínea de referencia: -23 LUFS / -18 dBFS nominal\nHaga clic para abrir el Procesador Master de Audio y Salida`}
      >
        <div className="vu-target-line" title="Nivel Nominal Broadcast (-23 LUFS / -18 dBFS)" />
        <div className="vu-channel">
          <div className="vu-level" style={{ height: `${activeLeft}%` }}></div>
          <span className="vu-ch-label">L</span>
        </div>
        <div className="vu-channel">
          <div className="vu-level" style={{ height: `${activeRight}%` }}></div>
          <span className="vu-ch-label">R</span>
        </div>
      </div>
    </div>
  );
};

