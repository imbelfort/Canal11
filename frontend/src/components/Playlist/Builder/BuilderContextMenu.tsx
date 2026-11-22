import React from 'react';
import { BuilderItem, ContextMenuState } from './types';
import { isCommercialMedia } from '../PlaylistToolbar';
import {
  Scissors,
  RotateCcw,
  Tag,
  EyeOff,
  Sparkles,
  Clock,
  FolderOpen,
  Copy,
  ArrowUp,
  ArrowDown,
  Trash2
} from 'lucide-react';

interface BuilderContextMenuProps {
  contextMenu: ContextMenuState | null;
  onClose: () => void;
  items: BuilderItem[];
  selectedCount: number;
  onOpenTrimModal: (item: BuilderItem) => void;
  onClearTrim: (id: string) => void;
  onToggleCommercial: (item: BuilderItem) => void;
  onToggleCG: (id: string) => void;
  onStartEditingDuration: (id: string, mins: number) => void;
  onTriggerReplaceItem: (item: BuilderItem) => void;
  onDuplicate: (idx: number) => void;
  onMoveUp: (idx: number) => void;
  onMoveDown: (idx: number) => void;
  onCopyPath: (path: string) => void;
  onDeleteSelected: () => void;
  onDeleteItem: (id: string) => void;
}

export const BuilderContextMenu: React.FC<BuilderContextMenuProps> = ({
  contextMenu,
  onClose,
  items,
  selectedCount,
  onOpenTrimModal,
  onClearTrim,
  onToggleCommercial,
  onToggleCG,
  onStartEditingDuration,
  onTriggerReplaceItem,
  onDuplicate,
  onMoveUp,
  onMoveDown,
  onCopyPath,
  onDeleteSelected,
  onDeleteItem
}) => {
  if (!contextMenu) return null;

  const { item, index } = contextMenu;
  const isLive = item.event_type.startsWith('LIVE');
  const isTrimmed = Boolean((item.in_point_ms && item.in_point_ms > 0) || (item.out_point_ms && item.out_point_ms > 0));
  const isComm = item.event_type === 'COMMERCIAL' || isCommercialMedia(item.title, item.file_path);
  const sameCount = items.filter(it => it.file_path === item.file_path).length;

  return (
    <div
      className="playlist-context-menu"
      style={{
        position: 'fixed',
        left: Math.min(contextMenu.x, window.innerWidth - 240),
        top: Math.min(contextMenu.y, window.innerHeight - 380),
        zIndex: 10000,
        minWidth: 230
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div style={{
        padding: '6px 12px 8px 12px',
        fontSize: 11,
        fontWeight: 600,
        color: 'var(--color-text-muted)',
        borderBottom: '1px solid var(--color-hairline)',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis'
      }}>
        {item.title}
      </div>

      {!isLive && (
        <div
          className="context-menu-item"
          onClick={() => {
            onOpenTrimModal(item);
            onClose();
          }}
        >
          <Scissors size={14} color="var(--color-primary)" />
          <span>Recortar Video (Trim IN / OUT)...</span>
        </div>
      )}

      {isTrimmed && (
        <div
          className="context-menu-item"
          onClick={() => {
            onClearTrim(item.id);
            onClose();
          }}
        >
          <RotateCcw size={14} color="var(--color-warning)" />
          <span>Quitar Recorte (Restaurar Duración)</span>
        </div>
      )}

      <div
        className="context-menu-item"
        onClick={() => {
          onToggleCommercial(item);
          onClose();
        }}
      >
        <Tag size={14} color="var(--color-warning, #ff9500)" />
        <span>
          {isComm ? 'Marcar como Programa / Video' : 'Marcar como Tanda / Publicidad'}
        </span>
      </div>

      <div
        className="context-menu-item"
        onClick={() => {
          onToggleCG(item.id);
          onClose();
        }}
      >
        {item.show_graphics ? (
          <>
            <EyeOff size={14} color="var(--color-text-muted)" />
            <span>Desactivar CG en este elemento</span>
          </>
        ) : (
          <>
            <Sparkles size={14} color="var(--color-success, #30d158)" />
            <span>Activar CG en este elemento</span>
          </>
        )}
      </div>

      <div
        className="context-menu-item"
        onClick={() => {
          onStartEditingDuration(item.id, Math.round((item.duration_ms || 30000) / 60000) || 1);
          onClose();
        }}
      >
        <Clock size={14} color="var(--color-primary)" />
        <span>Editar Duración Manual...</span>
      </div>

      <div className="context-menu-divider" />

      <div
        className="context-menu-item"
        onClick={() => {
          onTriggerReplaceItem(item);
          onClose();
        }}
      >
        <FolderOpen size={14} color="var(--color-primary)" />
        <span>
          {sameCount > 1
            ? `Reemplazar Archivo (${sameCount} repeticiones)...`
            : 'Reemplazar Archivo...'}
        </span>
      </div>

      <div
        className="context-menu-item"
        onClick={() => {
          onDuplicate(index);
          onClose();
        }}
      >
        <Copy size={14} />
        <span>Duplicar Elemento</span>
      </div>

      {index > 0 && (
        <div
          className="context-menu-item"
          onClick={() => {
            onMoveUp(index);
            onClose();
          }}
        >
          <ArrowUp size={14} />
          <span>Mover Arriba</span>
        </div>
      )}

      {index < items.length - 1 && (
        <div
          className="context-menu-item"
          onClick={() => {
            onMoveDown(index);
            onClose();
          }}
        >
          <ArrowDown size={14} />
          <span>Mover Abajo</span>
        </div>
      )}

      <div
        className="context-menu-item"
        onClick={() => {
          if (item.file_path) {
            onCopyPath(item.file_path);
          }
          onClose();
        }}
      >
        <Copy size={14} color="var(--color-text-muted)" />
        <span>Copiar Ruta de Archivo</span>
      </div>

      <div className="context-menu-divider" />

      {selectedCount > 1 && (
        <>
          <div
            className="context-menu-item danger"
            onClick={() => {
              onDeleteSelected();
              onClose();
            }}
          >
            <Trash2 size={14} color="var(--color-live)" />
            <span style={{ color: 'var(--color-live)', fontWeight: 500 }}>
              Eliminar Seleccionados ({selectedCount})
            </span>
          </div>
          <div className="context-menu-divider" />
        </>
      )}

      <div
        className="context-menu-item danger"
        onClick={() => {
          onDeleteItem(item.id);
          onClose();
        }}
      >
        <Trash2 size={14} color="var(--color-live)" />
        <span style={{ color: 'var(--color-live)', fontWeight: 500 }}>Eliminar de la Pauta</span>
      </div>
    </div>
  );
};

