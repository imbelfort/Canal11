import React, { useState, useEffect, useRef, useCallback } from 'react';
import { RefreshCw, VideoOff, Cpu, Radio } from 'lucide-react';
import { resolveUrl } from '../../services/api/client';

interface DeckLinkPreviewPlayerProps {
  inputId?: string;
  inputName?: string;
  format?: string;
  height?: number | string;
  showOverlay?: boolean;
  style?: React.CSSProperties;
  preferSnapshot?: boolean;
  onRefresh?: () => void;
}

export const DeckLinkPreviewPlayer: React.FC<DeckLinkPreviewPlayerProps> = ({
  inputId,
  inputName,
  format = '1080i59.94',
  height = 240,
  showOverlay = true,
  style,
  preferSnapshot = false,
  onRefresh
}) => {
  const [mode, setMode] = useState<'stream' | 'snapshot' | 'offline'>(preferSnapshot ? 'snapshot' : 'stream');
  const [isLoaded, setIsLoaded] = useState(false);
  const [refreshKey, setRefreshKey] = useState(Date.now());
  const [activeSrc, setActiveSrc] = useState<string>('');
  const [nextSrc, setNextSrc] = useState<string>('');
  const [snapshotTimestamp, setSnapshotTimestamp] = useState(Date.now());
  const snapshotTimerRef = useRef<any>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  const rawInput = (inputId || inputName || '').trim();
  const queryParam = encodeURIComponent(rawInput);

  const streamUrl = resolveUrl(`/api/decklink/preview-stream${queryParam ? `?input=${queryParam}&` : '?'}_k=${refreshKey}`);
  const snapshotUrl = resolveUrl(`/api/decklink/preview-frame${queryParam ? `?input=${queryParam}&` : '?'}_t=${snapshotTimestamp}`);

  // Sincronizar URL inicial y al cambiar modo o query
  useEffect(() => {
    if (mode === 'stream') {
      setActiveSrc(streamUrl);
    } else if (mode === 'snapshot') {
      setActiveSrc(snapshotUrl);
    }
  }, [mode, streamUrl, snapshotUrl]);

  // Limpieza estricta de conexiones HTTP en Chromium: al desmontar, forzar cancelación de conexión con data URI
  useEffect(() => {
    return () => {
      if (imgRef.current) {
        imgRef.current.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
        imgRef.current.removeAttribute('src');
      }
    };
  }, []);

  // Reiniciar estados al cambiar de entrada SDI
  useEffect(() => {
    setIsLoaded(false);
    setMode(preferSnapshot ? 'snapshot' : 'stream');
    setRefreshKey(Date.now());
    if (snapshotTimerRef.current) {
      clearInterval(snapshotTimerRef.current);
      snapshotTimerRef.current = null;
    }
  }, [rawInput, preferSnapshot]);

  // En Chromium/Electron, los flujos multipart/x-mixed-replace mantienen la conexión abierta,
  // por lo que este temporizador de cortesía retira el velo de carga revelando el video en vivo.
  useEffect(() => {
    if (mode === 'stream') {
      const timer = setTimeout(() => {
        setIsLoaded(true);
      }, 700);
      return () => clearTimeout(timer);
    }
  }, [mode, refreshKey]);

  // Si estamos en modo instantánea, precargar fotograma en memoria (Double Buffering)
  // para evitar parpadeos en blanco/negro en pantalla
  useEffect(() => {
    if (mode === 'snapshot') {
      snapshotTimerRef.current = setInterval(() => {
        const t = Date.now();
        const nextUrl = resolveUrl(`/api/decklink/preview-frame${queryParam ? `?input=${queryParam}&` : '?'}_t=${t}`);
        const preloader = new Image();
        preloader.onload = () => {
          setActiveSrc(nextUrl);
          setIsLoaded(true);
        };
        preloader.onerror = () => {
          // Ignorar microcortes transitorios
        };
        preloader.src = nextUrl;
      }, 1200);
    } else if (snapshotTimerRef.current) {
      clearInterval(snapshotTimerRef.current);
      snapshotTimerRef.current = null;
    }
    return () => {
      if (snapshotTimerRef.current) {
        clearInterval(snapshotTimerRef.current);
      }
    };
  }, [mode, rawInput, queryParam]);

  const handleManualRefresh = useCallback((e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setIsLoaded(false);
    setMode('stream');
    setRefreshKey(Date.now());
    setSnapshotTimestamp(Date.now());
    if (onRefresh) onRefresh();
  }, [onRefresh]);

  // Si el stream MJPEG continuo falla, caer a instantánea estática
  const handleStreamError = useCallback(() => {
    console.warn('[DeckLink Preview] Stream MJPEG interrumpido, cambiando a modo instantánea...');
    setMode('snapshot');
    setSnapshotTimestamp(Date.now());
  }, []);

  // Si también falla la instantánea, marcar como fuera de línea
  const handleSnapshotError = useCallback(() => {
    console.warn('[DeckLink Preview] Tarjeta o entrada SDI sin portadora activa temporalmente.');
    setMode('offline');
    setIsLoaded(false);
  }, []);

  const handleImageLoaded = useCallback(() => {
    setIsLoaded(true);
  }, []);

  const displayName = inputName || inputId || (rawInput ? rawInput : 'DeckLink SDI In');

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: typeof height === 'number' ? `${height}px` : height,
        backgroundColor: '#05070a',
        border: '1px solid var(--border-subtle)',
        borderRadius: 6,
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        ...style
      }}
    >
      {/* Estado: Sintonizando señal física SDI */}
      {!isLoaded && mode !== 'offline' && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            backgroundColor: 'var(--color-canvas-soft)',
            zIndex: 2
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--apple-blue)', fontSize: 11, fontWeight: 500 }}>
            <Radio size={14} className="spin-subtle" />
            <span>Sintonizando entrada física SDI: {displayName}</span>
          </div>
          <span style={{ fontSize: 10, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
            Capturando señal DirectShow / Blackmagic Desktop Video...
          </span>
        </div>
      )}

      {/* Estado: Sin señal física o dispositivo desconectado */}
      {mode === 'offline' && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            backgroundColor: 'var(--color-canvas-soft)',
            zIndex: 3,
            padding: 16
          }}
        >
          <VideoOff size={22} color="var(--apple-orange)" />
          <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-primary)' }}>
            Entrada Blackmagic SDI no disponible
          </div>
          <div style={{ fontSize: 10, color: 'var(--text-secondary)', textAlign: 'center', maxWidth: 360 }}>
            Verifique la conexión BNC/SDI en la tarjeta DeckLink o configure el canal en Desktop Video Setup.
          </div>
          <button
            type="button"
            className="btn-tool"
            onClick={handleManualRefresh}
            style={{ fontSize: 10, padding: '4px 10px', marginTop: 4, gap: 5 }}
          >
            <RefreshCw size={11} />
            <span>Reintentar Entrada SDI</span>
          </button>
        </div>
      )}

      {/* Imagen en tiempo real de la señal SDI (Stream MJPEG o Snapshot con doble buffer anti-parpadeo) */}
      {mode !== 'offline' && activeSrc && (
        <img
          ref={imgRef}
          src={activeSrc}
          alt={`DeckLink SDI Preview - ${displayName}`}
          onLoad={handleImageLoaded}
          onError={mode === 'stream' ? handleStreamError : handleSnapshotError}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            opacity: isLoaded ? 1 : 0.2,
            transition: 'opacity 0.15s ease-in-out',
            display: 'block'
          }}
        />
      )}

      {/* Superposición técnica con badges de broadcast */}
      {showOverlay && (
        <div
          style={{
            position: 'absolute',
            bottom: 6,
            left: 8,
            right: 8,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            pointerEvents: 'none',
            zIndex: 4
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span
              className="overlay-badge"
              style={{
                fontSize: 9,
                fontWeight: 600,
                background: 'rgba(0,0,0,0.82)',
                backdropFilter: 'blur(4px)',
                border: '1px solid rgba(255, 69, 58, 0.4)',
                color: '#ff453a',
                padding: '2px 6px',
                borderRadius: 4,
                display: 'flex',
                alignItems: 'center',
                gap: 4
              }}
            >
              <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#ff453a', display: 'inline-block' }} />
              LIVE SDI
            </span>

            <span
              className="overlay-badge"
              style={{
                fontSize: 9,
                fontWeight: 500,
                background: 'rgba(0,0,0,0.78)',
                backdropFilter: 'blur(4px)',
                border: '1px solid var(--border-subtle)',
                padding: '2px 6px',
                borderRadius: 4
              }}
            >
              {displayName} • {format}
            </span>

            {mode === 'snapshot' && isLoaded && (
              <span
                style={{
                  fontSize: 8.5,
                  padding: '1px 5px',
                  borderRadius: 3,
                  backgroundColor: 'rgba(255, 149, 0, 0.2)',
                  color: 'var(--apple-orange)',
                  border: '1px solid rgba(255, 149, 0, 0.4)',
                  fontWeight: 500
                }}
              >
                SNAPSHOT
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={handleManualRefresh}
            className="ide-icon-btn"
            title="Refrescar señal SDI"
            style={{
              pointerEvents: 'auto',
              background: 'rgba(0,0,0,0.72)',
              backdropFilter: 'blur(4px)',
              border: '1px solid var(--border-subtle)',
              padding: '3px 6px',
              borderRadius: 4,
              cursor: 'pointer'
            }}
          >
            <RefreshCw size={11} color="var(--text-secondary)" />
          </button>
        </div>
      )}
    </div>
  );
};

export default DeckLinkPreviewPlayer;

