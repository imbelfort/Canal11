import React from 'react';
import { X, Tv, CheckCircle2 } from 'lucide-react';

interface OutputConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  status?: any;
  channelState?: string;
}

export const OutputConfigModal: React.FC<OutputConfigModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="config-modal-backdrop" onClick={onClose}>
      <div className="config-modal-card" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: 16 }}>
            <Tv size={18} color="var(--primary, #38bdf8)" />
            <span>Configuración de Salida Master Web</span>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
            <X size={18} />
          </button>
        </div>

        <p className="bms-text-muted">
          Este sistema opera como Playout 100% Web. La salida se procesa de forma nativa mediante decodificación de video en el navegador web con soporte para resolución Full HD 1080p.
        </p>

        <div style={{ background: 'var(--color-field, #0f172a)', padding: 14, borderRadius: 8, border: '1px solid var(--color-hairline, #334155)', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#4ade80', fontWeight: 600, fontSize: 13, marginBottom: 6 }}>
            <CheckCircle2 size={16} />
            <span>Modo Web Video Player Activo</span>
          </div>
          <div style={{ fontSize: 12, color: '#94a3b8' }}>
            No se requieren tarjetas PCIe Blackmagic DeckLink ni infraestructura NDI propietaria. La escaleta emite archivos multimedia directamente.
          </div>
        </div>

        <button className="bms-btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={onClose}>
          Aceptar
        </button>
      </div>
    </div>
  );
};
