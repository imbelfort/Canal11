import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { PlaylistItem, PlayoutBroadcastState } from '../../types/playout';
import { PlaylistRow } from './PlaylistRow';
import { PlaylistToolbar, isCommercialMedia } from './PlaylistToolbar';
import { PlaylistSummary } from './PlaylistSummary';
import { TrimModal } from './TrimModal';
import { DeleteConfirmModal } from './DeleteConfirmModal';
import { api } from '../../services/api';
import { UploadCloud, Play, Scissors, ArrowUp, ArrowDown, Trash2, Sparkles, EyeOff, Tag, FolderOpen } from 'lucide-react';
import { ErrorAlertBanner } from '../Common/ErrorAlertBanner';
import { LinearLoader } from '../Common/LinearLoader';

interface PlaylistTableProps {
  currentIndex: number;
  playoutState?: PlayoutBroadcastState | null;
  onOpenLiveModal?: () => void;
  onOpenLiveSdiModal?: () => void;
  onOpenLiveNdiModal?: () => void;
  refreshTrigger?: number;
}

export const PlaylistTable: React.FC<PlaylistTableProps> = ({
  currentIndex,
  playoutState,
  onOpenLiveModal,
  onOpenLiveSdiModal,
  onOpenLiveNdiModal,
  refreshTrigger,
}) => {
  const [items, setItems] = useState<PlaylistItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [anchorId, setAnchorId] = useState<number | null>(null);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const [draggedRowIndex, setDraggedRowIndex] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingLabel, setLoadingLabel] = useState<string | undefined>(undefined);

  // Context Menu State
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    item: PlaylistItem;
    index: number;
  } | null>(null);

  // Delete Confirmation Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [itemsToDelete, setItemsToDelete] = useState<PlaylistItem[]>([]);
  const [isClearAllModal, setIsClearAllModal] = useState(false);

  // Trim Modal State
  const [trimTargetItem, setTrimTargetItem] = useState<PlaylistItem | null>(null);
  const [isTrimModalOpen, setIsTrimModalOpen] = useState(false);

  // Reemplazo rápido de archivo físico
  const [itemToReplace, setItemToReplace] = useState<PlaylistItem | null>(null);
  const replaceFileInputRef = useRef<HTMLInputElement | null>(null);

  const fetchItems = useCallback(async (isBackground = false) => {
    if (!isBackground) {
      setIsLoading(true);
      setLoadingLabel('Actualizando lista de emisión...');
    }
    try {
      const data = await api.getPlaylist();
      setItems(data.items);
      setErrorMessage(null);
    } catch (e: any) {
      const detail = e instanceof Error ? e.message : 'Error al cargar la lista de emisión';
      setErrorMessage(`No se pudo cargar la programación: ${detail}`);
      console.error('Error al cargar playlist:', e);
    } finally {
      if (!isBackground) {
        setIsLoading(false);
        setLoadingLabel(undefined);
      }
    }
  }, []);

  useEffect(() => {
    fetchItems(false);
  }, [fetchItems, refreshTrigger]);

  // Chequeo periódico no bloqueante cada 15 segundos como respaldo
  useEffect(() => {
    const timer = setInterval(() => {
      fetchItems(true);
    }, 15000);
    return () => clearInterval(timer);
  }, [fetchItems]);

  // Cerrar menú contextual al hacer clic global o presionar Escape
  useEffect(() => {
    const handleGlobalClick = () => {
      setContextMenu(null);
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setContextMenu(null);
      }
    };
    window.addEventListener('click', handleGlobalClick);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('click', handleGlobalClick);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleExecuteReplaceFile = useCallback(async (itemId: number, filePath: string, title?: string, durationMs?: number) => {
    try {
      await api.replaceItemFile(itemId, filePath, title, durationMs);
      setErrorMessage(null);
      fetchItems(true);
    } catch (e: any) {
      setErrorMessage(`Error al reemplazar archivo: ${e.message || e}`);
    }
  }, [fetchItems]);

  const handleTriggerReplaceFile = useCallback(async (item: PlaylistItem) => {
    setItemToReplace(item);
    if ((window as any).electronAPI?.openVideoDialog) {
      try {
        const paths: string[] = await (window as any).electronAPI.openVideoDialog();
        if (paths && paths.length > 0) {
          await handleExecuteReplaceFile(item.id, paths[0]);
        }
      } catch (err: any) {
        setErrorMessage(`Error al seleccionar reemplazo: ${err.message || err}`);
      }
    } else {
      replaceFileInputRef.current?.click();
    }
  }, [handleExecuteReplaceFile]);

  const handleBrowserReplaceFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !itemToReplace) return;
    let realPath = (file as any).path || file.name;
    if ((window as any).electronAPI?.getPathForFile) {
      try {
        const p = (window as any).electronAPI.getPathForFile(file);
        if (p) realPath = p;
      } catch { }
    }
    const title = file.name.replace(/\.[^/.]+$/, '');
    await handleExecuteReplaceFile(itemToReplace.id, realPath, title, 0);
    if (replaceFileInputRef.current) replaceFileInputRef.current.value = '';
  }, [handleExecuteReplaceFile, itemToReplace]);

  const handlePlayDirect = useCallback(async (id: number) => {
    try {
      await api.play(id);
      setErrorMessage(null);
    } catch (e: any) {
      setErrorMessage(`Error al reproducir el evento: ${e.message || e}`);
    }
  }, []);

  const handleMoveUp = useCallback(async (customIdx?: number) => {
    let targetIdx = customIdx;
    if (targetIdx === undefined) {
      targetIdx = items.findIndex(it => selectedIds.has(it.id));
    }
    if (targetIdx <= 0 || targetIdx >= items.length) return;
    try {
      const newItems = [...items];
      const temp = newItems[targetIdx];
      newItems[targetIdx] = newItems[targetIdx - 1];
      newItems[targetIdx - 1] = temp;
      setItems(newItems);
      await api.reorderItems(newItems.map(i => i.id));
      setErrorMessage(null);
    } catch (e: any) {
      setErrorMessage(`Error al mover hacia arriba: ${e.message || e}`);
      fetchItems(true);
    }
  }, [items, selectedIds, fetchItems]);

  const handleMoveDown = useCallback(async (customIdx?: number) => {
    let targetIdx = customIdx;
    if (targetIdx === undefined) {
      targetIdx = items.findIndex(it => selectedIds.has(it.id));
    }
    if (targetIdx < 0 || targetIdx >= items.length - 1) return;
    try {
      const newItems = [...items];
      const temp = newItems[targetIdx];
      newItems[targetIdx] = newItems[targetIdx + 1];
      newItems[targetIdx + 1] = temp;
      setItems(newItems);
      await api.reorderItems(newItems.map(i => i.id));
      setErrorMessage(null);
    } catch (e: any) {
      setErrorMessage(`Error al mover hacia abajo: ${e.message || e}`);
      fetchItems(true);
    }
  }, [items, selectedIds, fetchItems]);

  const handleToggleGraphics = useCallback(async (itemId: number, nextVal: boolean) => {
    try {
      await api.toggleItemGraphics(itemId, nextVal);
      fetchItems(true);
    } catch (e: any) {
      setErrorMessage(`Error al actualizar estado de gráficos: ${e.message || e}`);
    }
  }, [fetchItems]);

  const handleDeleteSelected = useCallback(() => {
    if (selectedIds.size === 0) {
      setErrorMessage("No hay ningún video o evento seleccionado en la lista. Por favor, haga clic sobre una fila para seleccionarla antes de presionar 'Eliminar'.");
      return;
    }
    const toDelete = items.filter(it => selectedIds.has(it.id));
    setItemsToDelete(toDelete);
    setIsClearAllModal(false);
    setIsDeleteModalOpen(true);
  }, [items, selectedIds]);

  const handleClear = useCallback(() => {
    if (items.length === 0) {
      setErrorMessage("La lista de emisión ya se encuentra vacía. No hay elementos para limpiar.");
      return;
    }
    setItemsToDelete([]);
    setIsClearAllModal(true);
    setIsDeleteModalOpen(true);
  }, [items.length]);

  const handleConfirmDelete = useCallback(async () => {
    if (isClearAllModal) {
      try {
        await api.clearPlaylist();
        setSelectedIds(new Set());
        setAnchorId(null);
        setErrorMessage(null);
        fetchItems(true);
      } catch (e: any) {
        setErrorMessage(`Error al vaciar la lista: ${e.message || e}`);
      }
    } else if (itemsToDelete.length > 0) {
      try {
        if (itemsToDelete.length === 1) {
          await api.deleteItem(itemsToDelete[0].id);
        } else {
          await api.deleteBatch(itemsToDelete.map(it => it.id));
        }
        setSelectedIds(new Set());
        setAnchorId(null);
        setErrorMessage(null);
        fetchItems(true);
      } catch (e: any) {
        setErrorMessage(`Error al eliminar elementos: ${e.message || e}`);
      }
    }
  }, [isClearAllModal, itemsToDelete, fetchItems]);

  const handleSelectRow = useCallback((e: React.MouseEvent, index: number) => {
    const clickedItem = items[index];
    if (!clickedItem) return;

    if (e.ctrlKey || e.metaKey) {
      setSelectedIds(prev => {
        const next = new Set(prev);
        if (next.has(clickedItem.id)) next.delete(clickedItem.id);
        else next.add(clickedItem.id);
        return next;
      });
      setAnchorId(clickedItem.id);
    } else if (e.shiftKey && anchorId !== null) {
      const anchorIdx = items.findIndex(it => it.id === anchorId);
      const start = Math.min(anchorIdx >= 0 ? anchorIdx : index, index);
      const end = Math.max(anchorIdx >= 0 ? anchorIdx : index, index);
      const range = new Set<number>();
      for (let i = start; i <= end; i++) {
        range.add(items[i].id);
      }
      setSelectedIds(range);
    } else {
      setSelectedIds(new Set([clickedItem.id]));
      setAnchorId(clickedItem.id);
    }
  }, [items, anchorId]);

  const handleContextMenu = useCallback((e: React.MouseEvent, item: PlaylistItem, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (!selectedIds.has(item.id)) {
      setSelectedIds(new Set([item.id]));
      setAnchorId(item.id);
    }
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      item,
      index
    });
  }, [selectedIds]);

  const handleOpenTrimModal = useCallback((item: PlaylistItem) => {
    setTrimTargetItem(item);
    setIsTrimModalOpen(true);
  }, []);

  const handleSaveTrim = useCallback(async (
    itemId: number,
    newDurationMs: number,
    inPointMs: number,
    outPointMs: number
  ) => {
    try {
      await api.updateItem(itemId, {
        duration_ms: newDurationMs,
        in_point_ms: inPointMs,
        out_point_ms: outPointMs
      });
      setErrorMessage(null);
      await fetchItems(true);
    } catch (e: any) {
      setErrorMessage(`Fallo al aplicar recorte de video: ${e.message || e}`);
      throw e;
    }
  }, [fetchItems]);

  // Drag & drop sorting of rows
  const handleDragStartRow = useCallback((e: React.DragEvent, index: number) => {
    setDraggedRowIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  const handleDragOverRow = useCallback((e: React.DragEvent, _index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleDropRow = useCallback(async (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedRowIndex === null || draggedRowIndex === dropIndex) return;

    const newItems = [...items];
    const draggedItem = newItems.splice(draggedRowIndex, 1)[0];
    newItems.splice(dropIndex, 0, draggedItem);

    setItems(newItems);
    setDraggedRowIndex(null);

    try {
      await api.reorderItems(newItems.map(i => i.id));
      setErrorMessage(null);
    } catch (err: any) {
      setErrorMessage(`Error al guardar nuevo orden: ${err.message || err}`);
      fetchItems(true);
    }
  }, [draggedRowIndex, items, fetchItems]);

  // Drag & drop files onto table from Windows Explorer
  const handleDragOverTable = useCallback((e: React.DragEvent) => {
    if (e.dataTransfer.types && Array.from(e.dataTransfer.types).includes('Files')) {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(true);
    }
  }, []);

  const handleDragLeaveTable = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDropFiles = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files || []);
    if (files.length === 0) return;

    setIsLoading(true);
    setLoadingLabel(`Cargando y analizando ${files.length} archivo(s) multimedia...`);
    try {
      const toAdd = files.map((file) => {
        let realPath = (file as any).path || file.name;
        if ((window as any).electronAPI?.getPathForFile) {
          try {
            const p = (window as any).electronAPI.getPathForFile(file);
            if (p) realPath = p;
          } catch { }
        }
        const title = file.name.replace(/\.[^/.]+$/, "");
        const isCommercial = isCommercialMedia(title);
        return {
          title,
          file_path: realPath,
          event_type: isCommercial ? ('COMMERCIAL' as const) : ('VIDEO' as const),
          duration_ms: 0,
          show_graphics: !isCommercial,
          timing_mode: 'AUTO_FOLLOW' as const
        };
      });

      await api.addItems(toAdd);
      setErrorMessage(null);
      await fetchItems(true);
    } catch (e: any) {
      setErrorMessage(`Error al agregar videos arrastrados: ${e.message || e}`);
    } finally {
      setIsLoading(false);
      setLoadingLabel(undefined);
    }
  }, [fetchItems]);

  // Navegación y atajos de teclado para selección y borrado rápido
  useEffect(() => {
    const handleTableKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedIds.size > 0 && !isDeleteModalOpen) {
          e.preventDefault();
          handleDeleteSelected();
        }
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'a' || e.key === 'A')) {
        e.preventDefault();
        setSelectedIds(new Set(items.map(it => it.id)));
      }
    };

    window.addEventListener('keydown', handleTableKeyDown);
    return () => window.removeEventListener('keydown', handleTableKeyDown);
  }, [selectedIds, isDeleteModalOpen, handleDeleteSelected, items]);

  // Formato oficial de Bolivia (BOT, UTC-4)
  const formatBoliviaTime = useCallback((ms: number, baseDateMs: number = Date.now()) => {
    if (ms <= 0) return '--:--:--';
    const d = new Date(ms);
    const timeStr = d.toLocaleTimeString('es-BO', {
      timeZone: 'America/La_Paz',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });

    const diffDays = Math.floor((ms - baseDateMs) / (24 * 3600 * 1000));
    if (diffDays >= 1) {
      return `${timeStr} (+${diffDays}d)`;
    }
    return timeStr;
  }, []);

  const isAirActive = Boolean(
    playoutState &&
    (playoutState.state === 'PLAYING' ||
      playoutState.state === 'PAUSED' ||
      playoutState.state === 'LIVE_SDI' ||
      playoutState.state === 'LIVE_NDI')
  );

  const onAirId = playoutState?.currentItem?.id ?? null;
  const currentElapsed = isAirActive ? (playoutState?.elapsedMs || 0) : 0;
  const onAirEffectiveDuration = playoutState?.remainingMs !== undefined
    ? currentElapsed + playoutState.remainingMs
    : 0;

  // Cálculo memoizado de cronograma para evitar recálculos en cada tick (10 Hz)
  const scheduledTimeline = useMemo(() => {
    const now = Date.now();
    const timelineTimes: { startMs: number; endMs: number; unknownDur?: boolean }[] = new Array(items.length);

    if (items.length > 0) {
      const activeIdx = onAirId !== null ? items.findIndex(it => it.id === onAirId) : currentIndex;

      if (isAirActive && activeIdx >= 0 && activeIdx < items.length) {
        // Elemento al aire: anclado al transcurrido real
        const currentItemDur = onAirEffectiveDuration > 0
          ? onAirEffectiveDuration
          : ((items[activeIdx].out_point_ms && items[activeIdx].out_point_ms > (items[activeIdx].in_point_ms || 0))
              ? (items[activeIdx].out_point_ms - (items[activeIdx].in_point_ms || 0))
              : (items[activeIdx].duration_ms || 0));

        const currentStart = now - currentElapsed;
        const currentEnd = currentItemDur > 0 ? currentStart + currentItemDur : currentStart;
        timelineTimes[activeIdx] = { startMs: currentStart, endMs: currentEnd, unknownDur: currentItemDur === 0 };

        // Hacia atrás
        let prevEnd = currentStart;
        for (let i = activeIdx - 1; i >= 0; i--) {
          const it = items[i];
          if (!it) continue;
          const effectiveDur = (it.out_point_ms && it.out_point_ms > (it.in_point_ms || 0))
            ? (it.out_point_ms - (it.in_point_ms || 0))
            : (it.duration_ms || 0);
          const prevStart = prevEnd - effectiveDur;
          timelineTimes[i] = { startMs: prevStart, endMs: prevEnd, unknownDur: effectiveDur === 0 };
          prevEnd = prevStart;
        }

        // Hacia adelante
        let nextStart = currentEnd;
        let hasUnknownAhead = currentItemDur === 0;
        for (let i = activeIdx + 1; i < items.length; i++) {
          const it = items[i];
          if (!it) continue;
          const effectiveDur = (it.out_point_ms && it.out_point_ms > (it.in_point_ms || 0))
            ? (it.out_point_ms - (it.in_point_ms || 0))
            : (it.duration_ms || 0);

          if (hasUnknownAhead || effectiveDur === 0) {
            timelineTimes[i] = { startMs: 0, endMs: 0, unknownDur: true };
            hasUnknownAhead = true;
          } else {
            const nextEnd = nextStart + effectiveDur;
            timelineTimes[i] = { startMs: nextStart, endMs: nextEnd, unknownDur: false };
            nextStart = nextEnd;
          }
        }
      } else {
        // En reposo: proyecta cuándo entraría cada video si se inicia ahora
        let accTime = now;
        let hasUnknown = false;
        for (let i = 0; i < items.length; i++) {
          const it = items[i];
          if (!it) continue;
          const effectiveDur = (it.out_point_ms && it.out_point_ms > (it.in_point_ms || 0))
            ? (it.out_point_ms - (it.in_point_ms || 0))
            : (it.duration_ms || 0);

          if (hasUnknown || effectiveDur === 0) {
            timelineTimes[i] = { startMs: 0, endMs: 0, unknownDur: true };
            hasUnknown = true;
          } else {
            const end = accTime + effectiveDur;
            timelineTimes[i] = { startMs: accTime, endMs: end, unknownDur: false };
            accTime = end;
          }
        }
      }
    }

    return items.map((item, idx) => {
      const times = timelineTimes[idx] || { startMs: 0, endMs: 0, unknownDur: true };
      return {
        ...item,
        startFormatted: times.unknownDur && times.startMs === 0 ? '--:--:--' : formatBoliviaTime(times.startMs, now),
        endFormatted: times.unknownDur && times.endMs === 0 ? '--:--:--' : formatBoliviaTime(times.endMs, now),
        startMs: times.startMs,
        endMs: times.endMs
      };
    });
  }, [items, onAirId, currentIndex, isAirActive, onAirEffectiveDuration, currentElapsed, formatBoliviaTime]);

  const totalDurationMs = useMemo(() => {
    return items.reduce((acc, i) => {
      const dur = (i.out_point_ms && i.out_point_ms > (i.in_point_ms || 0))
        ? (i.out_point_ms - (i.in_point_ms || 0))
        : (i.duration_ms || 0);
      return acc + dur;
    }, 0);
  }, [items]);

  const projectedEndTime = useMemo(() => {
    if (scheduledTimeline.length === 0) return null;
    const last = scheduledTimeline[scheduledTimeline.length - 1];
    return last && last.endMs > 0 ? new Date(last.endMs) : null;
  }, [scheduledTimeline]);

  const currentItem = useMemo(() => {
    if (onAirId !== null) {
      return items.find(it => it.id === onAirId) || null;
    }
    return currentIndex >= 0 && currentIndex < items.length ? items[currentIndex] : null;
  }, [items, onAirId, currentIndex]);

  const hasUnknownDurations = useMemo(() => {
    return items.some(i => {
      const dur = (i.out_point_ms && i.out_point_ms > (i.in_point_ms || 0))
        ? (i.out_point_ms - (i.in_point_ms || 0))
        : (i.duration_ms || 0);
      return dur === 0;
    });
  }, [items]);

  const missingCount = useMemo(() => {
    return items.filter(it => it.file_exists === false || it.status === 'FILE_CORRUPT_OR_MISSING').length;
  }, [items]);

  const handleOpenPurgeMissingModal = useCallback(() => {
    const missingItems = items.filter(it => it.file_exists === false || it.status === 'FILE_CORRUPT_OR_MISSING');
    if (missingItems.length === 0) return;
    setItemsToDelete(missingItems);
    setIsClearAllModal(false);
    setIsDeleteModalOpen(true);
  }, [items]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>
      <PlaylistSummary
        totalItems={items.length}
        totalDurationMs={totalDurationMs}
        projectedEndTime={projectedEndTime}
        onAirItemTitle={isAirActive && currentItem ? currentItem.title : undefined}
        isCommercialOnAir={Boolean(isAirActive && currentItem && (currentItem.event_type === 'COMMERCIAL' || isCommercialMedia(currentItem.title)))}
        missingCount={missingCount}
        onClearMissing={missingCount > 0 ? handleOpenPurgeMissingModal : undefined}
        remainingMs={isAirActive ? (playoutState?.remainingMs || 0) : 0}
        isOnAir={Boolean(isAirActive)}
        engineState={playoutState?.state || 'IDLE'}
        hasUnknownDurations={hasUnknownDurations}
      />

      <PlaylistToolbar
        onRefresh={() => fetchItems(false)}
        onMoveUp={() => handleMoveUp()}
        onMoveDown={() => handleMoveDown()}
        onDeleteSelected={handleDeleteSelected}
        onClear={handleClear}
        hasSelection={selectedIds.size > 0}
        onOpenLiveModal={onOpenLiveModal}
        onOpenLiveSdiModal={onOpenLiveSdiModal}
        onOpenLiveNdiModal={onOpenLiveNdiModal}
        loop={Boolean(playoutState?.loop)}
        onToggleLoop={async () => {
          try {
            await api.setLoop(!playoutState?.loop);
          } catch (err: any) {
            setErrorMessage(`Error al cambiar modo bucle: ${err.message || err}`);
          }
        }}
      />

      {errorMessage && (
        <ErrorAlertBanner
          title="Aviso de Programación"
          message={errorMessage}
          onRetry={() => fetchItems(false)}
          onDismiss={() => setErrorMessage(null)}
        />
      )}

      {isDragOver && (
        <div
          style={{
            position: 'absolute',
            top: 86,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(12, 13, 18, 0.94)',
            border: '2px dashed var(--apple-blue)',
            zIndex: 100,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none'
          }}
        >
          <UploadCloud size={44} color="var(--apple-blue)" />
          <div style={{ color: '#fff', fontSize: 13, fontWeight: 500, marginTop: 12 }}>
            Soltar archivos de video para agregar al Playlist
          </div>
          <div style={{ color: 'var(--text-secondary)', fontSize: 12, marginTop: 4 }}>
            Cálculo automático de duración, ruta y formato
          </div>
        </div>
      )}

      {/* Contenedor de Tabla con Loader Pinned Estacionario (Zero Saltos de Layout) */}
      <div style={{ flex: 1, minHeight: 0, position: 'relative', display: 'flex', flexDirection: 'column' }}>
        <LinearLoader active={isLoading} label={loadingLabel} />

        <div
          className="table-scroll-container"
          onDragOver={handleDragOverTable}
          onDragLeave={handleDragLeaveTable}
          onDrop={handleDropFiles}
        >
          <table className="playlist-table">
            <thead>
              <tr>
                <th style={{ width: 58, minWidth: 58, maxWidth: 60, textAlign: 'center' }}>#</th>
                <th style={{ width: 80, minWidth: 80 }}>Inicio</th>
                <th style={{ width: 80, minWidth: 80 }}>Estado</th>
                <th style={{ width: 38, minWidth: 38, textAlign: 'center' }} title="Control de Gráficos al Aire (CG / Logo / Reloj)">CG</th>
                <th style={{ width: 95, minWidth: 95 }}>Duración</th>
                <th>Archivo / Emisión</th>
              </tr>
            </thead>
            <tbody>
              {scheduledTimeline.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: 60, color: 'var(--text-tertiary)' }}>
                    <UploadCloud size={34} style={{ display: 'block', margin: '0 auto 10px', opacity: 0.4 }} />
                    <div style={{ color: 'var(--text-secondary)', fontWeight: 500, fontSize: 12.5 }}>Lista de emisión vacía</div>
                    <div style={{ fontSize: 12, marginTop: 4 }}>
                      Arrastre archivos de video aquí o use el botón "Agregar Videos"
                    </div>
                  </td>
                </tr>
              ) : (
                scheduledTimeline.map((item, index) => {
                  // W1/P2 (M8): solo marcar al aire lo que Rust confirma vía onAirId.
                  // Si onAirId === null, Rust no ha confirmado nada → ningún elemento se marca.
                  const isItemOnAir = Boolean(isAirActive && onAirId !== null && item.id === onAirId);
                  const isItemPlayed = item.status === 'PLAYED' || item.status === 'PLAYED_SUCCESS';
                  const isSelected = selectedIds.has(item.id);
                  // N2: el perfil activo viene de Rust; si no hay telemetría, mostrar '--' sin inventar valor
                  const activeProfile = playoutState?.broadcastStandard?.profile || '--';
                  return (
                    <PlaylistRow
                      key={item.id}
                      item={item}
                      index={index}
                      isSelected={isSelected}
                      isOnAir={isItemOnAir}
                      isPlayed={isItemPlayed}
                      activeProfile={activeProfile}
                      startTimeStr={item.startFormatted}
                      endTimeStr={item.endFormatted}
                      onSelect={handleSelectRow}
                      onContextMenu={handleContextMenu}
                      onDoubleClick={handleOpenTrimModal}
                      onDragStart={handleDragStartRow}
                      onDragOver={handleDragOverRow}
                      onDropRow={handleDropRow}
                      onToggleGraphics={handleToggleGraphics}
                    />
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Menú Contextual (Clic Derecho en Electron y Web) */}
      {contextMenu && (
        <div
          className="playlist-context-menu"
          style={{
            position: 'fixed',
            top: Math.min(contextMenu.y, window.innerHeight - 250),
            left: Math.min(contextMenu.x, window.innerWidth - 240),
            zIndex: 99999,
            minWidth: 230
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className="context-menu-item"
            onClick={() => {
              handlePlayDirect(contextMenu.item.id);
              setContextMenu(null);
            }}
          >
            <Play size={14} color="var(--apple-green)" />
            <span style={{ fontWeight: 500 }}>Reproducir Ahora (Al Aire)</span>
          </div>

          <div
            className="context-menu-item"
            onClick={() => {
              handleOpenTrimModal(contextMenu.item);
              setContextMenu(null);
            }}
          >
            <Scissors size={14} color="var(--apple-cyan)" />
            <span>Recortar Video (Trim IN / OUT)...</span>
          </div>

          <div
            className="context-menu-item"
            onClick={() => {
              handleTriggerReplaceFile(contextMenu.item);
              setContextMenu(null);
            }}
          >
            <FolderOpen size={14} color="var(--apple-blue)" />
            <span>Reemplazar Archivo Físico...</span>
          </div>

          <div
            className="context-menu-item"
            onClick={async () => {
              const newType = contextMenu.item.event_type === 'COMMERCIAL' ? 'VIDEO' : 'COMMERCIAL';
              try {
                await api.updateItem(contextMenu.item.id, {
                  event_type: newType,
                  show_graphics: newType !== 'COMMERCIAL'
                });
                fetchItems(true);
              } catch (e: any) {
                setErrorMessage(`Error al cambiar tipo: ${e.message || e}`);
              }
              setContextMenu(null);
            }}
          >
            <Tag size={14} color="var(--apple-orange, #ff9500)" />
            <span>
              {contextMenu.item.event_type === 'COMMERCIAL'
                ? 'Marcar como Programa / Video'
                : 'Marcar como Tanda / Publicidad'}
            </span>
          </div>

          <div
            className="context-menu-item"
            onClick={() => {
              handleToggleGraphics(contextMenu.item.id, !contextMenu.item.show_graphics);
              setContextMenu(null);
            }}
          >
            {contextMenu.item.show_graphics ? (
              <>
                <EyeOff size={14} color="var(--apple-gray, #8e8e93)" />
                <span>Desactivar CG en este video (Limpio)</span>
              </>
            ) : (
              <>
                <Sparkles size={14} color="var(--apple-green, #30d158)" />
                <span>Activar CG en este video</span>
              </>
            )}
          </div>

          <div className="context-menu-divider" />

          <div
            className="context-menu-item"
            onClick={() => {
              handleMoveUp(contextMenu.index);
              setContextMenu(null);
            }}
          >
            <ArrowUp size={14} />
            <span>Subir Posición</span>
          </div>

          <div
            className="context-menu-item"
            onClick={() => {
              handleMoveDown(contextMenu.index);
              setContextMenu(null);
            }}
          >
            <ArrowDown size={14} />
            <span>Bajar Posición</span>
          </div>

          <div className="context-menu-divider" />

          <div
            className="context-menu-item"
            onClick={async () => {
              try {
                await api.addItems([{
                  title: 'EN VIVO - SDI DECKLINK',
                  file_path: 'sdi-in-1',
                  event_type: 'LIVE_SDI',
                  duration_ms: 0,
                  timing_mode: 'AUTO_FOLLOW'
                }], contextMenu.index + 1);
                fetchItems(true);
              } catch (e: any) {
                setErrorMessage(`Error al insertar vivo SDI: ${e.message || e}`);
              }
              setContextMenu(null);
            }}
          >
            <Play size={14} color="var(--apple-blue, #007aff)" />
            <span>Insertar Vivo SDI Aquí</span>
          </div>

          <div
            className="context-menu-item"
            onClick={async () => {
              try {
                await api.addItems([{
                  title: 'EN VIVO - NDI RED IP',
                  file_path: 'ndi:default',
                  event_type: 'LIVE_NDI',
                  duration_ms: 0,
                  timing_mode: 'AUTO_FOLLOW'
                }], contextMenu.index + 1);
                fetchItems(true);
              } catch (e: any) {
                setErrorMessage(`Error al insertar vivo NDI: ${e.message || e}`);
              }
              setContextMenu(null);
            }}
          >
            <Play size={14} color="var(--apple-indigo, #5e5ce6)" />
            <span>Insertar Vivo NDI Aquí</span>
          </div>

          <div className="context-menu-divider" />

          <div
            className="context-menu-item danger"
            onClick={() => {
              setItemsToDelete([contextMenu.item]);
              setIsClearAllModal(false);
              setIsDeleteModalOpen(true);
              setContextMenu(null);
            }}
          >
            <Trash2 size={14} color="var(--apple-red)" />
            <span style={{ color: 'var(--apple-red)', fontWeight: 500 }}>Eliminar de la Lista</span>
          </div>
        </div>
      )}

      {/* Modal de Recorte IN/OUT */}
      <TrimModal
        item={trimTargetItem}
        isOpen={isTrimModalOpen}
        onClose={() => {
          setIsTrimModalOpen(false);
          setTrimTargetItem(null);
        }}
        onSaveTrim={handleSaveTrim}
      />

      {/* Modal de Confirmación de Borrado con Estética Broadcast */}
      <DeleteConfirmModal
        isOpen={isDeleteModalOpen}
        item={itemsToDelete.length === 1 ? itemsToDelete[0] : null}
        isClearAll={isClearAllModal}
        itemCount={itemsToDelete.length > 1 ? itemsToDelete.length : items.length}
        isAirActive={isAirActive}
        onConfirm={handleConfirmDelete}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setItemsToDelete([]);
          setIsClearAllModal(false);
        }}
      />
    </div>
  );
};
