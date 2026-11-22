import React, { useRef, useEffect, useState } from 'react';
import { PlayoutBroadcastState } from '../../types/playout';
import { FileVideoPlayer } from './FileVideoPlayer';
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
 * MasterScreenRouter - Reproductor Maestro Web Puro
 * Enfocado exclusivamente en decodificación de archivos de video para entorno web.
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
  const isEmergencyVideo = state === 'EMERGENCY_FALLBACK' && emergencyMedia?.mode === 'FILE' && Boolean(emergencyMedia.file_path);

  // Todo elemento es tratado como reproducción de video digital en web
  const isMediaFile = state === 'PLAYING' || state === 'PAUSED';

  useEffect(() => {
    setVideoError(false);
  }, [currentItem?.file_path]);

  // Patrón de prueba en Canvas cuando no hay video activo
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number | null = null;
    canvas.width = 1920;
    canvas.height = 1080;

    const render = () => {
      if (videoError) {
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#ef4444';
        ctx.font = '700 24px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('ARCHIVO NO DISPONIBLE O ERROR DE DECODIFICACION', canvas.width / 2, canvas.height / 2 - 10);
        ctx.fillStyle = '#94a3b8';
        ctx.font = '16px monospace';
        ctx.fillText(currentItem?.title || 'Clip de video', canvas.width / 2, canvas.height / 2 + 25);
      } else if (!isMediaFile && !isEmergencyVideo) {
        ctx.fillStyle = '#090d16';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = '#1e293b';
        ctx.fillRect(canvas.width / 2 - 200, canvas.height / 2 - 60, 400, 120);
        ctx.strokeStyle = '#334155';
        ctx.strokeRect(canvas.width / 2 - 200, canvas.height / 2 - 60, 400, 120);

        ctx.fillStyle = '#38bdf8';
        ctx.font = '700 20px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('CANAL 11 • EMISION EN ESPERA', canvas.width / 2, canvas.height / 2 - 12);

        ctx.fillStyle = '#94a3b8';
        ctx.font = '14px system-ui, sans-serif';
        ctx.fillText('Presione Iniciar para emitir video en vivo', canvas.width / 2, canvas.height / 2 + 24);
      }
    };

    render();
    return () => {
      if (animId !== null) cancelAnimationFrame(animId);
    };
  }, [state, isEmergencyVideo, isMediaFile, videoError, currentItem?.title]);

  return (
    <div className="screen-container">
      {isEmergencyVideo && emergencyMedia?.file_path ? (
        <FileVideoPlayer
          filePath={emergencyMedia.file_path}
          isPlaying={true}
          isPaused={false}
          isMuted={isMuted}
          volume={volume}
          onError={() => setVideoError(true)}
        />
      ) : isMediaFile && currentItem?.file_path && !videoError ? (
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
        <canvas
          ref={canvasRef}
          className="video-screen"
          style={{ display: 'block', width: '100%', height: '100%' }}
        />
      )}

      {/* Capa de Gráficos Superpuestos CG */}
      <GraphicsOverlay />
    </div>
  );
};
