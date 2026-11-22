import React from 'react';
import { X, Video, Info } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSourceSelected?: (source: any) => void;
}

export const NdiModal: React.FC<Props> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="config-modal-backdrop" onClick={onClose}>
      <div className="config-modal-card" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: 16 }}>
            <Video size={18} color="var(--primary, #38bdf8)" />
            <span>Fuentes de Red IP / NDI</span>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ background: 'var(--color-field, #0f172a)', padding: 14, borderRadius: 8, border: '1px solid var(--color-hairline, #334155)', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#38bdf8', fontWeight: 600, fontSize: 13, marginBottom: 6 }}>
            <Info size={16} />
            <span>Sistema Web de Videos Digitales</span>
          </div>
          <div style={{ fontSize: 12, color: '#94a3b8' }}>
            Las fuentes propietarias NDI se encuentran deshabilitadas para este despliegue web. La programacion opera exclusivamente con archivos digitales de video.
          </div>
        </div>

        <button className="bms-btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={onClose}>
          Cerrar
        </button>
      </div>
    </div>
  );
};
