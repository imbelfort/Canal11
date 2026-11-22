import React from 'react';
import { PlaylistItem } from '../../types/playout';
import { X, Trash2 } from 'lucide-react';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  item?: PlaylistItem | null;
  isClearAll?: boolean;
  itemCount?: number;
  isAirActive?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

const formatDuration = (ms: number) => {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${h > 0 ? `${h.toString().padStart(2, '0')}:` : ''}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  item,
  isClearAll = false,
  itemCount = 0,
  isAirActive = false,
  onConfirm,
  onClose
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
              <Trash2 size={20} />
            </div>
            <div>
              <h2 className="m3-headline-small" style={{ fontSize: 15, fontWeight: 600 }}>
                {isClearAll ? (isAirActive ? 'Limpiar cola de emisión' : 'Vaciar lista de emisión') : 'Eliminar elemento de la lista'}
              </h2>
              <p style={{ margin: '2px 0 0 0', fontSize: 11.5, color: 'var(--color-text-muted)' }}>
                Confirmación de acción en la pauta de transmisión
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="m3-icon-button"
            title="Cancelar"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {isClearAll ? (
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-ink)' }}>
                {isAirActive
                  ? `¿Desea limpiar los elementos siguientes en espera (${itemCount} elementos)?`
                  : `¿Desea vaciar toda la lista (${itemCount} elementos)?`}
              </div>
              <div style={{
                fontSize: 11.5,
                color: isAirActive ? 'var(--color-primary)' : 'var(--color-text-muted)',
                marginTop: 8,
                lineHeight: 1.45,
                background: 'var(--color-field)',
                padding: '10px 14px',
                borderRadius: '12px',
                border: '1px solid var(--color-hairline)'
              }}>
                {isAirActive
                  ? 'ℹ️ Emisión en vivo protegida: El video actualmente al aire continuará transmitiéndose sin cortes hasta terminar. Solo se vaciarán los elementos siguientes en espera.'
                  : 'Se removerán todos los elementos de la emisión. El sistema se encuentra en reposo (detenido).'}
              </div>
            </div>
          ) : item ? (
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-ink)' }}>
                ¿Desea eliminar este video de la lista de emisión?
              </div>

              {/* Fila de detalle con tint ladder */}
              <div
                style={{
                  background: 'var(--color-canvas)',
                  border: '1px solid var(--color-hairline)',
                  borderRadius: '14px',
                  padding: '12px 16px',
                  marginTop: 10,
                  fontSize: 12
                }}
              >
                <div style={{ fontWeight: 600, color: 'var(--color-ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {item.title}
                </div>
                <div style={{ display: 'flex', gap: 16, fontSize: 11.5, color: 'var(--color-text-muted)', marginTop: 4 }}>
                  <span>Tipo: <strong style={{ color: 'var(--color-ink)' }}>{item.event_type}</strong></span>
                  <span>Duración: <strong style={{ color: 'var(--color-primary)', fontFamily: 'var(--font-family-mono)' }}>{formatDuration(item.duration_ms)}</strong></span>
                </div>
              </div>

              <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 8 }}>
                El archivo físico permanece intacto en disco.
              </div>
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="m3-dialog-footer">
          <button onClick={onClose} className="m3-btn-text">
            Cancelar
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="m3-btn-danger"
            style={{ height: 38, fontSize: 12.5 }}
          >
            {isClearAll ? (isAirActive ? 'Limpiar cola (Mantener al aire)' : 'Vaciar lista') : 'Eliminar'}
          </button>
        </div>
      </div>
    </div>
  );
};
