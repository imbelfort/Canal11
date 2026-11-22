import React from 'react';
import { X, Tv, Power } from 'lucide-react';

interface ExitConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ExitConfirmModal: React.FC<ExitConfirmModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const handleMinimize = () => {
    const electron = (window as any).electronAPI;
    if (electron && typeof electron.sendExitAction === 'function') {
      electron.sendExitAction('minimize');
    }
    onClose();
  };

  const handleShutdownAndQuit = () => {
    const electron = (window as any).electronAPI;
    if (electron && typeof electron.sendExitAction === 'function') {
      electron.sendExitAction('quit');
    } else {
      fetch('/api/system/shutdown', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Apagado confirmado por el operador' })
      }).finally(() => {
        window.close();
      });
    }
    onClose();
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
        style={{ width: 480, maxWidth: '92vw', borderRadius: 24 }}
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
              <Power size={20} />
            </div>
            <div>
              <h2 className="m3-headline-small" style={{ fontSize: 15, fontWeight: 600 }}>
                Protección de Salida Broadcast 24/7
              </h2>
              <p style={{ margin: '2px 0 0 0', fontSize: 11.5, color: 'var(--color-text-muted)' }}>
                El motor de emisión se encuentra transmitiendo al aire
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

        {/* Content Body */}
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
            Seleccione cómo desea proceder con la emisión activa:
          </div>

          {/* 2 Opciones en formato M3 Card */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {/* Opción 1: Mantener en segundo plano (Recomendado) */}
            <div
              className="m3-radio-card"
              onClick={handleMinimize}
              style={{ padding: '14px 16px' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Tv size={15} color="var(--color-primary)" />
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-ink)' }}>
                    Mantener en segundo plano (24/7)
                  </span>
                </div>
                <span className="m3-assist-chip online" style={{ fontSize: 9.5, padding: '2px 8px' }}>
                  Recomendado
                </span>
              </div>
              <span style={{ fontSize: 11.5, color: 'var(--color-text-muted)', lineHeight: 1.4 }}>
                Oculta la ventana. La emisión hacia DeckLink SDI y red NDI continúa activa sin interrupción.
              </span>
            </div>

            {/* Opción 2: Detener emisión y salir */}
            <div
              className="m3-radio-card"
              onClick={handleShutdownAndQuit}
              style={{ padding: '14px 16px' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <Power size={15} color="var(--color-live)" />
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-live)' }}>
                  Detener emisión y salir
                </span>
              </div>
              <span style={{ fontSize: 11.5, color: 'var(--color-text-muted)', lineHeight: 1.4 }}>
                Detiene la salida de video/audio en SDI y NDI, y apaga el motor de emisión por completo.
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="m3-dialog-footer">
          <button onClick={onClose} className="m3-btn-text">
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
};
