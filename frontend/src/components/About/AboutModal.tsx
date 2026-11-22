import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import {
  PlaySquare,
  X,
  Copy,
  Check,
  RefreshCw,
  AlertCircle,
  ExternalLink,
  Globe,
  Network
} from 'lucide-react';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const NOT_OBTAINED = 'No disponible';

function getDisplayValue(val: any): string {
  if (val === null || val === undefined || val === '') {
    return NOT_OBTAINED;
  }
  return String(val);
}

export const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose }) => {
  const [aboutData, setAboutData] = useState<any>(null);
  const [ndiStatus, setNdiStatus] = useState<any>(null);
  const [networkInfo, setNetworkInfo] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [copiedFicha, setCopiedFicha] = useState(false);
  const [copiedIp, setCopiedIp] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const [data, ndi, net] = await Promise.all([
        api.getAboutInfo().catch(() => null),
        api.getNdiStatus().catch(() => null),
        api.getNetworkInfo().catch(() => null)
      ]);
      if (data) setAboutData(data);
      if (ndi) setNdiStatus(ndi);
      if (net) setNetworkInfo(net);
    } catch (err: any) {
      console.error('[AboutModal] Error al obtener información:', err);
      setErrorMessage(err?.message || 'Error al conectar con el servicio local');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const machineIp =
    aboutData?.serverIp ||
    networkInfo?.primaryIp ||
    (typeof window !== 'undefined' ? window.location.hostname : '127.0.0.1');

  const versionLines: string[] = [
    `Software: IB-Cast Playout Master`,
    `Versión: ${getDisplayValue(aboutData?.version || '1.0.0')}`,
    `IP de la Estación: ${machineIp}`,
    `Norma de Emisión: ${getDisplayValue(aboutData?.profile || 'Automática / Según configuración')}`,
    `Tecnología NDI: NDI High Bandwidth (${ndiStatus?.version || 'NDI 6 SDK'})`,
    `Canal NDI Maestro: ${ndiStatus?.outputStream?.name || 'IB-CAST-MASTER'}`,
    `Salida SDI: ${getDisplayValue(aboutData?.decklinkDevice || 'Blackmagic DeckLink SDI')}`,
    `Motor FFmpeg: ${getDisplayValue(aboutData?.ffmpeg?.version?.split(' ')[2] || 'Portable')} (${aboutData?.ffmpeg?.hwAccel ? 'Aceleración HW Activa' : 'Nativo'})`,
    `Código de Tiempo: SMPTE 12M-2 (BOT UTC-4)`,
    `Entorno: Tauri 2.0 Nativo • Rust Engine 64-bit`,
    `Sistema Operativo: ${getDisplayValue(aboutData?.os || 'Windows 64-bit')}`,
    `Licencia NDI: NDI is a registered trademark of Vizrt NDI AB (https://ndi.video/)`
  ];

  const versionText = versionLines.join('\n');

  const handleCopyFicha = async () => {
    try {
      await navigator.clipboard.writeText(versionText);
      setCopiedFicha(true);
      setTimeout(() => setCopiedFicha(false), 2000);
    } catch (copyErr: any) {
      console.error('[AboutModal] No se pudo copiar ficha:', copyErr);
    }
  };

  const handleCopyIp = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(machineIp);
      setCopiedIp(true);
      setTimeout(() => setCopiedIp(false), 2000);
    } catch { }
  };

  const openNdiLink = (e: React.MouseEvent) => {
    e.preventDefault();
    window.open('https://ndi.video/', '_blank');
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
          width: 580,
          maxWidth: '94vw',
          borderRadius: 20,
          background: 'var(--color-surface, var(--color-canvas))',
          border: '1px solid var(--color-hairline)',
          overflow: 'hidden'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera Única y Plana Material Design 3 (Sin doble título) */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--color-hairline)',
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
                borderRadius: 10,
                background: 'var(--color-primary-subtle, rgba(0, 122, 255, 0.12))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--color-primary)',
                flexShrink: 0
              }}
            >
              <PlaySquare size={20} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-ink)' }}>
                  IB-Cast Playout Master
                </span>
                <span
                  style={{
                    fontSize: 10.5,
                    fontWeight: 600,
                    padding: '2px 8px',
                    borderRadius: 9999,
                    background: 'var(--color-primary-subtle, rgba(0, 122, 255, 0.12))',
                    color: 'var(--color-primary)'
                  }}
                >
                  v{aboutData?.version || '1.0.0'}
                </span>
              </div>
              <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>
                Sistema de Emisión Continua 24/7 y Auditoría Oficial
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="ide-icon-btn"
            style={{ width: 28, height: 28 }}
            title="Cerrar ventana"
          >
            <X size={16} />
          </button>
        </div>

        {/* Cuerpo del Diálogo */}
        <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Banner de error si falló la consulta */}
          {errorMessage && (
            <div
              style={{
                background: 'var(--color-live-subtle)',
                border: '1px solid var(--color-live)',
                borderRadius: 8,
                padding: '8px 12px',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: 11.5
              }}
            >
              <AlertCircle size={14} color="var(--color-live)" />
              <span style={{ color: 'var(--color-live)' }}>{errorMessage}</span>
            </div>
          )}

          {/* Tarjeta Destacada: IP de la Máquina y Conexión de Red */}
          <div
            style={{
              background: 'var(--color-field)',
              border: '1px solid var(--color-hairline)',
              borderRadius: 12,
              padding: '10px 14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Network size={18} color="var(--color-cyan)" />
              <div>
                <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                  Dirección IP de la Estación
                </div>
                <div style={{ fontSize: 15, fontWeight: 700, fontFamily: 'var(--font-family-mono)', color: 'var(--color-ink)', marginTop: 1 }}>
                  {machineIp}
                </div>
              </div>
            </div>

            <button
              type="button"
              className="btn-tool"
              onClick={handleCopyIp}
              style={{ fontSize: 11, padding: '4px 10px', gap: 5 }}
              title="Copiar dirección IP al portapapeles"
            >
              {copiedIp ? <Check size={12} color="var(--color-success)" /> : <Copy size={12} />}
              <span>{copiedIp ? 'Copiada' : 'Copiar IP'}</span>
            </button>
          </div>

          {/* Especificaciones Técnicas (Grid Tonal Plano M3) */}
          <div
            style={{
              background: 'var(--color-field)',
              border: '1px solid var(--color-hairline)',
              borderRadius: 12,
              padding: '12px 14px',
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '10px 16px',
              fontSize: 11.5
            }}
          >
            <div>
              <span style={{ color: 'var(--color-text-muted)' }}>Norma de Emisión: </span>
              <strong style={{ color: 'var(--color-ink)', fontWeight: 600 }}>{aboutData?.profile || 'Configurable (Dinámica)'}</strong>
            </div>

            <div>
              <span style={{ color: 'var(--color-text-muted)' }}>Salida SDI: </span>
              <strong style={{ color: 'var(--color-success)', fontWeight: 600 }}>
                {aboutData?.decklinkDevice || 'Blackmagic DeckLink SDI'}
              </strong>
            </div>

            <div>
              <span style={{ color: 'var(--color-text-muted)' }}>Tecnología NDI: </span>
              <strong style={{ color: 'var(--color-primary)', fontWeight: 600 }}>NDI High Bandwidth</strong>
            </div>

            <div>
              <span style={{ color: 'var(--color-text-muted)' }}>Runtime NDI: </span>
              <strong style={{ color: 'var(--color-ink)', fontWeight: 600 }}>{ndiStatus?.version || 'NDI 6 SDK (x64)'}</strong>
            </div>

            <div>
              <span style={{ color: 'var(--color-text-muted)' }}>Canal NDI Maestro: </span>
              <strong style={{ color: 'var(--color-primary)', fontWeight: 600 }}>
                {ndiStatus?.outputStream?.name || 'IB-CAST-MASTER'}
              </strong>
            </div>

            <div>
              <span style={{ color: 'var(--color-text-muted)' }}>Motor Decodificador: </span>
              <strong style={{ color: 'var(--color-ink)', fontWeight: 600 }}>
                ibcast-engine (Rust nativo)
              </strong>
            </div>

            <div>
              <span style={{ color: 'var(--color-text-muted)' }}>Código de Tiempo: </span>
              <strong style={{ color: 'var(--color-ink)', fontWeight: 600 }}>SMPTE 12M-2 (BOT UTC-4)</strong>
            </div>

            <div>
              <span style={{ color: 'var(--color-text-muted)' }}>Entorno: </span>
              <span style={{ fontFamily: 'var(--font-family-mono)', color: 'var(--color-text-muted)' }}>
                Tauri 2.0 • Rust Core
              </span>
            </div>

            <div style={{ gridColumn: 'span 2' }}>
              <span style={{ color: 'var(--color-text-muted)' }}>Sistema Operativo: </span>
              <span style={{ color: 'var(--color-ink)' }}>{aboutData?.os || 'Windows x64'}</span>
            </div>
          </div>

          {/* Atribución Legal NDI */}
          <div
            style={{
              background: 'var(--color-field)',
              border: '1px solid var(--color-hairline)',
              borderRadius: 10,
              padding: '10px 14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12
            }}
          >
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-ink)' }}>
                NDI is a registered trademark of Vizrt NDI AB.
              </div>
              <div style={{ fontSize: 10.5, color: 'var(--color-text-muted)', marginTop: 2 }}>
                Protocolo oficial NDI High Bandwidth de ultra-baja latencia para televisión.
              </div>
            </div>

            <a
              href="https://ndi.video/"
              onClick={openNdiLink}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                padding: '4px 10px',
                background: 'var(--color-canvas)',
                border: '1px solid var(--color-hairline)',
                borderRadius: 9999,
                color: 'var(--color-primary)',
                fontSize: 10.5,
                fontWeight: 500,
                textDecoration: 'none',
                cursor: 'pointer',
                flexShrink: 0
              }}
              title="Visitar sitio oficial de NDI"
            >
              <Globe size={11} />
              <span>ndi.video</span>
              <ExternalLink size={10} />
            </a>
          </div>
        </div>

        {/* Footer Material Design 3 */}
        <div
          style={{
            padding: '12px 20px',
            borderTop: '1px solid var(--color-hairline)',
            background: 'var(--color-field)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <button
            type="button"
            className="btn-tool"
            onClick={loadData}
            disabled={loading}
            style={{ fontSize: 11, padding: '5px 12px', gap: 6 }}
            title="Refrescar estado en tiempo real"
          >
            <RefreshCw size={12} className={loading ? 'spin' : ''} />
            <span>{loading ? 'Consultando...' : 'Actualizar'}</span>
          </button>

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              className="btn-tool"
              onClick={handleCopyFicha}
              style={{ fontSize: 11, padding: '5px 14px', gap: 6 }}
            >
              {copiedFicha ? <Check size={12} color="var(--color-success)" /> : <Copy size={12} />}
              <span>{copiedFicha ? 'Ficha Copiada' : 'Copiar Ficha'}</span>
            </button>
            <button
              type="button"
              className="modal-btn-primary"
              onClick={onClose}
              style={{ fontSize: 11.5, padding: '5px 18px', fontWeight: 600 }}
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
