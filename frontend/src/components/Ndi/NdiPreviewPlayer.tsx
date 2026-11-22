import React, { useState, useEffect, useRef, useCallback } from 'react';
import { RefreshCw, VideoOff, Radio, Eye } from 'lucide-react';
import { resolveUrl } from '../../services/api/client';

interface NdiPreviewPlayerProps {
  sourceQuery?: string;
  sourceName?: string;
  sourceMachine?: string;
  sourceIp?: string;
  sourcePort?: number;
  format?: string;
  height?: number | string;
  showOverlay?: boolean;
  style?: React.CSSProperties;
  preferSnapshot?: boolean;
  onRefresh?: () => void;
}

export const NdiPreviewPlayer: React.FC<NdiPreviewPlayerProps> = ({
  sourceQuery,
  sourceName,
  sourceMachine,
  sourceIp,
  sourcePort,
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
  const [snapshotTimestamp, setSnapshotTimestamp] = useState(Date.now());
  const snapshotTimerRef = useRef<any>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  const rawQuery = (sourceQuery || sourceIp || sourceName || '').trim();
  const queryParam = encodeURIComponent(rawQuery);

  const streamUrl = resolveUrl(`/api/ndi/preview-stream${queryParam ? `?source=${queryParam}&` : '?'}_k=${refreshKey}`);
  const snapshotUrl = resolveUrl(`/api/ndi/preview-frame${queryParam ? `?source=${queryParam}&` : '?'}_t=${snapshotTimestamp}`);

  // Sincronizar URL inicial según modo
  useEffect(() => {
    if (mode === 'stream') {
      setActiveSrc(streamUrl);
    } else if (mode === 'snapshot') {
      setActiveSrc(snapshotUrl);
    }
  }, [mode, streamUrl, snapshotUrl]);

  // Limpieza estricta de conexiones HTTP en Chromium: al desmontar, forzar cancelación con data URI transparente
  useEffect(() => {
    return () => {
      if (imgRef.current) {
        imgRef.current.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
        imgRef.current.removeAttribute('src');
      }
    };
  }, []);

  // Reiniciar estados al cambiar de fuente
  useEffect(() => {
    setIsLoaded(false);
    setMode(preferSnapshot ? 'snapshot' : 'stream');
    setRefreshKey(Date.now());
    if (snapshotTimerRef.current) {
      clearInterval(snapshotTimerRef.current);
      snapshotTimerRef.current = null;
    }
  }, [rawQuery, preferSnapshot]);

  // En Chromium/Electron, los flujos multipart/x-mixed-replace pueden no emitir el evento
  // onload del DOM porque la conexión HTTP continúa permanentemente abierta.
  // Este temporizador de cortesía garantiza que el overlay de carga se retire revelando la señal.
  useEffect(() => {
    if (mode === 'stream') {
      const timer = setTimeout(() => {
        setIsLoaded(true);
      }, 700);
      return () => clearTimeout(timer);
    }
  }, [mode, refreshKey]);

  // Si estamos en modo snapshot, precargar fotograma en memoria (Double Buffering)
  // para eliminar el parpadeo en negro/blanco al actualizar la imagen
  useEffect(() => {
    if (mode === 'snapshot') {
      snapshotTimerRef.current = setInterval(() => {
        const t = Date.now();
        const nextUrl = resolveUrl(`/api/ndi/preview-frame${queryParam ? `?source=${queryParam}&` : '?'}_t=${t}`);
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
  }, [mode, rawQuery, queryParam]);

  const handleManualRefresh = useCallback((e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setIsLoaded(false);
    setMode('stream');
    setRefreshKey(Date.now());
    setSnapshotTimestamp(Date.now());
    if (onRefresh) onRefresh();
  }, [onRefresh]);

  // Si el stream multipart continuo falla, caer a instantánea estática
  const handleStreamError = useCallback(() => {
    console.warn('[NDI Preview] Stream MJPEG no disponible o interrumpido, cambiando a modo instantánea...');
    setMode('snapshot');
    setSnapshotTimestamp(Date.now());
  }, []);

  // Si también falla la instantánea estática, marcar como fuera de línea (sin icono roto)
  const handleSnapshotError = useCallback(() => {
    console.warn('[NDI Preview] Fuente NDI sin señal activa temporalmente.');
    setMode('offline');
    setIsLoaded(false);
  }, []);

  const handleImageLoaded = useCallback(() => {
    setIsLoaded(true);
  }, []);

  const displayName = sourceName || sourceQuery || (rawQuery ? rawQuery : 'Señal NDI Master');

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: typeof height === 'number' ? `${height}px` : height,
        backgroundColor: '#07090e',
        border: '1px solid var(--border-subtle)',
        borderRadius: 6,
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        ...style
      }}
    >
      {/* Indicador no bloqueante de conexión NDI */}
      {!isLoaded && mode !== 'offline' && (
        <div
          style={{
            position: 'absolute',
            top: 8,
            left: 8,
            zIndex: 2,
            pointerEvents: 'none'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#38bdf8', fontSize: 10, fontWeight: 500, background: 'rgba(0,0,0,0.7)', padding: '2px 8px', borderRadius: 4 }}>
            <Radio size={12} className="spin-subtle" />
            <span>Conectando NDI: {displayName}</span>
          </div>
        </div>
      )}

      {/* Estado: Señal fuera de línea o no encontrada */}
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
            Señal NDI no disponible en la red
          </div>
          <div style={{ fontSize: 10, color: 'var(--text-secondary)', textAlign: 'center', maxWidth: 360 }}>
            Verifique que el emisor NDI ({displayName}) esté encendido y transmitiendo en la red local.
          </div>
          <button
            type="button"
            className="btn-tool"
            onClick={handleManualRefresh}
            style={{ fontSize: 10, padding: '4px 10px', marginTop: 4, gap: 5 }}
          >
            <RefreshCw size={11} />
            <span>Reintentar Conexión</span>
          </button>
        </div>
      )}

      {/* Elemento de Imagen de Video NDI (Stream o Snapshot con doble buffer anti-parpadeo) */}
      {mode !== 'offline' && activeSrc && (
        <img
          ref={imgRef}
          src={activeSrc}
          alt={`NDI Preview - ${displayName}`}
          onLoad={handleImageLoaded}
          onError={mode === 'stream' ? handleStreamError : handleSnapshotError}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            opacity: 1,
            transition: 'opacity 0.15s ease-in-out',
            display: 'block'
          }}
        />
      )}

      {/* Barra de Superposición con Datos Técnicos y Control */}
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
                fontWeight: 500,
                background: 'rgba(0,0,0,0.78)',
                backdropFilter: 'blur(4px)',
                border: '1px solid var(--border-subtle)',
                padding: '2px 6px',
                borderRadius: 4
              }}
            >
              {displayName}
              {sourceMachine ? ` • ${sourceMachine}` : ''}
              {sourceIp ? ` • ${sourceIp}${sourcePort ? `:${sourcePort}` : ''}` : ''}
              {' • Preview Ligero (5 FPS)'}
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
            title="Refrescar señal NDI"
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

export default NdiPreviewPlayer;

