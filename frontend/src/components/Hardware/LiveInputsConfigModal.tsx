import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { api } from '../../services/api';
import { useDeckLink } from '../../hooks/useDeckLink';
import { useNdi } from '../../hooks/useNdi';
import { ErrorAlertBanner } from '../Common/ErrorAlertBanner';
import {
  Video,
  X,
  Radio,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Globe,
  Check
} from 'lucide-react';

interface LiveInputsConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const LiveInputsConfigModal: React.FC<LiveInputsConfigModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const {
    inputs: sdiInputs,
    scanResult: decklinkScan,
    status: decklinkStatus,
    refreshData: refreshSdi,
    isScanning: isScanningSdi
  } = useDeckLink({ autoFetch: isOpen });

  const {
    ndiSources,
    selectedSource: selectedNdi,
    scanSources: scanNdi,
    selectSource: selectNdiSource
  } = useNdi({ autoFetch: isOpen });

  const [activeTab, setActiveTab] = useState<'SDI' | 'NDI'>('SDI');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSelectingNdi, setIsSelectingNdi] = useState(false);

  // Estado del formulario SDI: index numérico de tarjeta real
  const [selectedDeviceIndex, setSelectedDeviceIndex] = useState<number>(0);
  const [selectedConnector, setSelectedConnector] = useState<string>('SDI In 1');
  const [autoDetectFormat, setAutoDetectFormat] = useState<boolean>(true);
  const [manualFormat, setManualFormat] = useState<string>('1080i59.94');

  // Dispositivos reales confirmados por el SDK con id estable
  const realDevices = useMemo(() => {
    return decklinkScan?.devices || [];
  }, [decklinkScan?.devices]);

  // Entrada SDI por defecto actual guardada en SQLite
  const defaultSdiInput = useMemo(() => {
    return sdiInputs.find(i => i.is_default === 1) || sdiInputs[0] || null;
  }, [sdiInputs]);

  // Lista de dispositivos presentados en el dropdown (incluyendo el guardado si no hay scan activo)
  const displayDevices = useMemo(() => {
    if (realDevices.length > 0) return realDevices;
    if (defaultSdiInput?.device_name) {
      return [{
        id: defaultSdiInput.device_id || 'saved-device',
        name: defaultSdiInput.device_name,
        inputConnectors: defaultSdiInput.connector ? [defaultSdiInput.connector] : ['SDI In 1']
      }];
    }
    return [];
  }, [realDevices, defaultSdiInput]);

  const selectedDevice = useMemo(() => {
    if (displayDevices.length === 0) return null;
    return displayDevices[selectedDeviceIndex] || displayDevices[0];
  }, [displayDevices, selectedDeviceIndex]);

  // Conectores reales confirmados con capacidad de captura del dispositivo seleccionado
  const availableConnectors = useMemo(() => {
    if (!selectedDevice) return [];
    if (selectedDevice.inputConnectors && selectedDevice.inputConnectors.length > 0) {
      return selectedDevice.inputConnectors;
    }
    return defaultSdiInput?.connector ? [defaultSdiInput.connector] : ['SDI In 1'];
  }, [selectedDevice, defaultSdiInput]);

  // Ref para inicialización determinista evitando sobrescribir selecciones del operador
  const initializedRef = React.useRef(false);

  useEffect(() => {
    if (!isOpen) {
      initializedRef.current = false;
      return;
    }

    if (initializedRef.current) return;

    if (defaultSdiInput && displayDevices.length > 0) {
      const foundIdx = displayDevices.findIndex(d => 
        (defaultSdiInput.device_id && d.id === defaultSdiInput.device_id) ||
        d.name === defaultSdiInput.device_name
      );

      if (foundIdx >= 0) {
        setSelectedDeviceIndex(foundIdx);
        const targetDev = displayDevices[foundIdx];
        const validConnectors = targetDev.inputConnectors || [];
        if (validConnectors.includes(defaultSdiInput.connector)) {
          setSelectedConnector(defaultSdiInput.connector);
        } else if (validConnectors.length > 0) {
          setSelectedConnector(validConnectors[0]);
        } else {
          setSelectedConnector(defaultSdiInput.connector || 'SDI In 1');
        }
        setAutoDetectFormat(Boolean(defaultSdiInput.auto_detect));
        if (defaultSdiInput.format && defaultSdiInput.format !== 'Auto-Detect') {
          setManualFormat(defaultSdiInput.format);
        }
        initializedRef.current = true;
      }
    } else if (!defaultSdiInput && displayDevices.length > 0) {
      setSelectedDeviceIndex(0);
      const firstConnectors = displayDevices[0]?.inputConnectors || [];
      setSelectedConnector(firstConnectors[0] ?? 'SDI In 1');
      initializedRef.current = true;
    }
  }, [isOpen, defaultSdiInput, displayDevices]);

  // Si cambia el dispositivo seleccionado, actualizar conector validado
  const handleDeviceChange = (newIdx: number) => {
    setSelectedDeviceIndex(newIdx);
    const targetDev = displayDevices[newIdx];
    const connectors = targetDev?.inputConnectors ?? [];
    setSelectedConnector(connectors[0] ?? 'SDI In 1');
  };

  // Manejo de tecla Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSaving && !isSelectingNdi) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, isSaving, isSelectingNdi]);

  // Telemetría vinculada al dispositivo y conector activo
  const selectedInputStatus = useMemo(() => {
    if (!decklinkStatus?.inputs || !selectedDevice) return null;
    return decklinkStatus.inputs.find(
      input =>
        (input.deviceId === selectedDevice.id || input.deviceId === selectedDevice.name) &&
        input.connector === selectedConnector
    ) || null;
  }, [decklinkStatus?.inputs, selectedDevice, selectedConnector]);

  // Si el backend reporta telemetría granular por conector se usa; si no, fallback seguro al estado global
  const isInputDetected = selectedInputStatus
    ? selectedInputStatus.signalPresent
    : Boolean(decklinkStatus?.sdiInputDetected);
  const isCapturing = selectedInputStatus
    ? selectedInputStatus.capturing
    : false;
  const detectedFormat = selectedInputStatus
    ? selectedInputStatus.detectedFormat
    : (decklinkStatus?.detectedInputFormat || null);

  const handleSaveSdiDefault = async () => {
    if (!selectedDevice) {
      setErrorMessage('No hay ninguna tarjeta DeckLink física conectada para configurar entradas.');
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      // ID determinista y libre de colisiones utilizando device.id estable y conector
      const connectorSlug = selectedConnector ? selectedConnector.toLowerCase().replace(/[^a-z0-9]+/g, '-') : 'in-1';
      const devSlug = selectedDevice.id ? selectedDevice.id.toLowerCase().replace(/[^a-z0-9]+/g, '-') : `dev${selectedDeviceIndex}`;
      const inputId = `sdi-${devSlug}-${connectorSlug}`;

      await api.saveHardwareInput({
        id: inputId,
        type: 'SDI',
        name: `${selectedDevice.name} (${selectedConnector || 'SDI In'})`,
        device_id: selectedDevice.id,
        device_name: selectedDevice.name,
        connector: selectedConnector,
        format: autoDetectFormat ? 'Auto-Detect' : manualFormat,
        audio_channels: 'EMBEDDED_SDI',
        auto_detect: autoDetectFormat ? 1 : 0,
        is_default: 1,
        is_enabled: 1
      });

      setSuccessMessage(`Entrada de captura SDI establecida como predeterminada: ${selectedDevice.name} (${selectedConnector})`);
      await refreshSdi();
      onSuccess?.();
    } catch (err: any) {
      setErrorMessage(`Error al guardar configuración de entrada SDI: ${err.message || err}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSelectNdiDefault = async (sourceId: string) => {
    if (isSelectingNdi) return;
    setIsSelectingNdi(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      await selectNdiSource(sourceId);
      setSuccessMessage('Fuente NDI configurada como entrada de red predeterminada.');
      onSuccess?.();
    } catch (err: any) {
      setErrorMessage(`Error al seleccionar fuente NDI: ${err.message || err}`);
    } finally {
      setIsSelectingNdi(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="live-inputs-title"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.72)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: 16,
        backdropFilter: 'blur(3px)'
      }}
    >
      <div
        className="modal-container"
        style={{
          width: '100%',
          maxWidth: 620,
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
        {/* Encabezado */}
        <div style={{
          padding: '16px 20px',
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
              <Video size={20} />
            </div>
            <div>
              <h2
                id="live-inputs-title"
                style={{ margin: 0, fontSize: 15.5, fontWeight: 600, color: 'var(--color-ink, var(--text-primary))' }}
              >
                Entradas de Vivo (SDI / NDI)
              </h2>
              <div style={{ fontSize: 11, color: 'var(--color-text-muted, var(--text-tertiary))', marginTop: 1 }}>
                Selecciona la señal de entrada para cuando uses transmisiones en vivo
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSaving || isSelectingNdi}
            aria-label="Cerrar ventana"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--color-text-muted, var(--text-tertiary))',
              cursor: (isSaving || isSelectingNdi) ? 'not-allowed' : 'pointer',
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

        {/* Pestañas SDI / NDI */}
        <div style={{
          padding: '10px 20px 0',
          display: 'flex',
          gap: 8,
          background: 'var(--color-canvas, var(--bg-app))',
          borderBottom: '1px solid var(--color-hairline, var(--border-subtle))'
        }}>
          <button
            onClick={() => setActiveTab('SDI')}
            style={{
              padding: '8px 16px',
              background: 'transparent',
              border: 'none',
              borderBottom: `2px solid ${activeTab === 'SDI' ? 'var(--color-primary, #0b57d0)' : 'transparent'}`,
              color: activeTab === 'SDI' ? 'var(--color-ink, var(--text-primary))' : 'var(--color-text-muted, var(--text-tertiary))',
              fontSize: 12.5,
              fontWeight: activeTab === 'SDI' ? 600 : 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 7
            }}
          >
            <Radio size={15} />
            <span>Entrada SDI / Hardware</span>
          </button>
          <button
            onClick={() => setActiveTab('NDI')}
            style={{
              padding: '8px 16px',
              background: 'transparent',
              border: 'none',
              borderBottom: `2px solid ${activeTab === 'NDI' ? 'var(--color-primary, #0b57d0)' : 'transparent'}`,
              color: activeTab === 'NDI' ? 'var(--color-ink, var(--text-primary))' : 'var(--color-text-muted, var(--text-tertiary))',
              fontSize: 12.5,
              fontWeight: activeTab === 'NDI' ? 600 : 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 7
            }}
          >
            <Globe size={15} />
            <span>Entrada NDI (Red IP)</span>
          </button>
        </div>

        {/* Cuerpo del modal */}
        <div style={{
          padding: '18px 20px',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          background: 'var(--color-canvas, var(--bg-app))'
        }}>
          {errorMessage && (
            <ErrorAlertBanner
              title="Aviso de Entrada"
              message={errorMessage}
              onDismiss={() => setErrorMessage(null)}
            />
          )}

          {successMessage && (
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
              <span>{successMessage}</span>
            </div>
          )}

          {activeTab === 'SDI' ? (
            <>
              {/* Telemetría en Vivo de la Entrada */}
              <div style={{
                background: 'var(--color-field, rgba(255, 255, 255, 0.04))',
                border: '1px solid var(--color-hairline, rgba(255, 255, 255, 0.08))',
                borderRadius: 'var(--radius-lg, 12px)',
                padding: '12px 14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    background: isInputDetected ? 'var(--color-success, #34c759)' : 'var(--color-text-muted, #8e8e93)',
                    boxShadow: isInputDetected ? '0 0 8px rgba(52, 199, 89, 0.6)' : 'none'
                  }} />
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-ink, var(--text-primary))', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span>{isInputDetected ? 'Señal de Entrada Presente' : 'Sin Señal en la Entrada'}</span>
                      {isCapturing && (
                        <span style={{
                          fontSize: 10,
                          fontWeight: 700,
                          padding: '1px 5px',
                          borderRadius: 4,
                          background: 'rgba(52, 199, 89, 0.2)',
                          color: 'var(--color-success, #34c759)',
                          border: '1px solid rgba(52, 199, 89, 0.4)'
                        }}>
                          CAPTURANDO
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--color-text-muted, var(--text-tertiary))' }}>
                      {isInputDetected && detectedFormat
                        ? `Norma Reportada por Hardware: ${detectedFormat}`
                        : 'Conecte un cable SDI con señal válida al conector de entrada'}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => refreshSdi()}
                  disabled={isScanningSdi}
                  title="Actualizar estado de hardware"
                  style={{
                    background: 'transparent',
                    border: '1px solid var(--color-hairline, rgba(255, 255, 255, 0.12))',
                    borderRadius: 'var(--radius-sm, 6px)',
                    color: 'var(--color-ink, var(--text-primary))',
                    padding: '6px 10px',
                    fontSize: 11,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    cursor: isScanningSdi ? 'not-allowed' : 'pointer'
                  }}
                >
                  <RefreshCw size={13} className={isScanningSdi ? 'spin' : ''} />
                  <span>Sondear</span>
                </button>
              </div>

              {/* Selector de Tarjeta Física */}
              <div>
                <label style={{ display: 'block', fontSize: 11.5, fontWeight: 600, marginBottom: 6, color: 'var(--color-ink, var(--text-primary))' }}>
                  Tarjeta de Captura
                </label>
                {displayDevices.length > 0 ? (
                  <select
                    value={selectedDeviceIndex}
                    onChange={(e) => handleDeviceChange(Number(e.target.value))}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      background: 'var(--color-field, rgba(255, 255, 255, 0.05))',
                      border: '1px solid var(--color-hairline, rgba(255, 255, 255, 0.12))',
                      borderRadius: 'var(--radius-md, 8px)',
                      color: 'var(--color-ink, var(--text-primary))',
                      fontSize: 12.5
                    }}
                  >
                    {displayDevices.map((dev, idx) => (
                      <option key={`${dev.name}-${idx}`} value={idx}>
                        Tarjeta #{idx + 1}: {dev.name} {realDevices.length === 0 ? '(Guardada)' : ''}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div style={{
                    padding: '10px 12px',
                    borderRadius: 'var(--radius-md, 8px)',
                    background: 'var(--color-field, rgba(255, 255, 255, 0.03))',
                    border: '1px solid var(--color-hairline, rgba(255, 255, 255, 0.08))',
                    fontSize: 12,
                    color: 'var(--color-warning, #ff9f0a)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8
                  }}>
                    <AlertTriangle size={15} />
                    <span>No hay tarjetas conectadas en el equipo.</span>
                  </div>
                )}
              </div>

              {/* Selector de Conector Físico */}
              <div>
                <label style={{ display: 'block', fontSize: 11.5, fontWeight: 600, marginBottom: 6, color: 'var(--color-ink, var(--text-primary))' }}>
                  Conector de Entrada
                </label>
                <select
                  value={selectedConnector}
                  onChange={(e) => setSelectedConnector(e.target.value)}
                  disabled={displayDevices.length === 0 || availableConnectors.length === 0}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    background: 'var(--color-field, rgba(255, 255, 255, 0.05))',
                    border: '1px solid var(--color-hairline, rgba(255, 255, 255, 0.12))',
                    borderRadius: 'var(--radius-md, 8px)',
                    color: 'var(--color-ink, var(--text-primary))',
                    fontSize: 12.5,
                    opacity: (displayDevices.length === 0 || availableConnectors.length === 0) ? 0.6 : 1
                  }}
                >
                  {availableConnectors.length > 0 ? (
                    availableConnectors.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))
                  ) : (
                    <option value="">(Sin conectores de entrada de captura)</option>
                  )}
                </select>
              </div>

              {/* Modo de Detección de Norma */}
              <div>
                <label style={{ display: 'block', fontSize: 11.5, fontWeight: 600, marginBottom: 6, color: 'var(--color-ink, var(--text-primary))' }}>
                  Formato de la Señal
                </label>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 8 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--color-ink, var(--text-primary))', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={autoDetectFormat}
                      onChange={(e) => setAutoDetectFormat(e.target.checked)}
                    />
                    <span>Detectar formato automáticamente</span>
                  </label>
                </div>

                {!autoDetectFormat && (
                  <select
                    value={manualFormat}
                    onChange={(e) => setManualFormat(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      background: 'var(--color-field, rgba(255, 255, 255, 0.05))',
                      border: '1px solid var(--color-hairline, rgba(255, 255, 255, 0.12))',
                      borderRadius: 'var(--radius-md, 8px)',
                      color: 'var(--color-ink, var(--text-primary))',
                      fontSize: 12
                    }}
                  >
                    <option value="1080i59.94">1080i 59.94 (Estándar)</option>
                    <option value="1080i50">1080i 50</option>
                    <option value="1080p29.97">1080p 29.97</option>
                    <option value="1080p25">1080p 25</option>
                    <option value="720p59.94">720p 59.94</option>
                    <option value="720p50">720p 50</option>
                  </select>
                )}
              </div>

              {/* Botón de Guardar Ajustes SDI */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 8 }}>
                <button
                  onClick={handleSaveSdiDefault}
                  disabled={isSaving || displayDevices.length === 0}
                  style={{
                    padding: '9px 18px',
                    borderRadius: 'var(--radius-md, 8px)',
                    background: displayDevices.length === 0 ? 'var(--color-field, #2c2c2e)' : 'var(--color-primary, #0b57d0)',
                    color: '#fff',
                    border: 'none',
                    fontWeight: 600,
                    fontSize: 12,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    cursor: (isSaving || displayDevices.length === 0) ? 'not-allowed' : 'pointer'
                  }}
                >
                  <Check size={14} />
                  <span>{isSaving ? 'Guardando...' : 'Establecer como Entrada Predeterminada'}</span>
                </button>
              </div>
            </>
          ) : (
            <>
              {/* Sección NDI */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-ink, var(--text-primary))' }}>
                  Fuentes NDI Detectadas en la Red Local
                </div>
                <button
                  onClick={() => scanNdi()}
                  style={{
                    background: 'transparent',
                    border: '1px solid var(--color-hairline, rgba(255, 255, 255, 0.12))',
                    borderRadius: 'var(--radius-sm, 6px)',
                    color: 'var(--color-ink, var(--text-primary))',
                    padding: '5px 9px',
                    fontSize: 11,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    cursor: 'pointer'
                  }}
                >
                  <RefreshCw size={12} />
                  <span>Escanear Red NDI</span>
                </button>
              </div>

              {ndiSources.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 240, overflowY: 'auto' }}>
                  {ndiSources.map((src) => {
                    const isSelected = selectedNdi?.id === src.id;
                    return (
                      <div
                        key={src.id}
                        onClick={() => handleSelectNdiDefault(src.id)}
                        style={{
                          padding: '10px 14px',
                          borderRadius: 'var(--radius-md, 8px)',
                          background: isSelected ? 'var(--color-accent-subtle, rgba(11, 87, 208, 0.15))' : 'var(--color-field, rgba(255, 255, 255, 0.04))',
                          border: `1px solid ${isSelected ? 'var(--color-primary, #0b57d0)' : 'var(--color-hairline, rgba(255, 255, 255, 0.08))'}`,
                          cursor: isSelectingNdi ? 'not-allowed' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between'
                        }}
                      >
                        <div>
                          <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--color-ink, var(--text-primary))' }}>
                            {src.name}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--color-text-muted, var(--text-tertiary))' }}>
                            {src.ip_address}:{src.port} • Formato: {src.format || 'Auto'}
                          </div>
                        </div>
                        {isSelected && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--color-primary, #0b57d0)', fontWeight: 600 }}>
                            <Check size={14} />
                            <span>Predeterminada</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={{
                  padding: '24px 16px',
                  textAlign: 'center',
                  background: 'var(--color-field, rgba(255, 255, 255, 0.02))',
                  border: '1px dashed var(--color-hairline, rgba(255, 255, 255, 0.12))',
                  borderRadius: 'var(--radius-md, 10px)',
                  color: 'var(--color-text-muted, var(--text-tertiary))',
                  fontSize: 12
                }}>
                  No se han detectado fuentes NDI en la red local.
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
