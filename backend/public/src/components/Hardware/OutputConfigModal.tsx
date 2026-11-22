import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { DeckLinkStatus } from '../../types/playout';
import { useDeckLink } from '../../hooks/useDeckLink';
import { ErrorAlertBanner } from '../Common/ErrorAlertBanner';
import {
  Tv, X, Activity, RefreshCw, CheckCircle2, Globe, AlertTriangle, Layers,
  Play, Radio, Clock, ShieldCheck, Check
} from 'lucide-react';

interface OutputConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  status?: DeckLinkStatus;
  channelState?: string; // 'IDLE' | 'PLAYING' | 'PAUSED' | 'LIVE_SDI' | 'LIVE_NDI' | 'EMERGENCY_FALLBACK'
}

interface DiagCardProps {
  label: string;
  value: string;
  status: 'ok' | 'warn' | 'error' | 'neutral';
  subtext?: string;
}

const DiagCard: React.FC<DiagCardProps> = ({ label, value, status, subtext }) => {
  const dotColor = {
    ok: 'var(--color-success, #34c759)',
    warn: 'var(--color-warning, #ff9f0a)',
    error: 'var(--color-danger, #ef4444)',
    neutral: 'var(--color-text-muted, #8e8e93)'
  }[status];

  return (
    <div style={{
      background: 'var(--color-field, rgba(255, 255, 255, 0.04))',
      padding: '10px 12px',
      borderRadius: 'var(--radius-sm, 8px)',
      border: '1px solid var(--color-hairline, rgba(255, 255, 255, 0.08))',
      display: 'flex',
      flexDirection: 'column',
      gap: 3
    }}>
      <div style={{ fontSize: 10.5, color: 'var(--color-text-muted, var(--text-tertiary))' }}>
        {label}
      </div>
      <div style={{
        fontSize: 12,
        fontWeight: 600,
        color: 'var(--color-ink, var(--text-primary))',
        display: 'flex',
        alignItems: 'center',
        gap: 6
      }}>
        <span style={{
          width: 7,
          height: 7,
          borderRadius: '50%',
          background: dotColor,
          flexShrink: 0
        }} />
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {value}
        </span>
      </div>
      {subtext && (
        <div style={{ fontSize: 9.5, color: 'var(--color-text-muted, #8e8e93)', marginTop: 1 }}>
          {subtext}
        </div>
      )}
    </div>
  );
};

export const OutputConfigModal: React.FC<OutputConfigModalProps> = ({
  isOpen,
  onClose,
  status: propStatus,
  channelState = 'IDLE'
}) => {
  const {
    status: hookStatus,
    scanResult,
    outputConfig,
    capabilities,
    isScanning,
    isTesting,
    isApplying,
    testNotice,
    errorMessage,
    setErrorMessage,
    refreshData,
    applyAndRestart,
    saveOutputConfig,
    scanHardware,
    testOutput
  } = useDeckLink({ autoFetch: isOpen });

  // Selección local de norma antes de aplicar
  const [selectedFormat, setSelectedFormat] = useState<string>('');
  const [applySuccessMsg, setApplySuccessMsg] = useState<string | null>(null);
  const [showConfirmTest, setShowConfirmTest] = useState<boolean>(false);

  // Única fuente de verdad de telemetría de hardware
  const currentStatus = hookStatus || propStatus;

  // Sincronizar norma local con la configuración guardada SOLO al abrir el modal
  // para evitar resetear la selección del usuario durante el polling de estado
  useEffect(() => {
    if (!isOpen) return;
    setSelectedFormat(outputConfig?.sdiFormat || currentStatus?.activeProfile || '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Manejo de tecla Escape y captura de foco
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const isChannelOnAir = channelState === 'PLAYING' || channelState === 'PAUSED';

  // Diagnóstico veraz basado estrictamente en telemetría de Rust
  const isPcieDetected = Boolean(currentStatus?.hardwarePresent ?? scanResult?.hardwarePresent);
  const isDriverInstalled = Boolean(currentStatus?.driverInstalled ?? scanResult?.driverInstalled);
  const hasActiveOutput = Boolean(currentStatus?.sdiOutputLocked);
  const framesCompleted = currentStatus?.framesCompleted ?? currentStatus?.totalEmittedFrames ?? 0;
  const framesDropped = currentStatus?.framesDropped ?? currentStatus?.droppedFramesCount ?? 0;
  const activeProfileReal = currentStatus?.activeProfile || null;
  const sdiInputDetected = Boolean(currentStatus?.sdiInputDetected);
  const detectedInputFmt = currentStatus?.detectedInputFormat || null;
  const genlockLocked = Boolean(currentStatus?.genlockLocked);

  // Estado de salida calificado
  const outputDisplayState = !hasActiveOutput
    ? { text: 'En Espera (Cerrada)', status: 'warn' as const }
    : framesCompleted > 0
      ? { text: 'Transmitiendo', status: 'ok' as const, sub: `${framesCompleted} cuadros emitidos` }
      : { text: 'Abierta, sin cuadros', status: 'warn' as const, sub: 'Hardware listo' };

  // Normas soportadas validadas por DoesSupportVideoMode en Rust
  const supportedStandards = (capabilities && capabilities.length > 0)
    ? capabilities
    : (currentStatus?.availableStandards && currentStatus.availableStandards.length > 0)
      ? currentStatus.availableStandards
      : [
          '1080i59.94',
          '1080i50',
          '1080p25',
          '1080p29.97',
          '720p50',
          '720p59.94'
        ];

  const handleApply = async () => {
    if (!selectedFormat) return;
    try {
      setApplySuccessMsg(null);
      await applyAndRestart(selectedFormat);
      setApplySuccessMsg(`Norma ${selectedFormat} aplicada exitosamente en la tarjeta DeckLink.`);
      setTimeout(() => setApplySuccessMsg(null), 5000);
    } catch (err: any) {
      // El error ya lo captura useDeckLink en errorMessage
    }
  };

  const handleExecuteTest = async () => {
    setShowConfirmTest(false);
    await testOutput();
  };

  return (
    <div
      className="m3-dialog-backdrop modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="decklink-modal-title"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--spacing-md, 16px)',
        background: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(3px)'
      }}
    >
      <div
        className="modal-container"
        style={{
          width: '100%',
          maxWidth: 680,
          background: 'var(--color-canvas-soft, var(--bg-surface))',
          borderRadius: 'var(--radius-xl, 20px)',
          border: '1px solid var(--color-hairline, var(--border-subtle))',
          boxShadow: '0 20px 45px rgba(0, 0, 0, 0.45)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '90vh'
        }}
      >
        {/* Header */}
        <div style={{
          padding: '16px 22px',
          borderBottom: '1px solid var(--color-hairline, var(--border-subtle))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'var(--color-canvas-soft, var(--bg-surface))'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 36,
              height: 36,
              borderRadius: 'var(--radius-md, 10px)',
              background: 'var(--color-accent-subtle, rgba(11, 87, 208, 0.12))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-primary)'
            }}>
              <Tv size={20} />
            </div>
            <div>
              <h2
                id="decklink-modal-title"
                style={{ margin: 0, fontSize: 15.5, fontWeight: 600, color: 'var(--color-ink, var(--text-primary))' }}
              >
                Salida Principal de Emisión (PGM)
              </h2>
              <div style={{ fontSize: 11, color: 'var(--color-text-muted, var(--text-tertiary))', marginTop: 1 }}>
                Ajuste de tarjeta y formato de video para la transmisión
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar ventana"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--color-text-muted, var(--text-tertiary))',
              cursor: 'pointer',
              padding: 6,
              borderRadius: 'var(--radius-full, 9999px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{
          padding: '18px 22px',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          background: 'var(--color-canvas, var(--bg-app))'
        }}>
          {errorMessage && (
            <ErrorAlertBanner
              title="Aviso de Hardware"
              message={errorMessage}
              onRetry={refreshData}
              onDismiss={() => setErrorMessage(null)}
            />
          )}

          {applySuccessMsg && (
            <div style={{
              background: 'var(--color-success-subtle, rgba(52, 199, 89, 0.15))',
              border: '1px solid var(--color-success, #34c759)',
              borderRadius: 'var(--radius-md, 10px)',
              padding: '9px 12px',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 11.5,
              color: 'var(--color-success-on-subtle, #34c759)'
            }}>
              <CheckCircle2 size={16} />
              <span>{applySuccessMsg}</span>
            </div>
          )}

          {testNotice && (
            <div style={{
              background: 'var(--color-success-subtle, rgba(52, 199, 89, 0.15))',
              border: '1px solid var(--color-success, #34c759)',
              borderRadius: 'var(--radius-md, 10px)',
              padding: '9px 12px',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 11.5,
              color: 'var(--color-success-on-subtle, #34c759)'
            }}>
              <CheckCircle2 size={16} />
              <span>{testNotice}</span>
            </div>
          )}

          {/* 1. ESTADO REAL DE HARDWARE (RUST TELEMETRY) */}
          <div style={{
            background: 'var(--color-canvas-soft, var(--bg-surface))',
            border: '1px solid var(--color-hairline, var(--border-subtle))',
            borderRadius: 'var(--radius-lg, 14px)',
            padding: 14,
            display: 'flex',
            flexDirection: 'column',
            gap: 10
          }}>
            <div style={{
              fontSize: 10.5,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              color: 'var(--color-text-muted, var(--text-tertiary))'
            }}>
              Diagnóstico de Hardware y Señal (Rust Core)
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              <DiagCard
                label="Tarjeta DeckLink"
                value={isPcieDetected ? (currentStatus?.deviceName || 'Detectada') : 'No detectada'}
                status={isPcieDetected ? 'ok' : 'error'}
                subtext={isPcieDetected ? 'PCIe en línea' : 'Verifique tarjeta'}
              />
              <DiagCard
                label="Driver Blackmagic"
                value={isDriverInstalled ? 'Desktop Video OK' : 'No instalado'}
                status={isDriverInstalled ? 'ok' : 'error'}
                subtext={isDriverInstalled ? 'COM SDK disponible' : 'Instale Desktop Video'}
              />
              <DiagCard
                label="Salida SDI Master"
                value={outputDisplayState.text}
                status={outputDisplayState.status}
                subtext={outputDisplayState.sub}
              />
              <DiagCard
                label="Entrada SDI (In)"
                value={sdiInputDetected ? `Señal Activa (${detectedInputFmt || 'Sync'})` : 'Sin señal entrante'}
                status={sdiInputDetected ? 'ok' : 'neutral'}
                subtext={detectedInputFmt ? `Formato: ${detectedInputFmt}` : 'Auto-detect activo'}
              />
              <DiagCard
                label="Referencia de Sincronía"
                value={genlockLocked ? 'Conectada (Genlock)' : 'Interna'}
                status={genlockLocked ? 'ok' : 'neutral'}
                subtext={genlockLocked ? 'Sincronía externa' : 'Reloj propio de la tarjeta'}
              />
              <DiagCard
                label="Cuadros Perdidos"
                value={`${framesDropped} cuadros`}
                status={framesDropped === 0 ? 'ok' : framesDropped < 10 ? 'warn' : 'error'}
                subtext={framesDropped === 0 ? 'Transmisión fluida' : 'Revisar rendimiento'}
              />
            </div>
          </div>

          {/* 2. MODO DE TRANSMISIÓN (SDI ACTIVO / NDI PENDIENTE) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{
              fontSize: 10.5,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              color: 'var(--color-text-muted, var(--text-tertiary))'
            }}>
              Modo de Transmisión Principal (PGM)
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              {/* Opción SDI */}
              <div
                onClick={() => saveOutputConfig({ outputType: 'DECKLINK' })}
                style={{
                  background: (outputConfig?.outputType === 'DECKLINK' || !outputConfig?.outputType)
                    ? 'var(--color-primary-container, rgba(11, 87, 208, 0.08))'
                    : 'var(--color-canvas-soft, var(--bg-surface))',
                  border: (outputConfig?.outputType === 'DECKLINK' || !outputConfig?.outputType)
                    ? '1.5px solid var(--color-primary)'
                    : '1px solid var(--color-hairline, rgba(255, 255, 255, 0.08))',
                  borderRadius: 'var(--radius-md, 10px)',
                  padding: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 4,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, fontSize: 12, color: 'var(--color-ink)' }}>
                    <Tv size={15} color="var(--color-primary)" />
                    <span>Solo Tarjeta SDI</span>
                  </div>
                  {(outputConfig?.outputType === 'DECKLINK' || !outputConfig?.outputType) && (
                    <Check size={14} color="var(--color-primary)" />
                  )}
                </div>
                <div style={{ fontSize: 10.5, color: 'var(--color-text-muted)' }}>
                  Salida física por Blackmagic DeckLink.
                </div>
              </div>

              {/* Opción NDI */}
              <div
                onClick={() => saveOutputConfig({ outputType: 'NDI' })}
                style={{
                  background: outputConfig?.outputType === 'NDI'
                    ? 'var(--color-primary-container, rgba(11, 87, 208, 0.08))'
                    : 'var(--color-canvas-soft, var(--bg-surface))',
                  border: outputConfig?.outputType === 'NDI'
                    ? '1.5px solid var(--color-primary)'
                    : '1px solid var(--color-hairline, rgba(255, 255, 255, 0.08))',
                  borderRadius: 'var(--radius-md, 10px)',
                  padding: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 4,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, fontSize: 12, color: 'var(--color-ink)' }}>
                    <Globe size={15} color={outputConfig?.outputType === 'NDI' ? 'var(--color-primary)' : 'var(--color-text-muted)'} />
                    <span>Solo Red NDI 6</span>
                  </div>
                  {outputConfig?.outputType === 'NDI' && (
                    <Check size={14} color="var(--color-primary)" />
                  )}
                </div>
                <div style={{ fontSize: 10.5, color: 'var(--color-text-muted)' }}>
                  Emisión en red IP ({outputConfig?.ndiStreamName || 'IB-CAST-MASTER'}).
                </div>
              </div>

              {/* Opción Híbrido Simultáneo */}
              <div
                onClick={() => saveOutputConfig({ outputType: 'SIMULTANEOUS' })}
                style={{
                  background: outputConfig?.outputType === 'SIMULTANEOUS'
                    ? 'var(--color-primary-container, rgba(11, 87, 208, 0.08))'
                    : 'var(--color-canvas-soft, var(--bg-surface))',
                  border: outputConfig?.outputType === 'SIMULTANEOUS'
                    ? '1.5px solid var(--color-primary)'
                    : '1px solid var(--color-hairline, rgba(255, 255, 255, 0.08))',
                  borderRadius: 'var(--radius-md, 10px)',
                  padding: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 4,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, fontSize: 12, color: 'var(--color-ink)' }}>
                    <Layers size={15} color={outputConfig?.outputType === 'SIMULTANEOUS' ? 'var(--color-primary)' : 'var(--color-text-muted)'} />
                    <span>Híbrido Simultáneo</span>
                  </div>
                  {outputConfig?.outputType === 'SIMULTANEOUS' && (
                    <Check size={14} color="var(--color-primary)" />
                  )}
                </div>
                <div style={{ fontSize: 10.5, color: 'var(--color-text-muted)' }}>
                  Salida paralela y sincronizada SDI + NDI 6.
                </div>
              </div>
            </div>
          </div>

          {/* 3. SELECTOR DE DISPOSITIVO Y NORMA DE EMISIÓN */}
          <div style={{
            background: 'var(--color-canvas-soft, var(--bg-surface))',
            border: '1px solid var(--color-hairline, var(--border-subtle))',
            borderRadius: 'var(--radius-lg, 14px)',
            padding: 14,
            display: 'flex',
            flexDirection: 'column',
            gap: 12
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{
                fontSize: 10.5,
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                color: 'var(--color-text-muted, var(--text-tertiary))'
              }}>
                Ajuste Maestro de Salida
              </div>
              <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                Configurada: <strong style={{ color: 'var(--color-ink)' }}>{outputConfig?.sdiFormat || 'Sin configurar'}</strong>
                {' • '}
                Emitiendo: <strong style={{ color: activeProfileReal ? 'var(--color-success)' : 'var(--color-warning)' }}>
                  {activeProfileReal || 'Ninguna (Cerrada)'}
                </strong>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {/* Tarjeta de hardware (Índice y selección real) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <label style={{ fontSize: 11.5, fontWeight: 500, color: 'var(--color-ink)' }}>
                  Dispositivo DeckLink Seleccionado:
                </label>
                <select
                  value={outputConfig?.blackmagicDevice || ''}
                  onChange={(e) => saveOutputConfig({ blackmagicDevice: e.target.value })}
                  disabled={!isPcieDetected && !outputConfig?.blackmagicDevice}
                  style={{
                    background: 'var(--color-field, var(--bg-surface))',
                    border: '1px solid var(--color-hairline, var(--border-subtle))',
                    borderRadius: 'var(--radius-sm, 6px)',
                    padding: '8px 10px',
                    color: 'var(--color-ink)',
                    fontSize: 12,
                    outline: 'none'
                  }}
                >
                  {(scanResult?.devices && scanResult.devices.length > 0) ? (
                    scanResult.devices.map((dev, idx) => (
                      <option key={`${dev.name}-${idx}`} value={dev.name}>
                        [{idx}] {dev.name}
                      </option>
                    ))
                  ) : outputConfig?.blackmagicDevice ? (
                    <option value={outputConfig.blackmagicDevice}>
                      {outputConfig.blackmagicDevice} (Guardada)
                    </option>
                  ) : (
                    <option value="" disabled>No se detectó ninguna tarjeta</option>
                  )}
                </select>
              </div>

              {/* Selector de norma soportada */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <label style={{ fontSize: 11.5, fontWeight: 500, color: 'var(--color-ink)' }}>
                    Formato de Emisión:
                  </label>
                  {isChannelOnAir && (
                    <span style={{ fontSize: 10, color: 'var(--color-danger)', fontWeight: 600 }}>
                      Bloqueado al aire
                    </span>
                  )}
                </div>
                <select
                  value={selectedFormat || ''}
                  onChange={(e) => setSelectedFormat(e.target.value)}
                  disabled={isChannelOnAir || isApplying}
                  title={isChannelOnAir ? 'No se puede cambiar la norma mientras el canal está al aire' : 'Seleccione norma soportada por la tarjeta'}
                  style={{
                    background: isChannelOnAir ? 'rgba(255, 69, 58, 0.08)' : 'var(--color-field, var(--bg-surface))',
                    border: isChannelOnAir ? '1px solid var(--color-danger)' : '1px solid var(--color-hairline, var(--border-subtle))',
                    borderRadius: 'var(--radius-sm, 6px)',
                    padding: '8px 10px',
                    color: 'var(--color-ink)',
                    fontSize: 12,
                    outline: 'none',
                    cursor: isChannelOnAir ? 'not-allowed' : 'pointer'
                  }}
                >
                  {!selectedFormat && <option value="" disabled>Sin configurar</option>}
                  {supportedStandards.map((std) => (
                    <option key={std} value={std}>
                      {std}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Botón de Aplicar y Reiniciar Salida */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 4 }}>
              <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                {isChannelOnAir ? (
                  <span style={{ color: 'var(--color-warning)' }}>
                    Canal al aire. Detenga la emisión antes de cambiar la norma.
                  </span>
                ) : (
                  <span>Aplica el cambio directamente en la salida de video.</span>
                )}
              </div>

              <button
                type="button"
                onClick={handleApply}
                disabled={isChannelOnAir || isApplying || !selectedFormat || selectedFormat === activeProfileReal}
                style={{
                  background: (isChannelOnAir || !selectedFormat || selectedFormat === activeProfileReal)
                    ? 'rgba(255, 255, 255, 0.08)'
                    : 'var(--color-primary)',
                  color: (isChannelOnAir || !selectedFormat || selectedFormat === activeProfileReal)
                    ? 'var(--color-text-muted)'
                    : '#ffffff',
                  border: 'none',
                  borderRadius: 'var(--radius-sm, 6px)',
                  padding: '7px 14px',
                  fontSize: 11.5,
                  fontWeight: 600,
                  cursor: (isChannelOnAir || !selectedFormat || selectedFormat === activeProfileReal || isApplying) ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6
                }}
              >
                <RefreshCw size={13} className={isApplying ? 'spin' : ''} />
                <span>{isApplying ? 'Aplicando...' : 'Aplicar y Reiniciar Salida'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '12px 22px',
          borderTop: '1px solid var(--color-hairline, var(--border-subtle))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'var(--color-canvas-soft, var(--bg-surface))'
        }}>
          <button
            type="button"
            onClick={scanHardware}
            disabled={isScanning}
            className="modal-btn-outline"
            style={{
              padding: '6px 12px',
              fontSize: 11.5,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: 'transparent',
              border: '1px solid var(--color-hairline)',
              borderRadius: 6,
              cursor: isScanning ? 'not-allowed' : 'pointer',
              color: 'var(--color-ink)'
            }}
          >
            <RefreshCw size={13} className={isScanning ? 'spin' : ''} />
            <span>{isScanning ? 'Consultando...' : 'Re-escanear COM'}</span>
          </button>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {/* Botón Probar Señal con Confirmación */}
            {showConfirmTest ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 11, color: 'var(--color-warning)' }}>¿Emitir barras?</span>
                <button
                  type="button"
                  onClick={handleExecuteTest}
                  style={{
                    background: 'var(--color-warning, #ff9f0a)',
                    color: '#000',
                    border: 'none',
                    borderRadius: 6,
                    padding: '5px 10px',
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Confirmar
                </button>
                <button
                  type="button"
                  onClick={() => setShowConfirmTest(false)}
                  style={{
                    background: 'transparent',
                    border: '1px solid var(--color-hairline)',
                    color: 'var(--color-text-muted)',
                    borderRadius: 6,
                    padding: '5px 8px',
                    fontSize: 11,
                    cursor: 'pointer'
                  }}
                >
                  Cancelar
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  if (hasActiveOutput) {
                    setShowConfirmTest(true);
                  } else {
                    handleExecuteTest();
                  }
                }}
                disabled={isTesting || isChannelOnAir}
                title={isChannelOnAir ? 'Bloqueado mientras el canal está al aire' : 'Emitir barras de calibración SMPTE de prueba'}
                style={{
                  padding: '6px 14px',
                  fontSize: 11.5,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  background: isChannelOnAir ? 'rgba(255, 255, 255, 0.05)' : 'var(--color-field)',
                  border: '1px solid var(--color-hairline)',
                  borderRadius: 6,
                  cursor: (isTesting || isChannelOnAir) ? 'not-allowed' : 'pointer',
                  color: isChannelOnAir ? 'var(--color-text-muted)' : 'var(--color-ink)'
                }}
              >
                <Activity size={13} className={isTesting ? 'spin' : ''} />
                <span>{isTesting ? 'Verificando...' : 'Probar Señal (SMPTE)'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '6px 16px',
                fontSize: 11.5,
                background: 'var(--color-canvas, var(--bg-surface))',
                border: '1px solid var(--color-hairline)',
                borderRadius: 6,
                cursor: 'pointer',
                color: 'var(--color-ink)'
              }}
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
