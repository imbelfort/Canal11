import React, { useMemo, memo } from 'react';
import { BuilderItem, formatDuration } from './types';
import { isCommercialMedia } from '../PlaylistToolbar';
import {
  CalendarClock,
  GripVertical,
  Sparkles,
  EyeOff,
  AlertTriangle,
  Radio,
  Globe,
  Tag,
  FileVideo,
  Scissors,
  FolderOpen,
  Trash2,
  ArrowUp,
  ArrowDown,
  RefreshCw,
  Copy
} from 'lucide-react';

interface BuilderRowProps {
  item: BuilderItem;
  idx: number;
  isSelected: boolean;
  isMissing: boolean;
  isCommercial: boolean;
  isLive: boolean;
  isTrimmed: boolean;
  sameCount: number;
  estStart: string;
  isEditingDuration: boolean;
  editDurationMin: number;
  isTotalCount: number;
  onEditDurationMinChange: (val: number) => void;
  onSaveDurationEdit: (id: string) => void;
  onStartEditingDuration: (id: string, mins: number) => void;
  onDragStart: (e: React.DragEvent, idx: number) => void;
  onDragOver: (e: React.DragEvent, idx: number) => void;
  onDrop: (e: React.DragEvent, idx: number) => void;
  onRowClick: (e: React.MouseEvent, item: BuilderItem, idx: number) => void;
  onRowContextMenu: (e: React.MouseEvent, item: BuilderItem, idx: number) => void;
  onToggleItemCG: (id: string) => void;
  onOpenTrimModal: (item: BuilderItem) => void;
  onMoveUp: (idx: number) => void;
  onMoveDown: (idx: number) => void;
  onTriggerReplaceItem: (item: BuilderItem) => void;
  onDuplicate: (idx: number) => void;
  onDeleteItem: (id: string) => void;
}

// Fila Memoizada de Ultra-Rendimiento (Evita re-render de 380 items en cada clic o tecla)
const BuilderRow = memo<BuilderRowProps>(({
  item,
  idx,
  isSelected,
  isMissing,
  isCommercial,
  isLive,
  isTrimmed,
  sameCount,
  estStart,
  isEditingDuration,
  editDurationMin,
  isTotalCount,
  onEditDurationMinChange,
  onSaveDurationEdit,
  onStartEditingDuration,
  onDragStart,
  onDragOver,
  onDrop,
  onRowClick,
  onRowContextMenu,
  onToggleItemCG,
  onOpenTrimModal,
  onMoveUp,
  onMoveDown,
  onTriggerReplaceItem,
  onDuplicate,
  onDeleteItem
}) => {
  return (
    <tr
      id={`builder-playlist-row-${idx}`}
      data-index={idx}
      className={`playlist-builder-row ${isSelected ? 'row-selected' : ''} ${isMissing ? 'row-missing' : ''} ${isCommercial ? 'row-commercial' : ''}`}
      draggable
      onDragStart={(e) => onDragStart(e, idx)}
      onDragOver={(e) => onDragOver(e, idx)}
      onDrop={(e) => onDrop(e, idx)}
      onClick={(e) => onRowClick(e, item, idx)}
      onDoubleClick={() => !isLive && onOpenTrimModal(item)}
      onContextMenu={(e) => onRowContextMenu(e, item, idx)}
      style={{
        cursor: 'pointer',
        userSelect: 'none'
      }}
      title={isMissing ? '¡Archivo no encontrado en disco! Clic derecho o botón de acciones para reemplazar' : 'Arrastre para reordenar. Doble clic para Recortar (Trim). Clic o Ctrl+Clic para medir bloque.'}
    >
      {/* 1. Posición (#) con Grip para Reordenamiento */}
      <td
        style={{
          width: 58,
          minWidth: 58,
          maxWidth: 60,
          padding: '3px 4px',
          textAlign: 'center',
          whiteSpace: 'nowrap'
        }}
      >
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 4,
            fontFamily: 'var(--font-family-mono)',
            fontSize: 11,
            color: 'var(--color-text-muted)'
          }}
        >
          <GripVertical
            size={12}
            className="row-grip-handle"
            style={{
              cursor: 'grab',
              opacity: 0.35,
              flexShrink: 0
            }}
          />
          <span
            style={{
              display: 'inline-block',
              textAlign: 'right',
              minWidth: 26,
              fontWeight: 500
            }}
          >
            {idx + 1}
          </span>
        </div>
      </td>

      {/* 2. Hora Inicio proyectada */}
      <td style={{ fontFamily: 'var(--font-family-mono)', fontWeight: 500, color: 'var(--color-cyan)', fontSize: 11.5, width: 85, minWidth: 85, whiteSpace: 'nowrap' }}>
        {estStart}
      </td>

      {/* 3. Gráficos CG al Aire (Toggle) */}
      <td style={{ textAlign: 'center', width: 38, minWidth: 38 }}>
        <button
          type="button"
          className="ide-icon-btn"
          style={{
            padding: '1px 3px',
            opacity: item.show_graphics ? 1 : 0.45,
            pointerEvents: 'auto'
          }}
          onClick={(e) => {
            e.stopPropagation();
            onToggleItemCG(item.id);
          }}
          title={item.show_graphics ? 'Gráficos activos. Clic para suprimir.' : 'Gráficos suprimidos. Clic para activar.'}
        >
          {item.show_graphics ? (
            <Sparkles size={11} color="var(--color-accent, #30d158)" />
          ) : (
            <EyeOff size={11} color="var(--color-text-muted)" />
          )}
        </button>
      </td>

      {/* 4. Tipo de Evento */}
      <td style={{ width: 90, minWidth: 90, whiteSpace: 'nowrap' }}>
        {isMissing ? (
          <span className="badge-status missing" style={{ fontSize: 9, padding: '2px 7px', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
            <AlertTriangle size={10} color="#ef4444" />
            <span>FALTA</span>
          </span>
        ) : item.event_type === 'LIVE_SDI' ? (
          <span className="badge-status on-air" style={{ fontSize: 9, padding: '2px 7px' }}>
            <Radio size={10} />
            <span>VIVO SDI</span>
          </span>
        ) : item.event_type === 'LIVE_NDI' ? (
          <span className="badge-status on-air" style={{ fontSize: 9, padding: '2px 7px', background: 'var(--color-cyan)', color: '#fff' }}>
            <Globe size={10} />
            <span>VIVO NDI</span>
          </span>
        ) : isCommercial ? (
          <span className="badge-status pending" style={{ fontSize: 9, padding: '2px 7px', background: 'var(--color-warning-subtle)', color: 'var(--color-warning-on-subtle)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <Tag size={10} />
            <span>TANDA</span>
          </span>
        ) : (
          <span className="badge-status played" style={{ fontSize: 9, padding: '2px 7px' }}>
            <FileVideo size={10} />
            <span>CLIP</span>
          </span>
        )}
      </td>

      {/* 5. Duración y Distintivo Trim */}
      <td style={{ fontFamily: 'var(--font-family-mono)', fontWeight: 500, color: 'var(--color-ink)', fontSize: 11.5, width: 105, minWidth: 105, whiteSpace: 'nowrap' }}>
        {isEditingDuration ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }} onClick={(e) => e.stopPropagation()}>
            <input
              type="number"
              min={1}
              max={600}
              value={editDurationMin}
              onChange={(e) => onEditDurationMinChange(Math.max(1, parseInt(e.target.value, 10) || 1))}
              style={{ width: 44, padding: '1px 3px', fontSize: 11, textAlign: 'center' }}
              autoFocus
            />
            <span style={{ fontSize: 10 }}>m</span>
            <button
              type="button"
              className="btn-tool"
              onClick={() => onSaveDurationEdit(item.id)}
              style={{ padding: '1px 4px', fontSize: 9.5 }}
            >
              OK
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span
              onDoubleClick={(e) => {
                if (isLive) {
                  e.stopPropagation();
                  onStartEditingDuration(item.id, Math.round(item.duration_ms / 60000));
                }
              }}
              title={isLive ? 'Doble clic para editar duración de evento en vivo' : undefined}
            >
              {formatDuration(item.duration_ms)}
            </span>
            {isTrimmed && (
              <span
                style={{
                  fontSize: 8.5,
                  fontWeight: 700,
                  color: 'var(--color-primary)',
                  background: 'rgba(59, 130, 246, 0.14)',
                  border: '1px solid rgba(59, 130, 246, 0.35)',
                  borderRadius: 3,
                  padding: '0 4px',
                  lineHeight: '14px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 2,
                  cursor: 'pointer'
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenTrimModal(item);
                }}
                title={`Recorte activo: IN ${(item.in_point_ms || 0) / 1000}s - OUT ${(item.out_point_ms || 0) / 1000}s. Clic para editar.`}
              >
                <Scissors size={9} />
                TRIM
              </span>
            )}
          </div>
        )}
      </td>

      {/* 6. Archivo / Ubicación (Altura Uniforme Fija - Cero Desplazamientos de Layout) */}
      <td>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{
            fontSize: 11.5,
            fontWeight: 600,
            color: isMissing ? '#ef4444' : (isCommercial ? 'var(--color-commercial, #a855f7)' : 'var(--color-ink)')
          }}>
            {item.title}
          </span>
          {isMissing && (
            <span
              style={{
                fontSize: 9,
                fontWeight: 700,
                padding: '1px 5px',
                borderRadius: 3,
                background: 'rgba(239, 68, 68, 0.18)',
                color: '#ef4444',
                border: '1px solid rgba(239, 68, 68, 0.4)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 3
              }}
              title="Archivo no encontrado físicamente en disco. Clic derecho o botón de acciones para reemplazar."
            >
              <AlertTriangle size={9} color="#ef4444" />
              NO EXISTE EN DISCO
            </span>
          )}
          {sameCount > 1 && (
            <span
              style={{
                fontSize: 9.5,
                padding: '1px 6px',
                borderRadius: 3,
                background: 'rgba(59, 130, 246, 0.12)',
                color: 'var(--color-primary)',
                fontWeight: 600
              }}
              title={`Este archivo se repite ${sameCount} veces en la pauta`}
            >
              {sameCount}x
            </span>
          )}
        </div>
        <div style={{
          fontSize: 10,
          color: isMissing ? '#ef4444' : 'var(--color-text-muted)',
          fontFamily: 'var(--font-family-mono)',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          maxWidth: 420
        }}>
          {item.file_path}
        </div>
      </td>

      {/* 7. Acciones */}
      <td style={{ textAlign: 'center', width: 140, minWidth: 140, whiteSpace: 'nowrap' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
          <button
            type="button"
            className="ide-icon-btn"
            onClick={(e) => { e.stopPropagation(); onMoveUp(idx); }}
            disabled={idx === 0}
            style={{ width: 22, height: 22 }}
            title="Subir elemento"
          >
            <ArrowUp size={11} />
          </button>
          <button
            type="button"
            className="ide-icon-btn"
            onClick={(e) => { e.stopPropagation(); onMoveDown(idx); }}
            disabled={idx === isTotalCount - 1}
            style={{ width: 22, height: 22 }}
            title="Bajar elemento"
          >
            <ArrowDown size={11} />
          </button>
          {!isLive && (
            <button
              type="button"
              className="ide-icon-btn"
              onClick={(e) => { e.stopPropagation(); onOpenTrimModal(item); }}
              style={{ width: 22, height: 22, color: isTrimmed ? 'var(--color-primary)' : undefined }}
              title={isTrimmed ? 'Editar recorte Trim (IN/OUT)' : 'Recortar video (Trim IN / OUT)'}
            >
              <Scissors size={11} />
            </button>
          )}
          <button
            type="button"
            className="ide-icon-btn"
            onClick={(e) => { e.stopPropagation(); onTriggerReplaceItem(item); }}
            style={{ width: 22, height: 22 }}
            title={sameCount > 1 ? `Reemplazar archivo (repetido ${sameCount} veces en la pauta)` : 'Reemplazar archivo'}
          >
            <RefreshCw size={11} color="var(--color-primary)" />
          </button>
          <button
            type="button"
            className="ide-icon-btn"
            onClick={(e) => { e.stopPropagation(); onDuplicate(idx); }}
            style={{ width: 22, height: 22 }}
            title="Duplicar elemento"
          >
            <Copy size={11} />
          </button>
          <button
            type="button"
            className="ide-icon-btn"
            onClick={(e) => { e.stopPropagation(); onDeleteItem(item.id); }}
            style={{ width: 22, height: 22, color: 'var(--color-live)' }}
            title="Eliminar de la pauta"
          >
            <Trash2 size={11} />
          </button>
        </div>
      </td>
    </tr>
  );
});

interface BuilderTableProps {
  items: BuilderItem[];
  selectedIds: Set<string>;
  fileStatusMap: Record<string, boolean>;
  estimatedStarts?: string[];
  getItemEstimatedStart?: (idx: number) => string;
  editingDurationId: string | null;
  editDurationMin: number;
  onEditDurationMinChange: (val: number) => void;
  onSaveDurationEdit: (id: string) => void;
  onStartEditingDuration: (id: string, mins: number) => void;
  onDragStart: (e: React.DragEvent, idx: number) => void;
  onDragOver: (e: React.DragEvent, idx: number) => void;
  onDrop: (e: React.DragEvent, idx: number) => void;
  onRowClick: (e: React.MouseEvent, item: BuilderItem, idx: number) => void;
  onRowContextMenu: (e: React.MouseEvent, item: BuilderItem, idx: number) => void;
  onToggleItemCG: (id: string) => void;
  onOpenTrimModal: (item: BuilderItem) => void;
  onMoveUp: (idx: number) => void;
  onMoveDown: (idx: number) => void;
  onTriggerReplaceItem: (item: BuilderItem) => void;
  onDuplicate: (idx: number) => void;
  onDeleteItem: (id: string) => void;
}

export const BuilderTable: React.FC<BuilderTableProps> = ({
  items,
  selectedIds,
  fileStatusMap,
  estimatedStarts,
  getItemEstimatedStart,
  editingDurationId,
  editDurationMin,
  onEditDurationMinChange,
  onSaveDurationEdit,
  onStartEditingDuration,
  onDragStart,
  onDragOver,
  onDrop,
  onRowClick,
  onRowContextMenu,
  onToggleItemCG,
  onOpenTrimModal,
  onMoveUp,
  onMoveDown,
  onTriggerReplaceItem,
  onDuplicate,
  onDeleteItem
}) => {
  // Pre-computar conteo de repeticiones en una sola pasada O(N) en lugar de O(N^2)
  const pathCountMap = useMemo(() => {
    const counts: Record<string, number> = {};
    for (let i = 0; i < items.length; i++) {
      const p = items[i].file_path;
      if (p) counts[p] = (counts[p] || 0) + 1;
    }
    return counts;
  }, [items]);

  return (
    <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
      <table className="playlist-table" style={{ width: '100%' }}>
        <thead>
          <tr>
            <th style={{ width: 58, minWidth: 58, maxWidth: 60, textAlign: 'center' }}>#</th>
            <th style={{ width: 85, minWidth: 85 }}>Inicio</th>
            <th style={{ width: 38, minWidth: 38, textAlign: 'center' }} title="Control de Gráficos al Aire (CG / Logo / Reloj)">CG</th>
            <th style={{ width: 90, minWidth: 90 }}>Tipo</th>
            <th style={{ width: 105, minWidth: 105 }}>Duración</th>
            <th>Archivo / Ubicación</th>
            <th style={{ width: 140, minWidth: 140, textAlign: 'center' }}>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {items.length === 0 ? (
            <tr>
              <td colSpan={7} style={{ textAlign: 'center', padding: '48px 16px', color: 'var(--color-text-muted)' }}>
                <CalendarClock size={36} color="var(--color-text-faint)" style={{ margin: '0 auto 12px auto', display: 'block', opacity: 0.6 }} />
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-ink)', marginBottom: 4 }}>
                  Lista de Planificación Vacía
                </div>
                <div style={{ fontSize: 11.5, maxWidth: 460, margin: '0 auto', lineHeight: 1.45 }}>
                  Utiliza los botones superiores para agregar videos, pases a vivo o bloques comerciales, o pulsa <strong>"Traer del Deck"</strong> para importar la programación que está al aire.
                </div>
              </td>
            </tr>
          ) : (
            items.map((item, idx) => {
              const isLive = item.event_type === 'LIVE_SDI' ||
                item.event_type === 'LIVE_NDI' ||
                String(item.file_path || '').trim().toLowerCase().startsWith('sdi-in-') ||
                String(item.file_path || '').trim().toLowerCase().startsWith('ndi:') ||
                String(item.file_path || '').trim().toLowerCase().startsWith('ndi://') ||
                item.file_path === 'NDI_DEFAULT';
              const p = String(item.file_path || '').trim();
              const status = fileStatusMap[p] ??
                fileStatusMap[p.replace(/\\/g, '/')] ??
                fileStatusMap[p.replace(/\//g, '\\')];
              const isMissing = !isLive && (status === false || item.file_exists === false);
              const isCommercial = item.event_type === 'COMMERCIAL' || isCommercialMedia(item.title, item.file_path);
              const isSelected = selectedIds.has(item.id);
              const isTrimmed = Boolean((item.in_point_ms && item.in_point_ms > 0) || (item.out_point_ms && item.out_point_ms > 0));
              const sameCount = pathCountMap[item.file_path] || 1;
              const estStart = estimatedStarts
                ? (estimatedStarts[idx] || '00:00:00')
                : (getItemEstimatedStart ? getItemEstimatedStart(idx) : '00:00:00');

              return (
                <BuilderRow
                  key={item.id}
                  item={item}
                  idx={idx}
                  isSelected={isSelected}
                  isMissing={isMissing}
                  isCommercial={isCommercial}
                  isLive={isLive}
                  isTrimmed={isTrimmed}
                  sameCount={sameCount}
                  estStart={estStart}
                  isEditingDuration={editingDurationId === item.id}
                  editDurationMin={editDurationMin}
                  isTotalCount={items.length}
                  onEditDurationMinChange={onEditDurationMinChange}
                  onSaveDurationEdit={onSaveDurationEdit}
                  onStartEditingDuration={onStartEditingDuration}
                  onDragStart={onDragStart}
                  onDragOver={onDragOver}
                  onDrop={onDrop}
                  onRowClick={onRowClick}
                  onRowContextMenu={onRowContextMenu}
                  onToggleItemCG={onToggleItemCG}
                  onOpenTrimModal={onOpenTrimModal}
                  onMoveUp={onMoveUp}
                  onMoveDown={onMoveDown}
                  onTriggerReplaceItem={onTriggerReplaceItem}
                  onDuplicate={onDuplicate}
                  onDeleteItem={onDeleteItem}
                />
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
};
