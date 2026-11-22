import React, { useState, useRef, useEffect } from 'react';
import { PlaylistItem } from '../../types/playout';
import { api } from '../../services/api';
import {
  Scissors,
  Play,
  Pause,
  RotateCcw,
  Check,
  X,
  Volume2,
  VolumeX,
  ChevronLeft,
  ChevronRight,
  Clock,
  Film
} from 'lucide-react';

interface TrimModalProps {
  item: PlaylistItem | any | null;
  isOpen: boolean;
  onClose: () => void;
  onSaveTrim: (itemId: any, newDurationMs: number, inPointMs: number, outPointMs: number) => Promise<void> | void;
}

export const TrimModal: React.FC<TrimModalProps> = ({ item, isOpen, onClose, onSaveTrim }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [currentTimeSec, setCurrentTimeSec] = useState(0);
  const [fileDurationSec, setFileDurationSec] = useState(0);

  const [inPointSec, setInPointSec] = useState(0);
  const [outPointSec, setOutPointSec] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [previewingTrim, setPreviewingTrim] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Inicializar puntos In/Out según el ítem seleccionado
  useEffect(() => {
    if (!item) return;

    const initialInSec = (item.in_point_ms || 0) / 1000;
    const itemDurSec = (item.duration_ms || 30000) / 1000;
    const initialOutSec = item.out_point_ms ? item.out_point_ms / 1000 : initialInSec + itemDurSec;

    setInPointSec(initialInSec);
    setOutPointSec(initialOutSec);
    setCurrentTimeSec(initialInSec);
    setErrorMessage(null);

    // Sondear duración total del archivo si es posible
    api.probeMedia(item.file_path)
      .then((data: any) => {
        if (data.durationSec && data.durationSec > 0) {
          setFileDurationSec(data.durationSec);
          if (!item.out_point_ms || initialOutSec > data.durationSec) {
            setOutPointSec(data.durationSec);
          }
        } else {
          setFileDurationSec(initialOutSec);
        }
      })
      .catch(() => {
        setFileDurationSec(initialOutSec);
      });
  }, [item?.id, isOpen]);

  if (!isOpen || !item) return null;

  const formatTC = (seconds: number) => {
    if (isNaN(seconds) || seconds < 0) seconds = 0;
    const totalMs = Math.round(seconds * 1000);
    const h = Math.floor(totalMs / 3600000);
    const m = Math.floor((totalMs % 3600000) / 60000);
    const s = Math.floor((totalMs % 60000) / 1000);
    const f = Math.floor(((totalMs % 1000) / 1000) * 30);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(h)}:${pad(m)}:${pad(s)};${pad(f)}`;
  };

  const handleLoadedMetadata = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.duration && !isNaN(video.duration) && video.duration > 0) {
      setFileDurationSec(video.duration);
      if (outPointSec <= 0 || outPointSec > video.duration) {
        setOutPointSec(video.duration);
      }
    }
    video.currentTime = inPointSec;
  };

  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video) return;
    setCurrentTimeSec(video.currentTime);

    // Si estamos en previsualización de tramo y llegamos al OUT, pausar
    if (previewingTrim && video.currentTime >= outPointSec) {
      video.pause();
      setIsPlaying(false);
      setPreviewingTrim(false);
    }
  };

  const handlePlayPause = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().catch(() => { });
      setIsPlaying(true);
    } else {
      video.pause();
      setIsPlaying(false);
      setPreviewingTrim(false);
    }
  };

  const handleStep = (deltaSec: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.pause();
    setIsPlaying(false);
    setPreviewingTrim(false);
    const newTime = Math.max(0, Math.min(fileDurationSec || 99999, video.currentTime + deltaSec));
    video.currentTime = newTime;
    setCurrentTimeSec(newTime);
  };

  const handleSetInHere = () => {
    const current = Math.max(0, currentTimeSec);
    if (current >= outPointSec) {
      setErrorMessage('El punto IN debe ser anterior al punto OUT');
      return;
    }
    setErrorMessage(null);
    setInPointSec(current);
  };

  const handleSetOutHere = () => {
    const current = currentTimeSec;
    if (current <= inPointSec) {
      setErrorMessage('El punto OUT debe ser posterior al punto IN');
      return;
    }
    setErrorMessage(null);
    setOutPointSec(current);
  };

  const handleGoToIn = () => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = inPointSec;
    setCurrentTimeSec(inPointSec);
  };

  const handleGoToOut = () => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = outPointSec;
    setCurrentTimeSec(outPointSec);
  };

  const handlePlaySegment = () => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = inPointSec;
    setCurrentTimeSec(inPointSec);
    setPreviewingTrim(true);
    video.play().catch(() => { });
    setIsPlaying(true);
  };

  const handleResetToFull = () => {
    setInPointSec(0);
    const full = fileDurationSec > 0 ? fileDurationSec : (item.duration_ms || 30000) / 1000;
    setOutPointSec(full);
    const video = videoRef.current;
    if (video) video.currentTime = 0;
    setCurrentTimeSec(0);
    setErrorMessage(null);
  };

  const effectiveDurationSec = Math.max(0, outPointSec - inPointSec);
  const effectiveDurationMs = Math.round(effectiveDurationSec * 1000);

  const handleSave = async () => {
    if (effectiveDurationMs <= 500) {
      setErrorMessage('La duración recortada es demasiado corta (mínimo 1 segundo)');
      return;
    }
    try {
      setIsSaving(true);
      await onSaveTrim(
        item.id,
        effectiveDurationMs,
        Math.round(inPointSec * 1000),
        Math.round(outPointSec * 1000)
      );
      onClose();
    } catch (e: any) {
      setErrorMessage(`Error al guardar recorte: ${e.message || e}`);
    } finally {
      setIsSaving(false);
    }
  };

  const streamUrl = `/api/media/stream?path=${encodeURIComponent(item.file_path)}`;

  // Posiciones porcentuales para la barra de recorte
  const totalBarSec = Math.max(fileDurationSec, outPointSec, 1);
  const inPercent = Math.min(100, Math.max(0, (inPointSec / totalBarSec) * 100));
  const outPercent = Math.min(100, Math.max(0, (outPointSec / totalBarSec) * 100));
  const currentPercent = Math.min(100, Math.max(0, (currentTimeSec / totalBarSec) * 100));

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      style={{
        zIndex: 1050,
        backgroundColor: 'rgba(0, 0, 0, 0.72)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16
      }}
    >
      <div
        className="m3-dialog-card"
        style={{
          width: 840,
          maxWidth: '96vw',
          maxHeight: '92vh',
          borderRadius: 24
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Material Design 3 */}
        <div className="m3-dialog-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              background: 'var(--color-accent-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-primary)',
              flexShrink: 0
            }}>
              <Scissors size={20} />
            </div>
            <div>
              <h2 className="m3-headline-small" style={{ fontSize: 15, fontWeight: 600 }}>
                Recortador de Video Broadcast (Trim IN / OUT)
              </h2>
              <p style={{ margin: '2px 0 0 0', fontSize: 11.5, color: 'var(--color-text-muted)' }}>
                {item.title} • Ajuste no destructivo al aire
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="m3-icon-button"
            title="Cerrar ventana"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: '20px 24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {errorMessage && (
            <div
              style={{
                padding: '8px 12px',
                backgroundColor: 'rgba(255, 69, 58, 0.15)',
                border: '1px solid rgba(255, 69, 58, 0.4)',
                borderRadius: 6,
                color: '#ff453a',
                fontSize: 12,
                fontWeight: 500
              }}
            >
              {errorMessage}
            </div>
          )}

          {/* Video Player */}
          <div
            style={{
              position: 'relative',
              width: '100%',
              aspectRatio: '16 / 9',
              backgroundColor: '#000',
              borderRadius: 8,
              overflow: 'hidden',
              maxHeight: 330,
              margin: '0 auto',
              border: '1px solid var(--border-subtle)'
            }}
          >
            <video
              ref={videoRef}
              src={streamUrl}
              playsInline
              muted={isMuted}
              onLoadedMetadata={handleLoadedMetadata}
              onTimeUpdate={handleTimeUpdate}
              onEnded={() => {
                setIsPlaying(false);
                setPreviewingTrim(false);
              }}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                objectFit: 'contain'
              }}
            />

            {/* Timecode Overlay */}
            <div
              style={{
                position: 'absolute',
                top: 10,
                left: 12,
                backgroundColor: 'rgba(0, 0, 0, 0.75)',
                padding: '3px 8px',
                borderRadius: 4,
                fontFamily: 'var(--font-mono)',
                fontSize: 13,
                fontWeight: 700,
                color: '#00d2ff',
                letterSpacing: 0.5,
                border: '1px solid rgba(255, 255, 255, 0.1)'
              }}
            >
              {formatTC(currentTimeSec)}
            </div>

            {/* Audio Toggle */}
            <button
              onClick={() => setIsMuted(!isMuted)}
              style={{
                position: 'absolute',
                top: 10,
                right: 12,
                backgroundColor: 'rgba(0, 0, 0, 0.75)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: 4,
                padding: '4px 6px',
                color: isMuted ? 'var(--apple-red)' : 'var(--apple-green)',
                cursor: 'pointer'
              }}
              title={isMuted ? 'Activar audio' : 'Silenciar'}
            >
              {isMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
            </button>
          </div>

          {/* Visual Trimmer Timeline Bar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div
              style={{
                position: 'relative',
                height: 28,
                backgroundColor: 'var(--color-field)',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--color-hairline)',
                overflow: 'hidden',
                cursor: 'pointer'
              }}
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const clickPos = (e.clientX - rect.left) / rect.width;
                const newTime = clickPos * totalBarSec;
                if (videoRef.current) {
                  videoRef.current.currentTime = newTime;
                  setCurrentTimeSec(newTime);
                }
              }}
            >
              {/* Active Trimmed Segment Highlight */}
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  bottom: 0,
                  left: `${inPercent}%`,
                  width: `${Math.max(0, outPercent - inPercent)}%`,
                  backgroundColor: 'rgba(10, 132, 255, 0.35)',
                  borderLeft: '2px solid var(--apple-cyan)',
                  borderRight: '2px solid var(--apple-cyan)'
                }}
              />

              {/* Current Playhead Needle */}
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  bottom: 0,
                  left: `${currentPercent}%`,
                  width: 2,
                  backgroundColor: '#ff453a',
                  boxShadow: '0 0 6px rgba(255, 69, 58, 0.9)',
                  zIndex: 10
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
              <span>00:00:00;00</span>
              <span style={{ color: 'var(--text-secondary)' }}>Posición: {formatTC(currentTimeSec)}</span>
              <span>{formatTC(fileDurationSec)}</span>
            </div>
          </div>

          {/* Transport Player Controls */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              padding: '6px 0'
            }}
          >
            <button
              className="btn-tool"
              onClick={() => handleStep(-1)}
              title="Retroceder 1 segundo"
              style={{ padding: '6px 10px', fontSize: 12 }}
            >
              <ChevronLeft size={14} /> -1s
            </button>
            <button
              className="btn-tool"
              onClick={() => handleStep(-1 / 30)}
              title="Retroceder 1 cuadro (Frame)"
              style={{ padding: '6px 8px', fontSize: 12 }}
            >
              -1 Fr
            </button>
            <button
              className="btn-tool primary"
              onClick={handlePlayPause}
              style={{ padding: '7px 18px', fontSize: 13, gap: 6 }}
            >
              {isPlaying ? <Pause size={15} /> : <Play size={15} />}
              <span>{isPlaying ? 'Pausa' : 'Reproducir'}</span>
            </button>
            <button
              className="btn-tool"
              onClick={() => handleStep(1 / 30)}
              title="Avanzar 1 cuadro (Frame)"
              style={{ padding: '6px 8px', fontSize: 12 }}
            >
              +1 Fr
            </button>
            <button
              className="btn-tool"
              onClick={() => handleStep(1)}
              title="Avanzar 1 segundo"
              style={{ padding: '6px 10px', fontSize: 12 }}
            >
              +1s <ChevronRight size={14} />
            </button>
          </div>

          {/* Puntos IN y OUT - Controles Directos */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 12,
              padding: 14,
              backgroundColor: 'var(--color-canvas)',
              borderRadius: 14,
              border: '1px solid var(--color-hairline)'
            }}
          >
            {/* IN POINT */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: 0.4 }}>
                  Punto de Entrada [IN]
                </span>
                <span style={{ fontFamily: 'var(--font-family-mono)', fontSize: 14, fontWeight: 700, color: 'var(--color-ink)' }}>
                  {formatTC(inPointSec)}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  className="m3-btn-tonal"
                  onClick={handleSetInHere}
                  style={{ flex: 1, height: 32, fontSize: 11.5, color: 'var(--color-primary)', background: 'var(--color-accent-subtle)' }}
                  title="Establecer punto IN en el tiempo actual del video"
                >
                  <Clock size={12} />
                  <span>Fijar IN Aquí</span>
                </button>
                <button
                  className="m3-btn-tonal"
                  onClick={handleGoToIn}
                  title="Ir al punto IN"
                  style={{ height: 32, padding: '0 12px', fontSize: 11.5 }}
                >
                  Ir a IN
                </button>
              </div>
            </div>

            {/* OUT POINT */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--color-warning)', textTransform: 'uppercase', letterSpacing: 0.4 }}>
                  Punto de Salida [OUT]
                </span>
                <span style={{ fontFamily: 'var(--font-family-mono)', fontSize: 14, fontWeight: 700, color: 'var(--color-ink)' }}>
                  {formatTC(outPointSec)}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  className="m3-btn-tonal"
                  onClick={handleSetOutHere}
                  style={{ flex: 1, height: 32, fontSize: 11.5, color: 'var(--color-warning)', background: 'var(--color-warning-subtle)' }}
                  title="Establecer punto OUT en el tiempo actual del video"
                >
                  <Clock size={12} />
                  <span>Fijar OUT Aquí</span>
                </button>
                <button
                  className="m3-btn-tonal"
                  onClick={handleGoToOut}
                  title="Ir al punto OUT"
                  style={{ height: 32, padding: '0 12px', fontSize: 11.5 }}
                >
                  Ir a OUT
                </button>
              </div>
            </div>
          </div>

          {/* Calculation Summary Card */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 16px',
              backgroundColor: 'var(--color-canvas)',
              borderRadius: 14,
              border: '1px solid var(--color-hairline)'
            }}
          >
            <div style={{ display: 'flex', gap: 20 }}>
              <div>
                <div style={{ fontSize: 10, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: 0.3 }}>
                  Duración Archivo Original
                </div>
                <div style={{ fontFamily: 'var(--font-family-mono)', fontSize: 12.5, color: 'var(--color-text-muted)', marginTop: 2 }}>
                  {formatTC(fileDurationSec)}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 10, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: 0.3 }}>
                  Nueva Duración en Emisión
                </div>
                <div style={{ fontFamily: 'var(--font-family-mono)', fontSize: 14, fontWeight: 600, color: 'var(--color-success)', marginTop: 2 }}>
                  {formatTC(effectiveDurationSec)}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button
                className="m3-btn-tonal"
                onClick={handlePlaySegment}
                title="Reproducir únicamente el tramo recortado desde IN hasta OUT"
                style={{ height: 32, fontSize: 11.5, color: 'var(--color-primary)' }}
              >
                <Film size={12} />
                <span>Probar Tramo (IN ➔ OUT)</span>
              </button>
              <button
                className="m3-btn-tonal"
                onClick={handleResetToFull}
                title="Restablecer video a duración completa"
                style={{ height: 32, fontSize: 11.5 }}
              >
                <RotateCcw size={12} />
                <span>Restablecer</span>
              </button>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="m3-dialog-footer" style={{ justifyContent: 'space-between' }}>
          <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
            Los tiempos de inicio y fin de toda la lista de emisión se recalcularán automáticamente.
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="m3-btn-text" onClick={onClose} disabled={isSaving}>
              Cancelar
            </button>
            <button
              className="m3-btn-filled"
              onClick={handleSave}
              disabled={isSaving}
              style={{ height: 38, fontSize: 12.5 }}
            >
              <Check size={14} />
              <span>{isSaving ? 'Guardando...' : 'Aplicar Recorte al Playlist'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

