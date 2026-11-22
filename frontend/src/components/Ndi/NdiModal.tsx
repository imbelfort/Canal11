import React, { useState } from 'react';
import { useNdi } from '../../hooks/useNdi';
import { ErrorAlertBanner } from '../Common/ErrorAlertBanner';
import { NdiPreviewPlayer } from './NdiPreviewPlayer';
import {
  Globe, Network, RefreshCw, X, Download, Laptop, Check, CheckCircle2,
  Trash2, Activity, Eye, Plus, Radio, ShieldCheck, Server
} from 'lucide-react';

interface NdiModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NdiModal: React.FC<NdiModalProps> = ({ isOpen, onClose }) => {
  const {
    ndiStatus,
    ndiSources,
    selectedSource,
    isScanning,
    isInstalling,
    pingResults,
    errorMessage,
    setErrorMessage,
    refreshData,
    scanSources,
    selectSource,
    pingSource,
    saveManualSource,
    deleteSource,
    clearOfflineSources,
    installRuntime,
    refreshPreview
  } = useNdi({ autoFetch: isOpen });

  const [activeTab, setActiveTab] = useState<'SOURCES' | 'PREVIEW' | 'ADD_MANUAL' | 'RUNTIME'>('SOURCES');

  // Formulario para agregar fuente NDI manual
  const [newNdiName, setNewNdiName] = useState('');
  const [newNdiMachine, setNewNdiMachine] = useState('');
  const [newNdiStream, setNewNdiStream] = useState('Output 1');
  const [newNdiIp, setNewNdiIp] = useState('');
  const [newNdiPort, setNewNdiPort] = useState('5961');
  const [newNdiFormat, setNewNdiFormat] = useState('Auto-Detect');

  if (!isOpen) return null;

  const handleAddManualSubmit = async () => {
    if (!newNdiName.trim() || !newNdiIp.trim()) return;
    await saveManualSource({
      name: newNdiName.trim(),
      machine_name: newNdiMachine.trim() || 'HOST-REMOTO',
      stream_name: newNdiStream.trim() || 'Output 1',
      ip_address: newNdiIp.trim(),
      port: parseInt(newNdiPort, 10) || 5961,
      format: newNdiFormat,
      source_type: 'MANUAL'
    });
    setNewNdiName('');
    setNewNdiMachine('');
    setNewNdiIp('');
    setActiveTab('SOURCES');
  };

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
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '92vw',
          maxWidth: 920,
          maxHeight: '88vh',
          borderRadius: 24
        }}
      >
        {/* Header Material Design 3 */}
        <div className="m3-dialog-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              background: 'var(--color-accent-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-primary)',
              flexShrink: 0
            }}>
              <Globe size={22} />
            </div>
            <div>
              <h2 className="m3-headline-small" style={{ fontSize: 16, fontWeight: 600 }}>
                Configuración de Red NDI 6 (IP Broadcast & Fuentes LAN)
              </h2>
              <p style={{ margin: '3px 0 0 0', fontSize: 11.5, color: 'var(--color-text-muted)', lineHeight: 1.3 }}>
                Gestión de flujo maestro NDI, escaneo mDNS y recepción de señales en vivo sobre red local
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="m3-icon-button"
            title="Cerrar ventana"
          >
            <X size={20} />
          </button>
        </div>

        {/* Primary Tabs Material Design 3 */}
        <div className="m3-primary-tabs">
          <button
            className={`m3-tab-item ${activeTab === 'SOURCES' ? 'active' : ''}`}
            onClick={() => setActiveTab('SOURCES')}
          >
            <Radio size={16} />
            <span>Fuentes NDI en Red LAN ({ndiSources.length})</span>
            {activeTab === 'SOURCES' && <div className="m3-tab-indicator" />}
          </button>

          <button
            className={`m3-tab-item ${activeTab === 'PREVIEW' ? 'active' : ''}`}
            onClick={() => setActiveTab('PREVIEW')}
          >
            <Eye size={16} />
            <span>Monitor de Previsualización</span>
            {activeTab === 'PREVIEW' && <div className="m3-tab-indicator" />}
          </button>

          <button
            className={`m3-tab-item ${activeTab === 'ADD_MANUAL' ? 'active' : ''}`}
            onClick={() => setActiveTab('ADD_MANUAL')}
          >
            <Plus size={16} />
            <span>Agregar Fuente Manual / Subred</span>
            {activeTab === 'ADD_MANUAL' && <div className="m3-tab-indicator" />}
          </button>

          <button
            className={`m3-tab-item ${activeTab === 'RUNTIME' ? 'active' : ''}`}
            onClick={() => setActiveTab('RUNTIME')}
          >
            <Network size={16} />
            <span>NDI 6 SDK & Emisión Master</span>
            {activeTab === 'RUNTIME' && <div className="m3-tab-indicator" />}
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '24px 28px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 18 }}>
          {errorMessage && (
            <ErrorAlertBanner
              title="Aviso de Red NDI"
              message={errorMessage}
              onRetry={refreshData}
              onDismiss={() => setErrorMessage(null)}
            />
          )}

          {/* TAB 1: FUENTES NDI EN RED LAN */}
          {activeTab === 'SOURCES' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Barra de escaneo mDNS */}
              <div style={{
                background: 'var(--color-canvas)',
                border: '1px solid var(--color-hairline)',
                borderRadius: '16px',
                padding: '14px 18px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 12,
                flexWrap: 'wrap'
              }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-ink)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Globe size={15} color="var(--color-primary)" />
                    <span>Detección Automática mDNS (Red LAN)</span>
                  </div>
                  <div style={{ fontSize: 11.5, color: 'var(--color-text-muted)', marginTop: 2 }}>
                    Escanea transmisores vMix, OBS, tricaster, cámaras PTZ, encoders NewTek/Kiloview o móviles IP en la subred.
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {ndiSources.length > 0 && (
                    <button
                      className="m3-btn-tonal"
                      style={{ height: 34, padding: '0 12px', fontSize: 11.5, color: 'var(--color-warning)' }}
                      onClick={async () => {
                        const res = await clearOfflineSources();
                        if (res && res.removedCount > 0) {
                          setErrorMessage(`Se eliminaron ${res.removedCount} fuente(s) NDI sin conexión.`);
                        }
                      }}
                      title="Prueba y retira fuentes que ya no responden en la red"
                    >
                      <Trash2 size={12} />
                      <span>Limpiar desconectadas</span>
                    </button>
                  )}

                  <button
                    className="m3-btn-filled"
                    onClick={scanSources}
                    disabled={isScanning}
                    style={{ height: 34, padding: '0 16px', fontSize: 12 }}
                  >
                    <RefreshCw size={13} className={isScanning ? 'spin' : ''} />
                    <span>{isScanning ? 'Escaneando red...' : 'Escanear Red NDI'}</span>
                  </button>
                </div>
              </div>

              {/* Listado de Fuentes NDI Disponibles */}
              <div style={{
                background: 'var(--color-canvas)',
                border: '1px solid var(--color-hairline)',
                borderRadius: '16px',
                padding: '16px 18px',
                display: 'flex',
                flexDirection: 'column',
                gap: 12
              }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-ink-soft)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                  Fuentes Registradas y Activas ({ndiSources.length})
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {ndiSources.length === 0 ? (
                    <div style={{
                      textAlign: 'center',
                      color: 'var(--color-text-muted)',
                      fontSize: 12,
                      padding: '32px 16px',
                      background: 'var(--color-field)',
                      borderRadius: '12px',
                      border: '1px dashed var(--color-hairline)'
                    }}>
                      No se detectaron fuentes NDI activas en la red local. Inicie un emisor (vMix/OBS) o agregue una fuente manual en la pestaña correspondiente.
                    </div>
                  ) : (
                    ndiSources.map((src) => {
                      const isSelected = selectedSource?.id === src.id;
                      const ping = pingResults[src.id];
                      const isOffline = ping?.status === 'error';

                      return (
                        <div
                          key={src.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '12px 16px',
                            background: isSelected
                              ? 'var(--color-accent-subtle)'
                              : isOffline
                                ? 'rgba(186, 26, 26, 0.05)'
                                : 'var(--color-field)',
                            border: `1px solid ${
                              isSelected
                                ? 'var(--color-primary)'
                                : isOffline
                                  ? 'rgba(186, 26, 26, 0.3)'
                                  : 'var(--color-hairline)'
                            }`,
                            borderRadius: '14px',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div style={{
                              width: 36,
                              height: 36,
                              borderRadius: '50%',
                              background: isSelected ? 'var(--color-primary)' : 'var(--color-canvas)',
                              color: isSelected ? 'var(--color-on-primary)' : (isOffline ? 'var(--color-live)' : 'var(--color-ink-soft)'),
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0
                            }}>
                              <Laptop size={18} />
                            </div>

                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-ink)' }}>
                                  {src.name}
                                </span>
                                {isSelected && (
                                  <span className="m3-assist-chip online" style={{ fontSize: 9.5, padding: '2px 8px' }}>
                                    ACTIVA PARA EMISIÓN
                                  </span>
                                )}
                                {isOffline ? (
                                  <span className="m3-assist-chip offline" style={{ fontSize: 9, padding: '2px 6px' }}>
                                    SIN CONEXIÓN
                                  </span>
                                ) : (
                                  <span className="badge-status next" style={{ fontSize: 9 }}>
                                    {src.source_type}
                                  </span>
                                )}
                              </div>

                              <div style={{ fontSize: 11, color: 'var(--color-text-muted)', fontFamily: 'var(--font-family-mono)', marginTop: 3 }}>
                                Host: <strong>{src.machine_name}</strong> • Stream: <strong>{src.stream_name}</strong> • IP: <strong>{src.ip_address}:{src.port}</strong> • ({src.format})
                              </div>
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            {ping ? (
                              <span
                                style={{
                                  fontSize: 10.5,
                                  fontFamily: 'var(--font-family-mono)',
                                  color: ping.status === 'ok' ? 'var(--color-success)' : ping.status === 'testing' ? 'var(--color-warning)' : 'var(--color-live)'
                                }}
                              >
                                {ping.msg}
                              </span>
                            ) : (
                              <button
                                className="m3-btn-tonal"
                                style={{ height: 28, padding: '0 10px', fontSize: 11 }}
                                onClick={() => pingSource(src)}
                                title="Verificar latencia de conexión de red"
                              >
                                <Activity size={11} />
                                <span>Ping</span>
                              </button>
                            )}

                            {!isSelected ? (
                              <button
                                className="m3-btn-tonal"
                                style={{ height: 30, padding: '0 12px', fontSize: 11.5, color: 'var(--color-primary)' }}
                                onClick={() => selectSource(src.id)}
                                disabled={isOffline}
                                title={isOffline ? "Fuente sin conexión de red" : "Seleccionar esta fuente para el playout"}
                              >
                                <Check size={12} />
                                <span>Seleccionar</span>
                              </button>
                            ) : (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--color-primary)', fontSize: 11.5, fontWeight: 600 }}>
                                <CheckCircle2 size={15} />
                                <span>Seleccionada</span>
                              </div>
                            )}

                            <button
                              className="m3-btn-tonal"
                              style={{ height: 28, padding: '0 8px', color: 'var(--color-live)' }}
                              onClick={() => deleteSource(src.id)}
                              title="Eliminar fuente de la lista"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: MONITOR DE PREVISUALIZACIÓN NDI */}
          {activeTab === 'PREVIEW' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{
                background: 'var(--color-canvas)',
                border: '1px solid var(--color-hairline)',
                borderRadius: '16px',
                padding: '16px 18px',
                display: 'flex',
                flexDirection: 'column',
                gap: 12
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Eye size={16} color="var(--color-primary)" />
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-ink)' }}>
                      {selectedSource
                        ? `Previsualización en Vivo: ${selectedSource.name}`
                        : 'Sin fuente NDI seleccionada'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {ndiSources.length > 1 && (
                      <select
                        className="m3-outlined-control"
                        style={{ height: 26, fontSize: 11, padding: '2px 8px', width: 'auto' }}
                        value={selectedSource?.id || ''}
                        onChange={(e) => selectSource(e.target.value)}
                        title="Cambiar fuente para previsualizar"
                      >
                        {ndiSources.map(s => (
                          <option key={s.id} value={s.id}>
                            {s.name} ({s.ip_address})
                          </option>
                        ))}
                      </select>
                    )}
                    {selectedSource && (
                      <span className="m3-assist-chip online" style={{ fontSize: 10, padding: '2px 8px' }}>
                        RECEPTOR EN LÍNEA
                      </span>
                    )}
                  </div>
                </div>

                <div style={{
                  padding: '7px 12px',
                  borderRadius: '10px',
                  background: 'var(--color-field)',
                  border: '1px solid var(--color-hairline)',
                  fontSize: 11,
                  color: 'var(--color-text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8
                }}>
                  <Activity size={13} color="var(--color-primary)" />
                  <span>
                    <strong>Monitor optimizado:</strong> Muestreo liviano de verificación (5 FPS • Reducción Bilineal). Funciona de forma 100% independiente para no sobrecargar el procesador ni afectar la señal de emisión.
                  </span>
                </div>

                <div style={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--color-hairline)' }}>
                  <NdiPreviewPlayer
                    sourceQuery={selectedSource?.name || selectedSource?.ip_address}
                    sourceName={selectedSource?.name}
                    sourceMachine={selectedSource?.machine_name}
                    sourceIp={selectedSource?.ip_address}
                    sourcePort={selectedSource?.port}
                    format={selectedSource?.format}
                    height={280}
                    showOverlay={true}
                    onRefresh={refreshPreview}
                  />
                </div>

                {selectedSource && (
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: 'var(--color-field)',
                    padding: '8px 14px',
                    borderRadius: '10px',
                    fontSize: 11.5,
                    color: 'var(--color-text-muted)',
                    fontFamily: 'var(--font-family-mono)'
                  }}>
                    <span>Flujo: <strong>{selectedSource.stream_name}</strong></span>
                    <span>Dirección: <strong>{selectedSource.ip_address}:{selectedSource.port}</strong></span>
                    <span>Norma: <strong>{selectedSource.format || '1080i59.94'}</strong></span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: AGREGAR FUENTE NDI MANUAL */}
          {activeTab === 'ADD_MANUAL' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{
                background: 'var(--color-canvas)',
                border: '1px solid var(--color-hairline)',
                borderRadius: '16px',
                padding: '18px 20px',
                display: 'flex',
                flexDirection: 'column',
                gap: 14
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Plus size={16} color="var(--color-primary)" />
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-ink)' }}>
                    Agregar Fuente NDI Manual (Subredes dedicadas, VPN o encoders IP)
                  </span>
                </div>
                <div style={{ fontSize: 11.5, color: 'var(--color-text-muted)', lineHeight: 1.4 }}>
                  Utilice esta opción para conectar señales situadas en otras subredes o enlaces remotos que no emitan mDNS en la red local.
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 12 }}>
                  <div className="m3-outlined-field">
                    <label className="m3-field-label">Nombre Identificador de la Señal:</label>
                    <input
                      type="text"
                      placeholder="Móvil Sucre, Estudio 3, Cámara PTZ 2..."
                      className="m3-outlined-control"
                      style={{ height: 40, fontSize: 12.5 }}
                      value={newNdiName}
                      onChange={(e) => setNewNdiName(e.target.value)}
                    />
                  </div>

                  <div className="m3-outlined-field">
                    <label className="m3-field-label">Nombre del Equipo Transmisor (Host):</label>
                    <input
                      type="text"
                      placeholder="MOVIL-01, VMIX-MASTER..."
                      className="m3-outlined-control"
                      style={{ height: 40, fontSize: 12.5 }}
                      value={newNdiMachine}
                      onChange={(e) => setNewNdiMachine(e.target.value)}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.5fr 0.8fr 1fr', gap: 12 }}>
                  <div className="m3-outlined-field">
                    <label className="m3-field-label">Nombre del Canal / Stream:</label>
                    <input
                      type="text"
                      placeholder="Output 1"
                      className="m3-outlined-control"
                      style={{ height: 40, fontSize: 12.5 }}
                      value={newNdiStream}
                      onChange={(e) => setNewNdiStream(e.target.value)}
                    />
                  </div>

                  <div className="m3-outlined-field">
                    <label className="m3-field-label">Dirección IP de Red:</label>
                    <input
                      type="text"
                      placeholder="192.168.1.50"
                      className="m3-outlined-control"
                      style={{ height: 40, fontSize: 12.5 }}
                      value={newNdiIp}
                      onChange={(e) => setNewNdiIp(e.target.value)}
                    />
                  </div>

                  <div className="m3-outlined-field">
                    <label className="m3-field-label">Puerto:</label>
                    <input
                      type="number"
                      placeholder="5961"
                      className="m3-outlined-control"
                      style={{ height: 40, fontSize: 12.5 }}
                      value={newNdiPort}
                      onChange={(e) => setNewNdiPort(e.target.value)}
                    />
                  </div>

                  <div className="m3-outlined-field">
                    <label className="m3-field-label">Norma / Formato de Entrada:</label>
                    <select
                      className="m3-outlined-control"
                      style={{ height: 40, fontSize: 12.5 }}
                      value={newNdiFormat}
                      onChange={(e) => setNewNdiFormat(e.target.value)}
                    >
                      <option value="Auto-Detect">Auto-Detect (Formato Nativo del Emisor)</option>
                      <option value="1080p59.94">1080p 59.94</option>
                      <option value="1080p50">1080p 50.00</option>
                      <option value="1080p29.97">1080p 29.97</option>
                      <option value="1080p25">1080p 25.00</option>
                      <option value="1080i59.94">1080i 59.94</option>
                      <option value="1080i50">1080i 50.00</option>
                      <option value="720p59.94">720p 59.94</option>
                      <option value="720p50">720p 50.00</option>
                      <option value="2160p29.97">4K UHD 29.97</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 6 }}>
                  <button
                    className="m3-btn-filled"
                    onClick={handleAddManualSubmit}
                    disabled={!newNdiName.trim() || !newNdiIp.trim()}
                    style={{ height: 38, padding: '0 20px', fontSize: 12.5 }}
                  >
                    <Plus size={14} />
                    <span>Registrar Fuente NDI</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: NDI 6 RUNTIME & MASTER STREAM */}
          {activeTab === 'RUNTIME' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* SDK Status Card */}
              <div style={{
                background: 'var(--color-canvas)',
                border: '1px solid var(--color-hairline)',
                borderRadius: '16px',
                padding: '16px 20px',
                display: 'flex',
                flexDirection: 'column',
                gap: 12
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Network size={16} color={ndiStatus?.available ? 'var(--color-success)' : 'var(--color-live)'} />
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-ink)' }}>
                      NDI 6 SDK & Runtime Oficial (x64)
                    </span>
                    <span className={`m3-assist-chip ${ndiStatus?.available ? 'online' : 'offline'}`} style={{ fontSize: 10, padding: '2px 8px' }}>
                      {ndiStatus?.available ? 'DISPONIBLE / COMPATIBLE' : 'NO DETECTADO'}
                    </span>
                  </div>

                  {ndiStatus?.installerAvailable && (
                    <button
                      className="m3-btn-tonal"
                      onClick={installRuntime}
                      disabled={isInstalling}
                      style={{ height: 32, padding: '0 12px', fontSize: 11.5 }}
                    >
                      <Download size={12} className={isInstalling ? 'spin' : ''} />
                      <span>{isInstalling ? 'Instalando NDI 6...' : 'Instalar / Registrar NDI 6'}</span>
                    </button>
                  )}
                </div>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: 12,
                  background: 'var(--color-field)',
                  border: '1px solid var(--color-hairline)',
                  padding: 12,
                  borderRadius: '12px',
                  fontSize: 11.5
                }}>
                  <div>
                    <span style={{ color: 'var(--color-text-muted)' }}>Versión SDK: </span>
                    <strong style={{ color: 'var(--color-ink)' }}>{ndiStatus?.sdkVersion || 'NDI 6.0.0'}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--color-text-muted)' }}>Librería Activa: </span>
                    <strong style={{ color: ndiStatus?.activeLibraryPath ? 'var(--color-success)' : 'var(--color-warning)', fontFamily: 'var(--font-family-mono)', fontSize: 11 }}>
                      {ndiStatus?.activeLibraryPath ? ndiStatus.activeLibraryPath.split('\\').pop() : 'No cargada'}
                    </strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--color-text-muted)' }}>Modo de Carga: </span>
                    <strong style={{ color: 'var(--color-ink)' }}>
                      {ndiStatus?.isSystemInstalled ? 'Instalación de Sistema' : ndiStatus?.isBundled ? 'Binario Embebido' : 'No disponible'}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Master Stream Card */}
              <div style={{
                background: 'var(--color-canvas)',
                border: '1px solid var(--color-hairline)',
                borderRadius: '16px',
                padding: '16px 20px',
                display: 'flex',
                flexDirection: 'column',
                gap: 10
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Server size={16} color="var(--color-primary)" />
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-ink)' }}>
                    Canal NDI Maestro de Salida (PGM Broadcast)
                  </span>
                </div>
                <div style={{ fontSize: 11.5, color: 'var(--color-text-muted)', lineHeight: 1.45 }}>
                  El playout publica este flujo continuamente en la red local. Cualquier equipo autorizado puede sintonizarlo sin retardos.
                </div>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 12,
                  background: 'var(--color-field)',
                  padding: 12,
                  borderRadius: '12px',
                  fontSize: 12
                }}>
                  <div>
                    <span style={{ color: 'var(--color-text-muted)', display: 'block', marginBottom: 2 }}>Nombre del Canal:</span>
                    <strong style={{ color: 'var(--color-primary)' }}>{ndiStatus?.outputStream?.name || 'IB-CAST-MASTER'}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--color-text-muted)', display: 'block', marginBottom: 2 }}>Norma de Emisión:</span>
                    <strong style={{ color: 'var(--color-ink)' }}>
                      {ndiStatus?.outputStream?.format || '1080i59.94'} ({ndiStatus?.outputStream?.colorSpace || 'Rec 709'})
                    </strong>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="m3-dialog-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
            NDI® is a registered trademark of Vizrt NDI AB. Más información en{' '}
            <a
              href="https://ndi.video/"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: 'var(--color-primary)', textDecoration: 'underline' }}
            >
              https://ndi.video/
            </a>
          </div>
          <button
            className="m3-btn-filled"
            onClick={onClose}
            style={{ height: 38, padding: '0 24px', fontSize: 12.5 }}
          >
            Aceptar y Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
