import React, { useState, useEffect, useRef } from 'react';
import { PlayoutBroadcastState } from '../../types/playout';
import { api } from '../../services/api';
import {
  Sliders,
  Volume2,
  VolumeX,
  Headphones,
  Radio,
  Tv,
  ShieldCheck,
  RotateCcw,
  Check,
  X,
  AlertTriangle
} from 'lucide-react';

interface MasterAudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  playoutState: PlayoutBroadcastState | null;
  // Monitoreo local en cabina (PC del operador)
  monitorMuted: boolean;
  monitorVolume: number;
  onToggleMonitorMute: () => void;
  onMonitorVolumeChange: (vol: number) => void;
  // Niveles aproximados del monitor de PC (0 a 100)
  leftLevel?: number;
  rightLevel?: number;
}

// Escala broadcast consistente de -60 dBFS a 0 dBFS
const dbToPercent = (db: number): number => {
  if (db <= -60) return 0;
  if (db >= 0) return 100;
  return ((db + 60) / 60) * 100;
};

const percentToDb = (percent: number): number => {
  if (percent <= 0) return -60;
  if (percent >= 100) return 0;
  return -60 + (percent / 100) * 60;
};

export const MasterAudioModal: React.FC<MasterAudioModalProps> = ({
  isOpen,
  onClose,
  playoutState,
  monitorMuted,
  monitorVolume,
  onToggleMonitorMute,
  onMonitorVolumeChange,
  leftLevel = 0,
  rightLevel = 0
}) => {
  // Estado local para edición
  const [outputVolumeDb, setOutputVolumeDb] = useState<number>(0.0);
  const [normalization, setNormalization] = useState<'EBU_R128' | 'ATSC_A85' | 'OFF' | 'CUSTOM'>('EBU_R128');
  const [customLufs, setCustomLufs] = useState<number>(-23.0);
  const [limiterEnabled, setLimiterEnabled] = useState<boolean>(true);
  const [limiterCeiling, setLimiterCeiling] = useState<number>(-1.5);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [pendingDb, setPendingDb] = useState<number | null>(null);
  const [previousUnmutedDb, setPreviousUnmutedDb] = useState<number>(0.0);

  // Estados de interfaz y confirmación
  const [isSaving, setIsSaving] = useState(false);
  const [saveNotice, setSaveNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showConfirmReset, setShowConfirmReset] = useState<boolean>(false);
  const [showConfirmBoost, setShowConfirmBoost] = useState<number | null>(null);

  // Estadísticas de medición de la cola de sonoridad
  const [loudnessStats, setLoudnessStats] = useState<{ ok: number; silent: number; noAudio: number; pending: number; error: number; total: number } | null>(null);

  // Control de concurrencia y timers
  const seqCounterRef = useRef<number>(0);
  const latestSeqReceivedRef = useRef<number>(0);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const noticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const modalContainerRef = useRef<HTMLDivElement>(null);

  // Valores primitivos del backend
  const masterAudio = playoutState?.masterAudio;
  const remoteVolumeDb = masterAudio?.volumeDb;
  const remoteNormalization = masterAudio?.normalization;
  const remoteLimiter = masterAudio?.limiter;
  const isAudioActiveInRust = Boolean(masterAudio?.active);
  const nativeTelemetry = masterAudio?.nativeTelemetry;

  // Ref con estado vigente para no capturar cierres viejos en callbacks asíncronos
  const currentSettingsRef = useRef({
    outputVolumeDb,
    normalization,
    limiterEnabled,
    customLufs,
    limiterCeiling
  });
  useEffect(() => {
    currentSettingsRef.current = {
      outputVolumeDb,
      normalization,
      limiterEnabled,
      customLufs,
      limiterCeiling
    };
  }, [outputVolumeDb, normalization, limiterEnabled, customLufs, limiterCeiling]);

  // Sincronizar estado cuando se abre el modal o cuando el backend actualiza valores primitivos,
  // pero NUNCA mientras el operador está arrastrando el fader ni cuando hay un valor pendiente de confirmación
  useEffect(() => {
    if (isOpen && !isDragging) {
      if (typeof remoteVolumeDb === 'number') {
        if (pendingDb === null || Math.abs(remoteVolumeDb - pendingDb) < 0.1) {
          setOutputVolumeDb(remoteVolumeDb);
          setPendingDb(null);
        }
      }
      if (remoteNormalization) {
        setNormalization(remoteNormalization);
      }
      if (typeof remoteLimiter === 'boolean') {
        setLimiterEnabled(remoteLimiter);
      }
    }
  }, [isOpen, remoteVolumeDb, remoteNormalization, remoteLimiter, isDragging, pendingDb]);

  // Manejo de tecla Escape para cerrar diálogo de forma accesible
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        if (showConfirmReset) {
          setShowConfirmReset(false);
        } else if (showConfirmBoost !== null) {
          setShowConfirmBoost(null);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, showConfirmReset, showConfirmBoost, onClose]);

  // Cargar estadísticas de sonoridad y refrescar periódicamente mientras esté abierto
  useEffect(() => {
    if (!isOpen) return;

    const fetchStats = () => {
      api.getAudioSettings()
        .then((res: any) => {
          if (res?.loudnessStats) {
            setLoudnessStats(res.loudnessStats);
          }
        })
        .catch(() => {});
    };

    fetchStats();
    const interval = setInterval(fetchStats, 4000);

    return () => {
      clearInterval(interval);
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const isOutputMuted = outputVolumeDb <= -59.5;

  // Función de guardado por parche parcial con número de secuencia anti-carreras
  const handlePatchAudioSettings = async (patch: {
    masterVolumeDb?: number;
    normalization?: 'EBU_R128' | 'ATSC_A85' | 'OFF' | 'CUSTOM';
    limiterEnabled?: boolean;
    customTargetLufs?: number;
    limiterCeilingDb?: number;
  }) => {
    const seq = ++seqCounterRef.current;
    setIsSaving(true);

    try {
      const res = await api.saveAudioSettings({
        ...patch,
        seq
      });

      if (res && typeof res.seq === 'number' && res.seq >= latestSeqReceivedRef.current) {
        latestSeqReceivedRef.current = res.seq;

        const noticeText = isAudioActiveInRust
          ? 'Ajustes de salida master aplicados al aire'
          : 'Guardado en SQLite (No aplicado: salida de audio SDI aún no abierta por tarjeta)';

        setSaveNotice({
          type: 'success',
          text: noticeText
        });
        if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
        noticeTimerRef.current = setTimeout(() => setSaveNotice(null), 3500);
      }
    } catch (err: any) {
      setSaveNotice({
        type: 'error',
        text: `Error al comunicar: ${err.message || 'Fallo de red'}`
      });
      setPendingDb(null);
    } finally {
      setIsSaving(false);
    }
  };

  // Cambio continuo en fader con debounce
  const handleSliderChange = (newDb: number) => {
    setOutputVolumeDb(newDb);
    setPendingDb(newDb);

    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      handlePatchAudioSettings({ masterVolumeDb: newDb });
    }, 180);
  };

  // Al soltar el fader (ratón, táctil, teclado), validar protección de boost (> +6 dB)
  const handlePointerUpOrBlur = () => {
    setIsDragging(false);
    if (outputVolumeDb >= 6.0 && (remoteVolumeDb === undefined || remoteVolumeDb < 6.0)) {
      setShowConfirmBoost(outputVolumeDb);
      return;
    }
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    handlePatchAudioSettings({ masterVolumeDb: outputVolumeDb });
  };

  const handlePresetDb = (targetDb: number) => {
    if (targetDb >= 6.0 && outputVolumeDb < 6.0) {
      setShowConfirmBoost(targetDb);
      return;
    }
    setOutputVolumeDb(targetDb);
    setPendingDb(targetDb);
    handlePatchAudioSettings({ masterVolumeDb: targetDb });
  };

  const handleTogglePgmOutputMute = () => {
    if (isOutputMuted) {
      // Restaurar volumen previo no mudo (o 0 dB por defecto)
      const restored = previousUnmutedDb > -59.0 ? previousUnmutedDb : 0.0;
      setOutputVolumeDb(restored);
      setPendingDb(restored);
      handlePatchAudioSettings({ masterVolumeDb: restored });
    } else {
      setPreviousUnmutedDb(outputVolumeDb);
      setOutputVolumeDb(-60.0);
      setPendingDb(-60.0);
      handlePatchAudioSettings({ masterVolumeDb: -60.0 });
    }
  };

  const handleNormalizationChange = (mode: 'EBU_R128' | 'ATSC_A85' | 'OFF' | 'CUSTOM') => {
    setNormalization(mode);
    handlePatchAudioSettings({ normalization: mode });
  };

  const handleToggleLimiter = () => {
    const nextVal = !limiterEnabled;
    setLimiterEnabled(nextVal);
    handlePatchAudioSettings({ limiterEnabled: nextVal });
  };

  const handleResetDefaults = () => {
    setOutputVolumeDb(0.0);
    setPendingDb(0.0);
    setNormalization('EBU_R128');
    setLimiterEnabled(true);
    setLimiterCeiling(-1.5);
    setShowConfirmReset(false);
    handlePatchAudioSettings({
      masterVolumeDb: 0.0,
      normalization: 'EBU_R128',
      limiterEnabled: true,
      limiterCeilingDb: -1.5
    });
  };

  // Lectura del medidor del monitor de PC (escala de potencia dBFS)
  const displayMonitorDbfs = (percent: number) => {
    const db = percentToDb(percent);
    if (db <= -59.5) return '-inf dBFS';
    return `${db.toFixed(1)} dBFS (RMS)`;
  };

  // Si playoutState aún no tiene masterAudio, mostrar estado de carga limpio
  if (!masterAudio) {
    return (
      <div className="m3-dialog-scrim" onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 1060, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ background: 'var(--color-canvas)', padding: 24, borderRadius: 12, border: '1px solid var(--border-subtle)', color: 'var(--color-ink)' }}>
          Cargando parámetros de audio...
        </div>
      </div>
    );
  }

  return (
    <div
      ref={modalContainerRef}
      className="m3-dialog-scrim"
      role="dialog"
      aria-modal="true"
      aria-labelledby="audio-modal-title"
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 1060,
        backgroundColor: 'rgba(0, 0, 0, 0.76)',
        backdropFilter: 'blur(5px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16
      }}
    >
      <div
        className="m3-dialog-card master-audio-dialog-card"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '94vw',
          maxWidth: '840px',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--color-canvas)',
          borderRadius: 16,
          border: '1px solid var(--border-subtle)',
          boxShadow: '0 24px 64px rgba(0, 0, 0, 0.55)',
          overflow: 'hidden'
        }}
      >
        {/* Cabecera del Diálogo M3 */}
        <div
          className="m3-dialog-header"
          style={{
            padding: '16px 22px',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--color-field)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: '50%',
                background: 'rgba(59, 130, 246, 0.14)',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--color-primary)',
                flexShrink: 0
              }}
            >
              <Sliders size={20} />
            </div>
            <div>
              <h2 id="audio-modal-title" style={{ fontSize: 16, fontWeight: 700, margin: 0, color: 'var(--color-ink)' }}>
                Configuración Master de Audio & Normalización
              </h2>
              <p style={{ margin: '2px 0 0 0', fontSize: 11, color: 'var(--color-text-muted)' }}>
                Parámetros de ganancia fija de salida, norma de sonoridad y monitoreo de cabina
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="m3-icon-button"
            title="Cerrar ventana"
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--color-text-muted)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 6,
              borderRadius: 6
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Banner Condicional de Rigor Broadcast (Reglas U1 / U4) */}
        {!isAudioActiveInRust ? (
          <div
            style={{
              padding: '9px 22px',
              background: 'rgba(255, 159, 10, 0.08)',
              borderBottom: '1px solid rgba(255, 159, 10, 0.25)',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              fontSize: 11,
              color: 'var(--color-warning, #ff9f0a)'
            }}
          >
            <AlertTriangle size={15} style={{ flexShrink: 0 }} />
            <span>
              <strong>Modo declarativo:</strong> La salida SDI no tiene stream de audio activo en este momento. Los cambios se guardan en la base de datos y se aplicarán al iniciar la salida física DeckLink.
            </span>
          </div>
        ) : (
          <div
            style={{
              padding: '9px 22px',
              background: 'rgba(34, 197, 94, 0.08)',
              borderBottom: '1px solid rgba(34, 197, 94, 0.25)',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              fontSize: 11,
              color: 'var(--apple-green, #15803d)'
            }}
          >
            <Check size={15} style={{ flexShrink: 0 }} />
            <span>
              <strong>Salida activa:</strong> El motor Rust está emitiendo audio sincronizado en la tarjeta DeckLink (Ganancia aplicada: {nativeTelemetry?.applied_gain_db !== undefined ? `${nativeTelemetry.applied_gain_db.toFixed(1)} dB` : '0.0 dB'}).
            </span>
          </div>
        )}

        {/* Barra de Estado Técnico y Estadísticas de la Cola */}
        <div
          style={{
            padding: '8px 22px',
            background: 'var(--color-canvas-soft, rgba(0, 0, 0, 0.03))',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 10,
            fontSize: 10.5,
            fontFamily: 'var(--font-family-mono)',
            color: 'var(--color-text-muted)',
            flexWrap: 'wrap'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Radio size={12} color={isAudioActiveInRust ? 'var(--apple-green)' : 'var(--color-text-muted)'} />
            <span>SDI HARDWARE: <strong>{isAudioActiveInRust ? 'ACTIVO' : 'EN ESPERA'}</strong></span>
          </div>
          <div>
            NORMA: <strong style={{ color: normalization === 'OFF' ? 'var(--color-warning, #f59e0b)' : 'var(--apple-green, #22c55e)' }}>
              {normalization === 'EBU_R128' ? 'EBU R128 (-23.0 LUFS)' : (normalization === 'ATSC_A85' ? 'ATSC A/85 (-24.0 LKFS)' : (normalization === 'CUSTOM' ? `PERSONALIZADO (${customLufs} LUFS)` : 'BYPASS (OFF)'))}
            </strong>
          </div>
          <div>
            LIMITADOR: <strong style={{ color: limiterEnabled ? '#3b82f6' : 'var(--color-text-muted)' }}>
              {limiterEnabled ? `ON (${limiterCeiling} dBFS)` : 'OFF'}
            </strong>
          </div>
          {loudnessStats && (
            <div title="Estado global de la cola de medición previa en SQLite">
              COLA: <strong style={{ color: 'var(--color-ink)' }}>{loudnessStats.ok} OK</strong>
              {loudnessStats.silent > 0 && <span style={{ color: 'var(--color-text-muted)' }}> • {loudnessStats.silent} mudo</span>}
              {loudnessStats.noAudio > 0 && <span style={{ color: 'var(--color-text-muted)' }}> • {loudnessStats.noAudio} sin audio</span>}
              {loudnessStats.pending > 0 && <span style={{ color: '#f59e0b' }}> • {loudnessStats.pending} pend.</span>}
              {loudnessStats.error > 0 && <span style={{ color: '#ef4444' }}> • {loudnessStats.error} err.</span>}
            </div>
          )}
        </div>

        {/* Contenido Principal con Scroll Controlado */}
        <div style={{ padding: '18px 22px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 18 }}>

          {/* =============================================================
              SECCIÓN 1: GANANCIA MASTER Y VÚMETRO LOCAL
              ============================================================= */}
          <div
            style={{
              background: 'var(--color-field)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 10,
              padding: 16
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Tv size={16} color="var(--color-primary)" />
                <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.4px', textTransform: 'uppercase', color: 'var(--color-ink)' }}>
                  Ganancia Master de Salida (Trim)
                </span>
              </div>
              <span style={{ fontSize: 10.5, color: 'var(--color-text-muted)' }}>
                {isAudioActiveInRust ? 'Trim aplicado en tiempo real por el motor Rust' : 'Ajuste previo para la emisión'}
              </span>
            </div>

            {/* Vúmetro de la señal recibida en el navegador (Monitor PC) */}
            <div
              style={{
                background: 'var(--color-canvas)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 8,
                padding: '12px 16px',
                marginBottom: 14
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 10, fontFamily: 'var(--font-family-mono)', color: 'var(--color-text-muted)' }}>
                <span>NIVEL DE AUDIO (MONITOR PC - REPRODUCTOR WEB)</span>
                <span>
                  L: <strong style={{ color: 'var(--color-ink)' }}>{displayMonitorDbfs(leftLevel)}</strong> • R: <strong style={{ color: 'var(--color-ink)' }}>{displayMonitorDbfs(rightLevel)}</strong>
                </span>
              </div>

              {/* Escala de Graduación dBFS uniforme (-60 a 0) */}
              <div style={{ position: 'relative', height: 14, marginBottom: 4, fontSize: 8.5, fontFamily: 'var(--font-family-mono)', color: 'var(--color-text-muted)' }}>
                <span style={{ position: 'absolute', left: `${dbToPercent(-60)}%` }}>-60</span>
                <span style={{ position: 'absolute', left: `${dbToPercent(-48)}%` }}>-48</span>
                <span style={{ position: 'absolute', left: `${dbToPercent(-36)}%` }}>-36</span>
                <span style={{ position: 'absolute', left: `${dbToPercent(-24)}%` }}>-24</span>
                <span style={{ position: 'absolute', left: `${dbToPercent(-18)}%`, color: '#38bdf8', fontWeight: 700 }} title="Referencia de calibración (-18 dBFS)">-18 (Ref)</span>
                <span style={{ position: 'absolute', left: `${dbToPercent(-12)}%` }}>-12</span>
                <span style={{ position: 'absolute', left: `${dbToPercent(-6)}%`, color: '#fbbf24' }}>-6</span>
                <span style={{ position: 'absolute', right: '0%', color: '#f87171' }}>0 dBFS</span>
              </div>

              {/* Barras Horizontales L y R */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {/* Canal Izquierdo (L) */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 14, fontSize: 10, fontWeight: 700, fontFamily: 'var(--font-family-mono)', color: 'var(--color-ink)' }}>L</span>
                  <div style={{ flex: 1, height: 16, background: 'var(--color-field)', borderRadius: 3, position: 'relative', overflow: 'hidden' }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${Math.min(100, Math.max(0, leftLevel))}%`,
                        background: 'linear-gradient(90deg, #22c55e 0%, #22c55e 70%, #f59e0b 88%, #ef4444 100%)',
                        transition: 'width 0.06s cubic-bezier(0.1, 0.9, 0.2, 1)'
                      }}
                    />
                    {/* Línea de Referencia en -18 dBFS (70%) */}
                    <div
                      style={{
                        position: 'absolute',
                        top: 0,
                        bottom: 0,
                        left: `${dbToPercent(-18)}%`,
                        width: 2,
                        background: '#ffffff',
                        boxShadow: '0 0 3px rgba(0,0,0,0.5)',
                        pointerEvents: 'none',
                        zIndex: 2
                      }}
                      title="Referencia de alineación de audio (-18 dBFS)"
                    />
                  </div>
                </div>

                {/* Canal Derecho (R) */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 14, fontSize: 10, fontWeight: 700, fontFamily: 'var(--font-family-mono)', color: 'var(--color-ink)' }}>R</span>
                  <div style={{ flex: 1, height: 16, background: 'var(--color-field)', borderRadius: 3, position: 'relative', overflow: 'hidden' }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${Math.min(100, Math.max(0, rightLevel))}%`,
                        background: 'linear-gradient(90deg, #22c55e 0%, #22c55e 70%, #f59e0b 88%, #ef4444 100%)',
                        transition: 'width 0.06s cubic-bezier(0.1, 0.9, 0.2, 1)'
                      }}
                    />
                    <div
                      style={{
                        position: 'absolute',
                        top: 0,
                        bottom: 0,
                        left: `${dbToPercent(-18)}%`,
                        width: 2,
                        background: '#ffffff',
                        boxShadow: '0 0 3px rgba(0,0,0,0.5)',
                        pointerEvents: 'none',
                        zIndex: 2
                      }}
                      title="Referencia de alineación de audio (-18 dBFS)"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Fader de Ganancia Master */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-ink)' }}>
                  GANANCIA MASTER DE SALIDA:
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button
                    type="button"
                    onClick={handleTogglePgmOutputMute}
                    style={{
                      background: isOutputMuted ? 'rgba(239, 68, 68, 0.2)' : 'var(--color-field)',
                      border: isOutputMuted ? '1px solid #ef4444' : '1px solid var(--border-subtle)',
                      color: isOutputMuted ? '#ef4444' : 'var(--color-ink)',
                      borderRadius: 4,
                      padding: '2px 8px',
                      fontSize: 10,
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4
                    }}
                    title={isOutputMuted ? 'Restablecer ganancia previa' : 'Silenciar la salida de transmisión'}
                  >
                    {isOutputMuted ? <VolumeX size={12} /> : <Volume2 size={12} />}
                    <span>{isOutputMuted ? 'MUTE ACTIVO' : 'MUTE PGM'}</span>
                  </button>
                  <span
                    style={{
                      fontSize: 14,
                      fontWeight: 700,
                      fontFamily: 'var(--font-family-mono)',
                      color: isOutputMuted ? '#ef4444' : (outputVolumeDb > 0 ? '#f59e0b' : 'var(--color-primary)'),
                      background: 'var(--color-canvas)',
                      border: '1px solid var(--border-subtle)',
                      padding: '3px 10px',
                      borderRadius: 4
                    }}
                  >
                    {isOutputMuted ? '-inf dB' : (outputVolumeDb > 0 ? `+${outputVolumeDb.toFixed(1)} dB` : `${outputVolumeDb.toFixed(1)} dB`)}
                  </span>
                </div>
              </div>

              {/* Slider de Ganancia */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 10, fontFamily: 'var(--font-family-mono)', color: 'var(--color-text-muted)', width: 44 }}>
                  -60 dB
                </span>
                <input
                  type="range"
                  min="-60"
                  max="12"
                  step="0.5"
                  value={outputVolumeDb}
                  onPointerDown={() => setIsDragging(true)}
                  onPointerUp={handlePointerUpOrBlur}
                  onPointerCancel={handlePointerUpOrBlur}
                  onBlur={handlePointerUpOrBlur}
                  onChange={(e) => handleSliderChange(parseFloat(e.target.value))}
                  style={{
                    flex: 1,
                    height: 6,
                    cursor: 'pointer'
                  }}
                  title="Ajuste de ganancia de salida al aire (-60 dB a +12 dB)"
                />
                <span style={{ fontSize: 10, fontFamily: 'var(--font-family-mono)', color: 'var(--color-text-muted)', width: 44, textAlign: 'right' }}>
                  +12 dB
                </span>
              </div>

              {/* Botones de Presintonía Rápida */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 10, color: 'var(--color-text-muted)', marginRight: 4 }}>Accesos rápidos:</span>
                <button
                  type="button"
                  className="btn-tool"
                  onClick={() => handlePresetDb(-60.0)}
                  style={{ fontSize: 10, padding: '3px 8px', background: outputVolumeDb <= -59.5 ? 'rgba(239, 68, 68, 0.2)' : undefined, color: outputVolumeDb <= -59.5 ? '#ef4444' : undefined }}
                >
                  Mute (-inf)
                </button>
                <button
                  type="button"
                  className="btn-tool"
                  onClick={() => handlePresetDb(-12.0)}
                  style={{ fontSize: 10, padding: '3px 8px', background: Math.abs(outputVolumeDb - (-12)) < 0.1 ? 'var(--color-accent-subtle)' : undefined }}
                >
                  -12 dB
                </button>
                <button
                  type="button"
                  className="btn-tool"
                  onClick={() => handlePresetDb(-6.0)}
                  style={{ fontSize: 10, padding: '3px 8px', background: Math.abs(outputVolumeDb - (-6)) < 0.1 ? 'var(--color-accent-subtle)' : undefined }}
                >
                  -6 dB
                </button>
                <button
                  type="button"
                  className="btn-tool"
                  onClick={() => handlePresetDb(0.0)}
                  style={{
                    fontSize: 10,
                    padding: '3px 10px',
                    fontWeight: 700,
                    background: Math.abs(outputVolumeDb) < 0.1 ? 'var(--color-primary)' : 'var(--color-canvas)',
                    color: Math.abs(outputVolumeDb) < 0.1 ? '#ffffff' : 'var(--color-ink)',
                    borderColor: 'var(--color-primary)'
                  }}
                >
                  0.0 dB (Nominal)
                </button>
                <button
                  type="button"
                  className="btn-tool"
                  onClick={() => handlePresetDb(3.0)}
                  style={{ fontSize: 10, padding: '3px 8px', background: Math.abs(outputVolumeDb - 3) < 0.1 ? 'rgba(245, 158, 11, 0.2)' : undefined, color: Math.abs(outputVolumeDb - 3) < 0.1 ? '#d97706' : undefined }}
                  title="Aumentar volumen para contenidos grabados bajos (+3 dB)"
                >
                  +3.0 dB (Boost)
                </button>
                <button
                  type="button"
                  className="btn-tool"
                  onClick={() => handlePresetDb(6.0)}
                  style={{ fontSize: 10, padding: '3px 8px', background: Math.abs(outputVolumeDb - 6) < 0.1 ? 'rgba(245, 158, 11, 0.2)' : undefined, color: Math.abs(outputVolumeDb - 6) < 0.1 ? '#d97706' : undefined }}
                  title="Aumentar volumen a +6 dB"
                >
                  +6.0 dB
                </button>
              </div>
            </div>

            {/* Opciones del Procesador de Normalización de Salida */}
            <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-ink)', marginBottom: 8 }}>
                Normativa de Normalización de Loudness (Archivos Locales)
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 10 }}>
                {/* Opción 1: EBU R128 */}
                <div
                  onClick={() => handleNormalizationChange('EBU_R128')}
                  style={{
                    padding: 10,
                    borderRadius: 8,
                    cursor: 'pointer',
                    border: normalization === 'EBU_R128' ? '2px solid var(--apple-green)' : '1px solid var(--border-subtle)',
                    background: normalization === 'EBU_R128' ? 'rgba(34, 197, 94, 0.08)' : 'var(--color-canvas)',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                    <strong style={{ fontSize: 11.5, color: normalization === 'EBU_R128' ? 'var(--apple-green, #15803d)' : 'var(--color-ink)' }}>
                      EBU R128
                    </strong>
                    {normalization === 'EBU_R128' && <Check size={14} color="#15803d" />}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--color-text-muted)', lineHeight: 1.3 }}>
                    Nivel objetivo: <strong>-23.0 LUFS</strong> • Max True Peak: <strong>-1.5 dBTP</strong>.
                  </div>
                </div>

                {/* Opción 2: ATSC A/85 */}
                <div
                  onClick={() => handleNormalizationChange('ATSC_A85')}
                  style={{
                    padding: 10,
                    borderRadius: 8,
                    cursor: 'pointer',
                    border: normalization === 'ATSC_A85' ? '2px solid var(--color-primary)' : '1px solid var(--border-subtle)',
                    background: normalization === 'ATSC_A85' ? 'rgba(59, 130, 246, 0.08)' : 'var(--color-canvas)',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                    <strong style={{ fontSize: 11.5, color: normalization === 'ATSC_A85' ? 'var(--color-primary)' : 'var(--color-ink)' }}>
                      ATSC A/85 (CALM Act)
                    </strong>
                    {normalization === 'ATSC_A85' && <Check size={14} color="var(--color-primary)" />}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--color-text-muted)', lineHeight: 1.3 }}>
                    Nivel objetivo: <strong>-24.0 LKFS</strong> • Max True Peak: <strong>-2.0 dBTP</strong>.
                  </div>
                </div>

                {/* Opción 3: Bypass (OFF) */}
                <div
                  onClick={() => handleNormalizationChange('OFF')}
                  style={{
                    padding: 10,
                    borderRadius: 8,
                    cursor: 'pointer',
                    border: normalization === 'OFF' ? '2px solid #f59e0b' : '1px solid var(--border-subtle)',
                    background: normalization === 'OFF' ? 'rgba(245, 158, 11, 0.08)' : 'var(--color-canvas)',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                    <strong style={{ fontSize: 11.5, color: normalization === 'OFF' ? '#b45309' : 'var(--color-ink)' }}>
                      Bypass (Sin Normalización)
                    </strong>
                    {normalization === 'OFF' && <Check size={14} color="#b45309" />}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--color-text-muted)', lineHeight: 1.3 }}>
                    Paso directo 1:1 sin ganancia estática. El archivo se emite con su volumen original.
                  </div>
                </div>
              </div>

              {/* Limitador True Peak Toggle */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, padding: '8px 12px', background: 'var(--color-canvas)', borderRadius: 6, border: '1px solid var(--border-subtle)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <ShieldCheck size={16} color={limiterEnabled ? 'var(--apple-green)' : 'var(--color-text-muted)'} />
                  <div>
                    <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-ink)' }}>
                      Limitador True Peak de Salida ({limiterCeiling} dBFS)
                    </span>
                    <div style={{ fontSize: 9.5, color: 'var(--color-text-muted)' }}>
                      Protección contra sobremodulación y recorte inter-muestra
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleToggleLimiter}
                  style={{
                    padding: '3px 10px',
                    borderRadius: 4,
                    fontSize: 10,
                    fontWeight: 700,
                    cursor: 'pointer',
                    background: limiterEnabled ? 'rgba(34, 197, 94, 0.15)' : 'rgba(148, 163, 184, 0.15)',
                    color: limiterEnabled ? '#15803d' : '#64748b',
                    border: limiterEnabled ? '1px solid rgba(34, 197, 94, 0.4)' : '1px solid rgba(148, 163, 184, 0.3)'
                  }}
                >
                  {limiterEnabled ? 'PROTECCIÓN ACTIVA' : 'LIMITADOR DESACTIVADO'}
                </button>
              </div>

              {/* Nota sobre señales en vivo */}
              <div style={{ marginTop: 8, fontSize: 10, color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
                * Nota: Las entradas en vivo (SDI / NDI) no se normalizan por LUFS; reciben únicamente el Trim master y el limitador de seguridad.
              </div>
            </div>
          </div>

          {/* =============================================================
              SECCIÓN 2: AUDIO DE MONITOREO LOCAL (CABINA / PC DEL OPERADOR)
              ============================================================= */}
          <div
            style={{
              background: 'var(--color-canvas-soft, rgba(0, 0, 0, 0.02))',
              border: '1px dashed var(--border-subtle)',
              borderRadius: 10,
              padding: 14
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Headphones size={16} color="var(--color-cyan, #0ea5e9)" />
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-ink)' }}>
                  Audio de Monitoreo Local (Cabina / Operador)
                </span>
                <span
                  style={{
                    fontSize: 9,
                    fontWeight: 700,
                    padding: '2px 6px',
                    borderRadius: 4,
                    background: 'rgba(14, 165, 233, 0.12)',
                    color: '#0284c7',
                    border: '1px solid rgba(14, 165, 233, 0.3)'
                  }}
                >
                  LOCAL EN PC
                </span>
              </div>
              <span style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>
                Solo parlantes/auriculares de esta computadora • <strong>NO afecta la transmisión</strong>
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button
                type="button"
                onClick={onToggleMonitorMute}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '5px 10px',
                  borderRadius: 6,
                  cursor: 'pointer',
                  border: monitorMuted ? '1px solid #ef4444' : '1px solid var(--border-subtle)',
                  background: monitorMuted ? 'rgba(239, 68, 68, 0.15)' : 'var(--color-canvas)',
                  color: monitorMuted ? '#ef4444' : 'var(--color-ink)',
                  fontSize: 10.5,
                  fontWeight: 600
                }}
                title={monitorMuted ? 'Activar audio en altavoces de la computadora' : 'Silenciar altavoces de la computadora'}
              >
                {monitorMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
                <span>{monitorMuted ? 'Monitor Mudo' : 'Monitor Activo'}</span>
              </button>

              <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 9.5, color: 'var(--color-text-muted)' }}>Volumen Cabina:</span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  value={monitorMuted ? 0 : Math.round(monitorVolume * 100)}
                  onChange={(e) => onMonitorVolumeChange(Number(e.target.value) / 100)}
                  style={{ flex: 1, height: 4, cursor: 'pointer' }}
                  title="Volumen del reproductor de pantalla para el operador"
                />
                <span style={{ fontSize: 10.5, fontFamily: 'var(--font-family-mono)', fontWeight: 600, width: 36, textAlign: 'right' }}>
                  {monitorMuted ? '0%' : `${Math.round(monitorVolume * 100)}%`}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer del Diálogo */}
        <div
          className="m3-dialog-footer"
          style={{
            padding: '12px 22px',
            borderTop: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--color-field)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              type="button"
              className="btn-tool"
              onClick={() => setShowConfirmReset(true)}
              style={{ fontSize: 10.5, padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 5 }}
              title="Restablecer volumen de salida a 0.0 dB y EBU R128 (-23 LUFS)"
            >
              <RotateCcw size={12} />
              <span>Restablecer Valores de Fábrica</span>
            </button>
            {isSaving && (
              <span style={{ fontSize: 10.5, color: 'var(--color-primary)', fontWeight: 600 }}>
                Guardando...
              </span>
            )}
            {saveNotice && !isSaving && (
              <span
                style={{
                  fontSize: 10.5,
                  color: saveNotice.type === 'error' ? '#ef4444' : '#15803d',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4
                }}
              >
                {saveNotice.type === 'error' ? <AlertTriangle size={12} /> : <Check size={12} />}
                {saveNotice.text}
              </span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              type="button"
              className="btn-cmd play"
              onClick={onClose}
              style={{ fontSize: 11, padding: '5px 16px', borderRadius: 6, fontWeight: 700 }}
            >
              Listo / Cerrar
            </button>
          </div>
        </div>
      </div>

      {/* Modal de Confirmación para Restablecer Valores de Fábrica */}
      {showConfirmReset && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'absolute',
            zIndex: 1070,
            background: 'var(--color-canvas)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 12,
            padding: '20px 24px',
            maxWidth: 420,
            boxShadow: '0 16px 48px rgba(0,0,0,0.6)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, color: 'var(--color-warning, #f59e0b)' }}>
            <AlertTriangle size={20} />
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--color-ink)' }}>
              ¿Restablecer Configuración de Audio?
            </h3>
          </div>
          <p style={{ fontSize: 12, color: 'var(--color-text-muted)', lineHeight: 1.5, marginBottom: 16 }}>
            Esta acción restablecerá la ganancia master a <strong>0.0 dB</strong> y la norma a <strong>EBU R128 (-23.0 LUFS)</strong>.
          </p>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button
              type="button"
              className="btn-tool"
              onClick={() => setShowConfirmReset(false)}
              style={{ fontSize: 11, padding: '5px 12px' }}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="btn-cmd play"
              onClick={handleResetDefaults}
              style={{ fontSize: 11, padding: '5px 14px', background: 'var(--color-primary)' }}
            >
              Confirmar Restablecimiento
            </button>
          </div>
        </div>
      )}

      {/* Modal de Confirmación para Boost Elevado (+6 dB o superior) */}
      {showConfirmBoost !== null && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'absolute',
            zIndex: 1070,
            background: 'var(--color-canvas)',
            border: '1px solid #ef4444',
            borderRadius: 12,
            padding: '20px 24px',
            maxWidth: 420,
            boxShadow: '0 16px 48px rgba(0,0,0,0.6)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, color: '#ef4444' }}>
            <AlertTriangle size={20} />
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--color-ink)' }}>
              Aviso de Seguridad: Boost Elevado
            </h3>
          </div>
          <p style={{ fontSize: 12, color: 'var(--color-text-muted)', lineHeight: 1.5, marginBottom: 16 }}>
            Se va a aplicar <strong>+{showConfirmBoost.toFixed(1)} dB</strong> de ganancia. Un valor alto puede saturar la señal o forzar la intervención del limitador.
          </p>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button
              type="button"
              className="btn-tool"
              onClick={() => {
                const target = showConfirmBoost;
                setShowConfirmBoost(null);
                // Si el slider fue arrastrado hasta aquí y se cancela, volver al valor anterior
                if (outputVolumeDb >= 6.0) {
                  setOutputVolumeDb(remoteVolumeDb ?? 0.0);
                }
              }}
              style={{ fontSize: 11, padding: '5px 12px' }}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="btn-cmd play"
              onClick={() => {
                const target = showConfirmBoost;
                setShowConfirmBoost(null);
                setOutputVolumeDb(target);
                setPendingDb(target);
                handlePatchAudioSettings({ masterVolumeDb: target });
              }}
              style={{ fontSize: 11, padding: '5px 14px', background: '#ef4444' }}
            >
              Aplicar Boost (+{showConfirmBoost.toFixed(1)} dB)
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
