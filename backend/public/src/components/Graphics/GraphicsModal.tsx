import React from 'react';
import { GraphicsWorkspace } from './GraphicsWorkspace';
import { X, Sparkles } from 'lucide-react';

interface GraphicsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdated?: () => void;
}

export const GraphicsModal: React.FC<GraphicsModalProps> = ({
  isOpen,
  onClose,
  onUpdated
}) => {
  if (!isOpen) return null;

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
          width: '96vw',
          maxWidth: 1440,
          height: '92vh',
          maxHeight: 920,
          borderRadius: 20
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Material Design 3 */}
        <div className="m3-dialog-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: 'var(--color-accent-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-primary)',
              flexShrink: 0
            }}>
              <Sparkles size={18} />
            </div>
            <div>
              <h2 className="m3-headline-small" style={{ fontSize: 14, fontWeight: 600 }}>
                Generador de Gráficos CG al Aire (Master Broadcast)
              </h2>
              <p style={{ margin: '2px 0 0 0', fontSize: 11, color: 'var(--color-text-muted)' }}>
                Control en tiempo real de Logo mosca, Reloj local BOT, Clima (Open-Meteo API) y Zócalos / Ticker
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              onClick={onClose}
              className="m3-icon-button"
              title="Cerrar modal [Esc]"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Modal Body: Embedded High Resolution Graphics Workspace */}
        <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
          <GraphicsWorkspace />
        </div>
      </div>
    </div>
  );
};
