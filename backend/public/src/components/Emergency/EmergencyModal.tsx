import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { ErrorAlertBanner } from '../Common/ErrorAlertBanner';
import { ShieldAlert, CheckCircle2, FolderOpen, Play, X } from 'lucide-react';

interface EmergencyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const EmergencyModal: React.FC<EmergencyModalProps> = ({ isOpen, onClose }) => {
  const [emergencyMode, setEmergencyMode] = useState<'FILE' | 'SMPTE_BARS'>('SMPTE_BARS');
  const [emergencyFilePath, setEmergencyFilePath] = useState('');
  const [emergencyTitle, setEmergencyTitle] = useState('Cortinilla de Continuidad IB-Cast');
  const [isEmergencyValid, setIsEmergencyValid] = useState(false);
  const [emergencyProbe, setEmergencyProbe] = useState<any>(null);
  const [isSavedAlert, setIsSavedAlert] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchSettings = async () => {
    try {
      const emg = await api.getEmergencySettings();
      if (emg) {
        setEmergencyMode((emg.mode as any) || 'SMPTE_BARS');
        setEmergencyFilePath(emg.filePath || '');
        setEmergencyTitle(emg.title || 'Cortinilla de Continuidad IB-Cast');
        setIsEmergencyValid(emg.isFileValid || false);
        setEmergencyProbe(emg.probe || null);
      }
      setErrorMessage(null);
    } catch (e: any) {
      setErrorMessage(`No se pudo cargar la configuración de emergencia: ${e.message || e}`);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchSettings();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSaveMode = async (mode: 'FILE' | 'SMPTE_BARS') => {
    setEmergencyMode(mode);
    try {
      await api.saveEmergencySettings({
        mode,
        filePath: emergencyFilePath,
        title: emergencyTitle
      });
      setIsSavedAlert(true);
      setTimeout(() => setIsSavedAlert(false), 3000);
      fetchSettings();
    } catch (e: any) {
      setErrorMessage(`Error guardando configuración: ${e.message || e}`);
    }
  };

  const handleBrowseFile = async () => {
    if ((window as any).electronAPI?.openEmergencyFileDialog) {
      const path = await (window as any).electronAPI.openEmergencyFileDialog();
      if (path) {
        setEmergencyFilePath(path);
        setEmergencyMode('FILE');
        await api.saveEmergencySettings({
          mode: 'FILE',
          filePath: path,
          title: emergencyTitle
        });
        setIsSavedAlert(true);
        setTimeout(() => setIsSavedAlert(false), 3000);
        fetchSettings();
      }
    }
  };

  const handleTestEmergency = async () => {
    try {
      await api.triggerEmergency('Prueba manual desde configuración de cortinilla');
      onClose();
    } catch (e: any) {
      setErrorMessage(`Error al activar cortinilla: ${e.message || e}`);
    }
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
        style={{
          width: '92vw',
          maxWidth: 680,
          maxHeight: '88vh',
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
              background: 'var(--color-live-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-live)',
              flexShrink: 0
            }}>
              <ShieldAlert size={20} />
            </div>
            <div>
              <h2 className="m3-headline-small" style={{ fontSize: 15, fontWeight: 600 }}>
                Configuración de Cortinilla de Respaldo & Continuidad
              </h2>
              <p style={{ margin: '2px 0 0 0', fontSize: 11.5, color: 'var(--color-text-muted)' }}>
                Señal de contingencia automática ante pérdida de señal o interrupción
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

        {/* Body */}
        <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {errorMessage && (
            <ErrorAlertBanner
              title="Aviso de Cortinilla"
              message={errorMessage}
              onRetry={fetchSettings}
              onDismiss={() => setErrorMessage(null)}
            />
          )}

          {isSavedAlert && (
            <div style={{ padding: '8px 14px', background: 'var(--color-success-subtle)', border: '1px solid var(--color-success)', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--color-success)' }}>
              <CheckCircle2 size={15} />
              <span>Configuración de cortinilla guardada inmediatamente en el sistema.</span>
            </div>
          )}

          <div style={{ background: 'var(--color-canvas)', border: '1px solid var(--color-hairline)', borderRadius: '16px', padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, color: 'var(--color-ink)', marginBottom: 4 }}>
              <ShieldAlert size={16} color="var(--color-live)" />
              <span>Tipo de Señal de Emergencia (Fallo de Continuidad o Disparo Manual)</span>
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--color-text-muted)', marginBottom: 12 }}>
              Selecciona qué contenido emitir automáticamente si un archivo se daña, se interrumpe la emisión o el operador pulsa "Cortinilla":
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div
                className={`m3-radio-card ${emergencyMode === 'FILE' ? 'active' : ''}`}
                onClick={() => handleSaveMode('FILE')}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600, fontSize: 12.5, color: 'var(--color-ink)' }}>
                  <input type="radio" checked={emergencyMode === 'FILE'} onChange={() => handleSaveMode('FILE')} style={{ accentColor: 'var(--color-primary)' }} />
                  <span>Archivo de Video (.mp4 / .mov / .mkv)</span>
                </div>
                <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 6, lineHeight: 1.4 }}>
                  Reproduce un video institucional o cortinilla del canal en bucle continuo de respaldo.
                </div>
              </div>

              <div
                className={`m3-radio-card ${emergencyMode === 'SMPTE_BARS' ? 'active' : ''}`}
                onClick={() => handleSaveMode('SMPTE_BARS')}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600, fontSize: 12.5, color: 'var(--color-ink)' }}>
                  <input type="radio" checked={emergencyMode === 'SMPTE_BARS'} onChange={() => handleSaveMode('SMPTE_BARS')} style={{ accentColor: 'var(--color-primary)' }} />
                  <span>Patrón Técnico SMPTE (Barras)</span>
                </div>
                <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 6, lineHeight: 1.4 }}>
                  Genera el patrón oficial SMPTE de calibración broadcast con texto identificador de IB-Cast.
                </div>
              </div>
            </div>
          </div>

          {emergencyMode === 'FILE' && (
            <div style={{ background: 'var(--color-canvas)', border: '1px solid var(--color-hairline)', borderRadius: '16px', padding: 16 }}>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--color-ink)', marginBottom: 6 }}>
                Archivo de Video Seleccionado para Emergencia:
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="text"
                  className="m3-outlined-control"
                  style={{ flex: 1, fontFamily: 'var(--font-family-mono)', fontSize: 12 }}
                  value={emergencyFilePath}
                  onChange={(e) => setEmergencyFilePath(e.target.value)}
                  placeholder="C:\Ruta\Al\Video_Cortinilla.mp4"
                />
                <button className="m3-btn-filled" onClick={handleBrowseFile} style={{ height: 40, padding: '0 18px', fontSize: 12 }}>
                  <FolderOpen size={14} />
                  <span>Buscar</span>
                </button>
              </div>

              <div className="m3-outlined-field" style={{ marginTop: 12 }}>
                <label className="m3-field-label">Título en el Monitor y As-Run:</label>
                <input
                  type="text"
                  className="m3-outlined-control"
                  value={emergencyTitle}
                  onChange={(e) => setEmergencyTitle(e.target.value)}
                />
              </div>

              {emergencyFilePath && (
                <div style={{ marginTop: 12, padding: '10px 14px', borderRadius: '12px', background: isEmergencyValid ? 'var(--color-success-subtle)' : 'var(--color-live-subtle)', border: `1px solid ${isEmergencyValid ? 'var(--color-success)' : 'rgba(186, 26, 26, 0.4)'}`, fontSize: 11.5 }}>
                  {isEmergencyValid ? (
                    <div style={{ color: 'var(--color-success)', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <CheckCircle2 size={14} />
                      <span>Archivo válido: {emergencyProbe?.formatName?.toUpperCase()} • {emergencyProbe?.videoCodec?.toUpperCase()} • {(emergencyProbe?.durationMs ? (emergencyProbe.durationMs / 1000).toFixed(1) + 's' : '')}</span>
                    </div>
                  ) : (
                    <div style={{ color: 'var(--color-live)' }}>
                      El archivo especificado no existe o no se puede leer. Se usará SMPTE como respaldo automático.
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--color-canvas)', border: '1px solid var(--color-hairline)', borderRadius: '16px', padding: 14 }}>
            <div>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--color-ink)' }}>Probar Cortinilla en Monitor Master</div>
              <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>Verifica la conmutación y visualización en tiempo real.</div>
            </div>
            <button
              className="m3-btn-tonal"
              style={{ color: 'var(--color-warning)', height: 34, fontSize: 12 }}
              onClick={handleTestEmergency}
            >
              <Play size={13} />
              <span>Activar Prueba Ahora</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="m3-dialog-footer">
          <button className="m3-btn-filled" onClick={onClose} style={{ height: 38, fontSize: 12.5 }}>
            Aceptar y Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

