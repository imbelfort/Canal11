import React, { useState, useEffect } from 'react';
import { Network, X, Copy, Check, ExternalLink, CalendarClock, Laptop, ShieldCheck } from 'lucide-react';
import { api } from '../../services/api';

interface NetworkModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NetworkModal: React.FC<NetworkModalProps> = ({ isOpen, onClose }) => {
  const [networkInfo, setNetworkInfo] = useState<{
    primaryIp: string;
    port: number;
    builderUrl: string;
    fullUrl: string;
    addresses: Array<{ interface: string; ip: string; netmask: string; builderUrl: string; fullUrl: string }>;
  } | null>(null);

  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      api.getNetworkInfo()
        .then((data) => {
          if (data && data.success) {
            setNetworkInfo(data);
          }
        })
        .catch((err) => console.error('Error al obtener info de red:', err));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const currentPort = networkInfo?.port || 3000;
  const primaryIp = networkInfo?.primaryIp || window.location.hostname || '127.0.0.1';
  const builderUrl = networkInfo?.builderUrl || `http://${primaryIp}:${currentPort}/?view=builder`;
  const fullUrl = networkInfo?.fullUrl || `http://${primaryIp}:${currentPort}`;

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
          width: 720,
          maxWidth: '94vw',
          maxHeight: '88vh',
          borderRadius: 24,
          background: 'var(--color-canvas)',
          border: '1px solid var(--border-subtle)',
          overflow: 'hidden'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Material Design 3 */}
        <div className="m3-dialog-header" style={{ padding: '16px 24px', borderBottom: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              background: 'rgba(59, 130, 246, 0.12)',
              border: '1px solid rgba(59, 130, 246, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-primary)',
              flexShrink: 0
            }}>
              <Network size={20} />
            </div>
            <div>
              <h2 className="m3-headline-small" style={{ fontSize: 16, fontWeight: 700, margin: 0, color: 'var(--color-ink)' }}>
                Acceso en Red Local (Multi-Estación & Armador Remoto)
              </h2>
              <p style={{ margin: '2px 0 0 0', fontSize: 11.5, color: 'var(--color-text-muted)' }}>
                Conexión desde otras PCs para armar playlists sin intervenir en la emisión viva
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

        {/* Body */}
        <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Tarjeta Destacada: Acceso Dedicado al Armador Remoto */}
          <div style={{
            background: 'var(--color-field)',
            border: '1.5px solid var(--color-primary)',
            borderRadius: 14,
            padding: 16,
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <CalendarClock size={18} color="var(--color-primary)" />
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-ink)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                  Enlace Directo: Armador de Playlist Remoto (Recomendado para otra PC)
                </span>
              </div>
              <span style={{
                fontSize: 9.5,
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: 4,
                background: 'rgba(34, 197, 94, 0.15)',
                color: '#15803d',
                border: '1px solid rgba(34, 197, 94, 0.3)'
              }}>
                PROTEGIDO ON-AIR
              </span>
            </div>

            <p style={{ fontSize: 11.5, color: 'var(--color-text-muted)', margin: '0 0 12px 0', lineHeight: 1.45 }}>
              Abre este enlace en el navegador de cualquier otra computadora de la red local (Chrome, Edge o Firefox).
              Esta vista <strong>oculta los controles del Deck (Play, Pausa, Stop)</strong> para evitar cortes accidentales en la transmisión y permite al productor armar la lista, importar/exportar XML y enviar la programación al aire cuando esté lista.
            </p>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 10,
              background: 'var(--color-canvas)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 8,
              padding: '8px 12px'
            }}>
              <span style={{ fontFamily: 'var(--font-family-mono)', fontSize: 13, fontWeight: 700, color: 'var(--color-primary)', wordBreak: 'break-all' }}>
                {builderUrl}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                <button
                  type="button"
                  className="btn-tool"
                  onClick={() => copyToClipboard(builderUrl, 'builder')}
                  style={{ fontSize: 11, padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 5 }}
                >
                  {copiedKey === 'builder' ? <Check size={12} color="var(--apple-green)" /> : <Copy size={12} />}
                  <span>{copiedKey === 'builder' ? 'Copiado' : 'Copiar URL'}</span>
                </button>
                <button
                  type="button"
                  className="btn-tool"
                  onClick={() => window.open(builderUrl, '_blank')}
                  title="Probar en una pestaña nueva"
                  style={{ fontSize: 11, padding: '4px 8px' }}
                >
                  <ExternalLink size={12} />
                </button>
              </div>
            </div>
          </div>

          {/* Tarjeta Secundaria: Enlace de Control Completo */}
          <div style={{
            background: 'var(--color-field)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 14,
            padding: 14
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <Laptop size={16} color="var(--color-ink)" />
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-ink)' }}>
                Enlace de Control Playout Completo (Master Deck + Playlist)
              </span>
            </div>
            <p style={{ fontSize: 11, color: 'var(--color-text-muted)', margin: '0 0 10px 0' }}>
              Proporciona acceso a la interfaz completa con monitoreo PGM y controles de play/pause/next (para operadores de cabina autorizados).
            </p>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 10,
              background: 'var(--color-canvas)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 8,
              padding: '6px 12px'
            }}>
              <span style={{ fontFamily: 'var(--font-family-mono)', fontSize: 12, color: 'var(--color-ink)' }}>
                {fullUrl}
              </span>
              <button
                type="button"
                className="btn-tool"
                onClick={() => copyToClipboard(fullUrl, 'full')}
                style={{ fontSize: 10.5, padding: '3px 8px', display: 'flex', alignItems: 'center', gap: 4 }}
              >
                {copiedKey === 'full' ? <Check size={11} color="var(--apple-green)" /> : <Copy size={11} />}
                <span>{copiedKey === 'full' ? 'Copiado' : 'Copiar'}</span>
              </button>
            </div>
          </div>

          {/* Tarjeta Informativa de Carpetas Compartidas NAS / SAN */}
          <div style={{
            background: 'var(--color-canvas)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 12,
            padding: 14
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <ShieldCheck size={15} color="var(--apple-green)" />
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-ink)' }}>
                Soporte de Rutas en Red (Carpetas Compartidas UNC / NAS / SAN)
              </span>
            </div>
            <p style={{ fontSize: 11, color: 'var(--color-text-muted)', margin: 0, lineHeight: 1.5 }}>
              Al armar la lista desde otra PC, se recomienda emplear rutas de red compartidas (ej. <code>\\SERVIDOR\Videos\Noticiero.mp4</code> o una unidad montada como <code>Z:\Contenido\...</code>) o bien transferir los archivos antes de la emisión. Al guardar o cargar el archivo XML, el sistema conservará las rutas exactas para emitirlas en la PC Master.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="m3-dialog-footer" style={{ padding: '12px 24px', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'flex-end', background: 'var(--color-field)' }}>
          <button
            type="button"
            className="btn-cmd play"
            onClick={onClose}
            style={{ fontSize: 11.5, padding: '6px 20px', borderRadius: 6, fontWeight: 700 }}
          >
            Listo / Entendido
          </button>
        </div>
      </div>
    </div>
  );
};
