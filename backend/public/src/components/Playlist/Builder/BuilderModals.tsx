import React from 'react';
import { BuilderItem, PendingReplace, RepeatedGroup, formatDuration, formatHoursMinutesSeconds } from './types';
import { RefreshCw, FolderOpen, Check } from 'lucide-react';

interface ReplaceOccurrencesModalProps {
  pendingReplace: PendingReplace | null;
  onClose: () => void;
  onApplyReplacement: (replaceAll: boolean) => void;
}

export const ReplaceOccurrencesModal: React.FC<ReplaceOccurrencesModalProps> = ({
  pendingReplace,
  onClose,
  onApplyReplacement
}) => {
  if (!pendingReplace) return null;

  return (
    <div className="modal-overlay" style={{ zIndex: 11000 }} onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: 500, padding: 22 }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <RefreshCw size={20} color="var(--color-primary)" />
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-ink)' }}>
            Reemplazo de Archivo en la Pauta
          </div>
        </div>

        <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 14, lineHeight: 1.5 }}>
          El archivo actual:
          <div style={{ padding: '6px 10px', background: 'var(--color-field)', borderRadius: 6, margin: '6px 0', fontFamily: 'var(--font-family-mono)', color: 'var(--color-ink)', fontWeight: 600 }}>
            {pendingReplace.targetItem.title}
          </div>
          se encuentra repetido en <strong style={{ color: 'var(--color-primary)' }}>{pendingReplace.occurrences} eventos</strong> dentro de la lista de planificación.
        </div>

        <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 20 }}>
          Nuevo archivo seleccionado:
          <div style={{ padding: '6px 10px', background: 'var(--color-field)', borderRadius: 6, margin: '6px 0', fontFamily: 'var(--font-family-mono)', color: 'var(--color-success)', fontWeight: 600 }}>
            {pendingReplace.newTitle} ({formatDuration(pendingReplace.newDurationMs)})
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button
            type="button"
            className="modal-btn-primary"
            style={{ padding: '9px 16px', fontSize: 12, fontWeight: 600, justifyContent: 'center' }}
            onClick={() => onApplyReplacement(true)}
          >
            Reemplazar en Todas las Repeticiones ({pendingReplace.occurrences} eventos)
          </button>

          <button
            type="button"
            className="btn-tool"
            style={{ padding: '8px 16px', fontSize: 12, justifyContent: 'center' }}
            onClick={() => onApplyReplacement(false)}
          >
            Reemplazar Solo en Este Evento (1)
          </button>

          <button
            type="button"
            className="btn-tool"
            style={{ padding: '6px 16px', fontSize: 11, justifyContent: 'center', color: 'var(--color-text-muted)' }}
            onClick={onClose}
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
};

interface BatchReplaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  repeatedGroups: RepeatedGroup[];
  onTriggerReplaceItem: (item: BuilderItem) => void;
}

export const BatchReplaceModal: React.FC<BatchReplaceModalProps> = ({
  isOpen,
  onClose,
  repeatedGroups,
  onTriggerReplaceItem
}) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" style={{ zIndex: 11000 }} onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: 640, maxHeight: '80vh', display: 'flex', flexDirection: 'column', padding: 22 }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <RefreshCw size={20} color="var(--color-primary)" />
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-ink)' }}>
                Reemplazo Global de Archivos Repetidos
              </div>
              <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                Sustituye cualquier comercial, publicidad o cortinilla que se repita en la pauta de una sola vez.
              </div>
            </div>
          </div>
          <button className="ide-icon-btn" onClick={onClose}>✕</button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', minHeight: 180, display: 'flex', flexDirection: 'column', gap: 8, paddingRight: 4 }}>
          {repeatedGroups.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '36px 16px', color: 'var(--color-text-muted)' }}>
              <Check size={28} color="var(--color-success)" style={{ margin: '0 auto 8px auto', display: 'block' }} />
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-ink)' }}>No hay archivos repetidos en la lista</div>
              <div style={{ fontSize: 11, marginTop: 4 }}>Todos los elementos actuales tienen archivos únicos.</div>
            </div>
          ) : (
            repeatedGroups.map((group) => (
              <div
                key={group.file_path}
                style={{
                  background: 'var(--color-field)',
                  border: '1px solid var(--color-hairline)',
                  borderRadius: 8,
                  padding: '10px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--color-ink)' }}>
                      {group.title}
                    </span>
                    <span style={{
                      fontSize: 10,
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: 4,
                      background: 'rgba(59, 130, 246, 0.15)',
                      color: 'var(--color-primary)'
                    }}>
                      {group.count} repeticiones
                    </span>
                    <span style={{ fontSize: 10.5, color: 'var(--color-text-muted)' }}>
                      Total: {formatHoursMinutesSeconds(group.totalMs)}
                    </span>
                  </div>
                  <div style={{
                    fontSize: 10,
                    color: 'var(--color-text-muted)',
                    fontFamily: 'var(--font-family-mono)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    marginTop: 3
                  }}>
                    {group.file_path}
                  </div>
                </div>

                <button
                  type="button"
                  className="modal-btn-primary"
                  style={{ fontSize: 11, padding: '6px 14px', whiteSpace: 'nowrap', gap: 6 }}
                  onClick={() => {
                    onClose();
                    onTriggerReplaceItem(group.sampleItem);
                  }}
                >
                  <FolderOpen size={12} />
                  <span>Reemplazar ({group.count})</span>
                </button>
              </div>
            ))
          )}
        </div>

        <div style={{ borderTop: '1px solid var(--color-hairline)', paddingTop: 14, marginTop: 14, display: 'flex', justifyContent: 'flex-end' }}>
          <button type="button" className="btn-tool" onClick={onClose} style={{ padding: '6px 16px', fontSize: 11.5 }}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

