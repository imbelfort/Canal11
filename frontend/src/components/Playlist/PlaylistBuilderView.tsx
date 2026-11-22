import React, { useState, useEffect, useRef, useMemo } from 'react';
import { api } from '../../services/api';
import { AddPlaylistItemDto } from '../../types/playout';
import { getMediaDuration, isCommercialMedia } from './PlaylistToolbar';
import { NetworkModal } from '../Network/NetworkModal';
import { TrimModal } from './TrimModal';
import {
  BuilderItem,
  PendingReplace,
  ContextMenuState,
  formatDuration
} from './Builder/types';
import { BuilderHeaderCards } from './Builder/BuilderHeaderCards';
import { BuilderToolbar } from './Builder/BuilderToolbar';
import { BuilderTable } from './Builder/BuilderTable';
import { BuilderContextMenu } from './Builder/BuilderContextMenu';
import { ReplaceOccurrencesModal, BatchReplaceModal } from './Builder/BuilderModals';
import { LinearLoader } from '../Common/LinearLoader';
import {
  CalendarClock,
  ArrowLeft,
  Network,
  Check,
  AlertCircle
} from 'lucide-react';

interface PlaylistBuilderViewProps {
  onLoadToDeckSuccess?: () => void;
  onNavigateToDeck?: () => void;
}

export const PlaylistBuilderView: React.FC<PlaylistBuilderViewProps> = ({
  onLoadToDeckSuccess,
  onNavigateToDeck
}) => {
  // ==========================================
  // ESTADO PRINCIPAL DE LA LISTA DE PLANIFICACIÓN
  // ==========================================
  const [items, setItems] = useState<BuilderItem[]>(() => {
    try {
      const saved = localStorage.getItem('ibcast_playlist_builder');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch { }
    return [];
  });

  const [startTimeStr, setStartTimeStr] = useState<string>(() => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(now.getHours())}:${pad(now.getMinutes())}:00`;
  });

  // Estados de modales y navegación
  const [isSendingToDeck, setIsSendingToDeck] = useState(false);
  const [isNetworkModalOpen, setIsNetworkModalOpen] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Edición rápida de duración (para vivos o estimaciones manuales)
  const [editingDurationId, setEditingDurationId] = useState<string | null>(null);
  const [editDurationMin, setEditDurationMin] = useState<number>(60);

  // Recorte Trim (IN / OUT)
  const [trimTargetItem, setTrimTargetItem] = useState<BuilderItem | null>(null);
  const [isTrimModalOpen, setIsTrimModalOpen] = useState(false);

  // Menú contextual
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

  // Multi-selección para cálculo de duración de bloques/tandas
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null);

  // Arrastre con ratón (HTML5 Drag & Drop)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  // Reemplazo en lote y detección de repeticiones
  const [pendingReplace, setPendingReplace] = useState<PendingReplace | null>(null);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [itemToReplace, setItemToReplace] = useState<BuilderItem | null>(null);

  // Mapa de integridad física de archivos en disco
  const [fileStatusMap, setFileStatusMap] = useState<Record<string, boolean>>({});
  const [isValidatingFiles, setIsValidatingFiles] = useState<boolean>(false);
  const [validationLabel, setValidationLabel] = useState<string | undefined>(undefined);

  // Referencias a inputs de archivos ocultos
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const openPlaylistFileRef = useRef<HTMLInputElement | null>(null);
  const replaceBuilderFileInputRef = useRef<HTMLInputElement | null>(null);

  // Caché de verificación
  const checkTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastCheckedHashRef = useRef<string>('');
  const lastCheckTimeRef = useRef<number>(0);

  // ==========================================
  // VERIFICACIÓN INTELIGENTE DE ARCHIVOS EN DISCO
  // ==========================================
  const verifyItemsFiles = async (itemsToCheck: BuilderItem[], force = false) => {
    const uniquePaths = Array.from(new Set(
      itemsToCheck
        .filter(it => it.event_type !== 'LIVE_SDI' && it.event_type !== 'LIVE_NDI' && it.file_path && !it.file_path.toLowerCase().startsWith('sdi') && !it.file_path.toLowerCase().startsWith('ndi'))
        .map(it => it.file_path.trim())
    )).filter(Boolean);

    if (uniquePaths.length === 0) return;

    const pathsHash = uniquePaths.slice().sort().join('|');
    const now = Date.now();

    if (!force && pathsHash === lastCheckedHashRef.current && (now - lastCheckTimeRef.current < 8000)) {
      return;
    }

    lastCheckedHashRef.current = pathsHash;
    lastCheckTimeRef.current = now;

    setIsValidatingFiles(true);
    setValidationLabel('Verificando existencia e integridad física de archivos en disco...');
    try {
      const results = await api.validateBatch(uniquePaths);
      const nextMap: Record<string, boolean> = {};
      for (const [p, res] of Object.entries(results)) {
        const isValid = Boolean(res?.valid);
        nextMap[p] = isValid;
        nextMap[p.trim()] = isValid;
        nextMap[p.replace(/\\/g, '/')] = isValid;
        nextMap[p.replace(/\//g, '\\')] = isValid;
      }
      setFileStatusMap(prev => ({ ...prev, ...nextMap }));
    } catch (err) {
      console.error('Error al validar lote de archivos:', err);
    } finally {
      setIsValidatingFiles(false);
      setValidationLabel(undefined);
    }
  };

  useEffect(() => {
    if (checkTimerRef.current) clearTimeout(checkTimerRef.current);
    checkTimerRef.current = setTimeout(() => {
      verifyItemsFiles(items);
    }, 400);
    return () => {
      if (checkTimerRef.current) clearTimeout(checkTimerRef.current);
    };
  }, [items]);

  useEffect(() => {
    const interval = setInterval(() => {
      verifyItemsFiles(items, true);
    }, 12000);
    return () => clearInterval(interval);
  }, [items]);

  // Auto-guardado en localStorage
  useEffect(() => {
    try {
      localStorage.setItem('ibcast_playlist_builder', JSON.stringify(items));
    } catch { }
  }, [items]);

  // Cerrar menú contextual al hacer clic fuera
  useEffect(() => {
    const handleGlobalClick = () => setContextMenu(null);
    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
  }, []);

  // ==========================================
  // MULTI-SELECCIÓN Y CÁLCULO DE DURACIÓN DE BLOQUES
  // ==========================================
  const handleRowClick = (e: React.MouseEvent, item: BuilderItem, index: number) => {
    if ((e.target as HTMLElement).closest('button, input, select, a')) return;

    if (e.ctrlKey || e.metaKey) {
      setSelectedIds(prev => {
        const next = new Set(prev);
        if (next.has(item.id)) next.delete(item.id);
        else next.add(item.id);
        return next;
      });
      setLastSelectedIndex(index);
    } else if (e.shiftKey && lastSelectedIndex !== null) {
      const start = Math.min(lastSelectedIndex, index);
      const end = Math.max(lastSelectedIndex, index);
      const next = new Set(selectedIds);
      for (let i = start; i <= end; i++) {
        next.add(items[i].id);
      }
      setSelectedIds(next);
    } else {
      if (selectedIds.has(item.id) && selectedIds.size === 1) {
        setSelectedIds(new Set());
        setLastSelectedIndex(null);
      } else {
        setSelectedIds(new Set([item.id]));
        setLastSelectedIndex(index);
      }
    }
  };

  const handleDeleteSelected = () => {
    if (selectedIds.size === 0) return;
    const count = selectedIds.size;
    if (count > 1) {
      if (!window.confirm(`¿Deseas eliminar los ${count} elementos seleccionados de la pauta?`)) return;
    }
    setItems(prev => prev.filter(it => !selectedIds.has(it.id)));
    setSelectedIds(new Set());
    setNotification({ message: `${count} elementos eliminados de la pauta`, type: 'success' });
  };

  const handleToggleSelectedCG = () => {
    if (selectedIds.size === 0) return;
    setItems(prev => prev.map(it => {
      if (selectedIds.has(it.id)) {
        return { ...it, show_graphics: !it.show_graphics };
      }
      return it;
    }));
    setNotification({ message: `Gráficos CG actualizados en ${selectedIds.size} elementos seleccionados`, type: 'success' });
  };

  // Atajos de teclado para selección (Ctrl+A, Escape, Supr)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        setSelectedIds(new Set(items.map(it => it.id)));
      } else if (e.key === 'Escape') {
        setSelectedIds(new Set());
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedIds.size > 0) {
          e.preventDefault();
          handleDeleteSelected();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [items, selectedIds]);

  // ==========================================
  // ARRASTRE Y REORDENAMIENTO DE FILAS
  // ==========================================
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex) return;
    setItems(prev => {
      const copy = [...prev];
      const [moved] = copy.splice(draggedIndex, 1);
      copy.splice(targetIndex, 0, moved);
      return copy;
    });
    setDraggedIndex(null);
  };

  // ==========================================
  // RECORTE TRIM (IN / OUT)
  // ==========================================
  const handleOpenTrimModal = (item: BuilderItem) => {
    if (item.event_type.startsWith('LIVE')) {
      setNotification({ message: 'Los eventos en vivo no admiten recorte Trim', type: 'error' });
      return;
    }
    setTrimTargetItem(item);
    setIsTrimModalOpen(true);
  };

  const handleSaveTrim = (itemId: any, newDurationMs: number, inPointMs: number, outPointMs: number) => {
    setItems(prev => prev.map(it => it.id === itemId ? {
      ...it,
      duration_ms: newDurationMs,
      in_point_ms: inPointMs,
      out_point_ms: outPointMs
    } : it));
    setIsTrimModalOpen(false);
    setTrimTargetItem(null);
    setNotification({
      message: `Recorte aplicado: Duración ${formatDuration(newDurationMs)} (IN: ${(inPointMs / 1000).toFixed(1)}s, OUT: ${(outPointMs / 1000).toFixed(1)}s)`,
      type: 'success'
    });
  };

  const handleClearTrim = (itemId: string) => {
    setItems(prev => prev.map(it => {
      if (it.id === itemId) {
        const originalDur = it.out_point_ms && it.out_point_ms > 0 ? it.out_point_ms : it.duration_ms;
        return {
          ...it,
          in_point_ms: 0,
          out_point_ms: 0,
          duration_ms: originalDur
        };
      }
      return it;
    }));
    setNotification({ message: 'Recorte eliminado: se restauró la duración original', type: 'success' });
  };

  // ==========================================
  // REEMPLAZO DE ARCHIVO (INDIVIDUAL Y EN LOTE)
  // ==========================================
  const handleTriggerReplaceItem = async (item: BuilderItem) => {
    setItemToReplace(item);
    if ((window as any).electronAPI?.openVideoDialog) {
      try {
        const paths: string[] = await (window as any).electronAPI.openVideoDialog();
        if (paths && paths.length > 0) {
          await handleExecuteReplaceItem(item, paths[0]);
        }
      } catch (err: any) {
        setNotification({ message: `Error al seleccionar reemplazo: ${err.message}`, type: 'error' });
      }
    } else {
      replaceBuilderFileInputRef.current?.click();
    }
  };

  const handleExecuteReplaceItem = async (item: BuilderItem, newPath: string, newTitle?: string, durationMs?: number) => {
    let title = newTitle;
    let dur = durationMs;

    if (!title) {
      const filename = newPath.split(/[\\/]/).pop() || newPath;
      title = filename.replace(/\.[^/.]+$/, '');
    }

    if (!dur || dur <= 0) {
      try {
        const data: any = await api.probeMedia(newPath);
        if (data?.durationMs) dur = data.durationMs;
      } catch { }
    }
    if (!dur || dur <= 0) dur = 30000;

    const occurrences = items.filter(it => it.file_path === item.file_path).length;
    if (occurrences > 1) {
      setPendingReplace({
        targetItem: item,
        newPath,
        newTitle: title!,
        newDurationMs: dur!,
        occurrences
      });
    } else {
      applyFileReplacement(item, newPath, title!, dur!, false);
    }
  };

  const applyFileReplacement = (targetItem: BuilderItem, newPath: string, newTitle: string, durationMs: number, replaceAll: boolean) => {
    const isCom = isCommercialMedia(newTitle, newPath);

    setItems(prev => prev.map(it => {
      const isMatch = replaceAll
        ? it.file_path === targetItem.file_path
        : it.id === targetItem.id;

      if (isMatch) {
        return {
          ...it,
          file_path: newPath,
          title: newTitle,
          duration_ms: durationMs,
          in_point_ms: 0,
          out_point_ms: 0,
          event_type: isCom ? 'COMMERCIAL' : (it.event_type === 'COMMERCIAL' ? 'COMMERCIAL' : 'VIDEO'),
          show_graphics: !isCom
        };
      }
      return it;
    }));

    setFileStatusMap(prev => ({ ...prev, [newPath]: true }));
    setItemToReplace(null);
    setPendingReplace(null);

    if (replaceAll) {
      const count = items.filter(it => it.file_path === targetItem.file_path).length;
      setNotification({
        message: `Se reemplazaron exitosamente las ${count} repeticiones con "${newTitle}" (${formatDuration(durationMs)})`,
        type: 'success'
      });
    } else {
      setNotification({
        message: `Archivo reemplazado: "${newTitle}" (${formatDuration(durationMs)})`,
        type: 'success'
      });
    }
  };

  const handleBrowserReplaceBuilderFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !itemToReplace) return;

    let realPath = (file as any).path || file.name;
    if ((window as any).electronAPI?.getPathForFile) {
      try {
        const p = (window as any).electronAPI.getPathForFile(file);
        if (p) realPath = p;
      } catch { }
    }

    const durationMs = await getMediaDuration(file);
    const title = file.name.replace(/\.[^/.]+$/, '');
    await handleExecuteReplaceItem(itemToReplace, realPath, title, durationMs);
    if (replaceBuilderFileInputRef.current) replaceBuilderFileInputRef.current.value = '';
  };

  // Identificación precisa y estricta de señales en vivo (evita falsos positivos con archivos locales)
  const isItemLiveSignal = (item: BuilderItem) => {
    if (item.event_type === 'LIVE_SDI' || item.event_type === 'LIVE_NDI') return true;
    const p = String(item.file_path || '').trim().toLowerCase();
    return p.startsWith('sdi-in-') || p.startsWith('ndi:') || p.startsWith('ndi://') || p === 'ndi_default';
  };

  const isItemPathMissing = (item: BuilderItem) => {
    if (isItemLiveSignal(item)) return false;
    const p = String(item.file_path || '').trim();
    if (!p) return true;
    const status = fileStatusMap[p] ??
      fileStatusMap[p.replace(/\\/g, '/')] ??
      fileStatusMap[p.replace(/\//g, '\\')];
    return status === false || item.file_exists === false;
  };

  // Purgar todos los elementos faltantes de la planificación
  const handlePurgeAllMissing = () => {
    const count = missingItems.length;
    if (count === 0) return;
    if (window.confirm(`¿Deseas eliminar de la lista los ${count} elementos marcados en rojo cuyos archivos no existen en disco?`)) {
      setItems(prev => prev.filter(it => !isItemPathMissing(it)));
      setNotification({ message: `${count} elementos faltantes eliminados de la planificación`, type: 'success' });
    }
  };

  // ==========================================
  // FORMATO Y MÉTRICAS CALCULADAS
  // ==========================================
  const totalDurationMs = items.reduce((acc, it) => acc + (Number(it.duration_ms) || 0), 0);
  const totalCount = items.length;
  const videoCount = items.filter(it => it.event_type === 'VIDEO').length;
  const liveCount = items.filter(it => it.event_type.startsWith('LIVE')).length;
  const spotCount = items.filter(it => it.event_type === 'COMMERCIAL' || isCommercialMedia(it.title, it.file_path)).length;

  const selectedItems = items.filter(it => selectedIds.has(it.id));
  const selectedDurationMs = selectedItems.reduce((acc, it) => acc + (it.duration_ms || 0), 0);
  const selectedMinutesFormatted = (selectedDurationMs / 60000).toFixed(1);
  const selectedPct = totalDurationMs > 0 ? ((selectedDurationMs / totalDurationMs) * 100).toFixed(1) : '0';

  const repeatedGroups = useMemo(() => {
    const map = new Map<string, { title: string; file_path: string; count: number; totalMs: number; sampleItem: BuilderItem }>();
    for (const it of items) {
      if (it.event_type.startsWith('LIVE')) continue;
      const existing = map.get(it.file_path);
      if (existing) {
        existing.count += 1;
        existing.totalMs += it.duration_ms || 0;
      } else {
        map.set(it.file_path, {
          title: it.title,
          file_path: it.file_path,
          count: 1,
          totalMs: it.duration_ms || 0,
          sampleItem: it
        });
      }
    }
    return Array.from(map.values())
      .filter(g => g.count > 1)
      .sort((a, b) => b.count - a.count);
  }, [items]);

  const missingItems = items.filter(isItemPathMissing);
  const missingCount = missingItems.length;

  const getItemEstimatedStart = (itemIndex: number) => {
    let accumulatedMs = 0;
    for (let i = 0; i < itemIndex; i++) {
      accumulatedMs += items[i].duration_ms || 0;
    }

    const parts = startTimeStr.split(':').map(Number);
    const baseHour = isNaN(parts[0]) ? 0 : parts[0];
    const baseMin = isNaN(parts[1]) ? 0 : parts[1];
    const baseSec = isNaN(parts[2]) ? 0 : parts[2];

    const startTotalSec = baseHour * 3600 + baseMin * 60 + baseSec;
    const itemTotalSec = startTotalSec + Math.floor(accumulatedMs / 1000);

    const daysAhead = Math.floor(itemTotalSec / 86400);
    const h = Math.floor((itemTotalSec / 3600) % 24);
    const m = Math.floor((itemTotalSec % 3600) / 60);
    const s = Math.floor(itemTotalSec % 60);
    const pad = (n: number) => String(n).padStart(2, '0');
    const timeStr = `${pad(h)}:${pad(m)}:${pad(s)}`;
    return daysAhead > 0 ? `${timeStr} (+${daysAhead}d)` : timeStr;
  };

  const handleSetStartTimeNow = () => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    setStartTimeStr(`${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`);
  };

  // ==========================================
  // AGREGAR ELEMENTOS A LA LISTA
  // ==========================================
  const handleAddVideosClick = async () => {
    if ((window as any).electronAPI?.openVideoDialog) {
      try {
        const paths: string[] = await (window as any).electronAPI.openVideoDialog();
        if (!paths || paths.length === 0) return;

        const newItems: BuilderItem[] = await Promise.all(
          paths.map(async (fp) => {
            const filename = fp.split(/[\\/]/).pop() || fp;
            const title = filename.replace(/\.[^/.]+$/, '');
            let durationMs = 30000;

            try {
              const data: any = await api.probeMedia(fp);
              if (data?.durationMs) durationMs = data.durationMs;
            } catch { }

            const isCommercial = isCommercialMedia(title, fp);

            return {
              id: `builder-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
              title,
              file_path: fp,
              event_type: isCommercial ? 'COMMERCIAL' : 'VIDEO',
              duration_ms: durationMs,
              show_graphics: !isCommercial,
              timing_mode: 'AUTO_FOLLOW'
            };
          })
        );

        setItems(prev => [...prev, ...newItems]);
        setNotification({ message: `${newItems.length} videos agregados a la lista de armado`, type: 'success' });
      } catch (err: any) {
        setNotification({ message: `Error al abrir videos: ${err.message}`, type: 'error' });
      }
    } else {
      fileInputRef.current?.click();
    }
  };

  const handleBrowserFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const newItems: BuilderItem[] = await Promise.all(
      files.map(async (file) => {
        const durationMs = await getMediaDuration(file);
        let realPath = (file as any).path || file.name;
        if ((window as any).electronAPI?.getPathForFile) {
          try {
            const p = (window as any).electronAPI.getPathForFile(file);
            if (p) realPath = p;
          } catch { }
        }

        const title = file.name.replace(/\.[^/.]+$/, '');
        const isCommercial = isCommercialMedia(title, realPath);

        return {
          id: `builder-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          title,
          file_path: realPath,
          event_type: isCommercial ? 'COMMERCIAL' : 'VIDEO',
          duration_ms: durationMs,
          show_graphics: !isCommercial,
          timing_mode: 'AUTO_FOLLOW'
        };
      })
    );

    setItems(prev => [...prev, ...newItems]);
    setNotification({ message: `${newItems.length} videos cargados`, type: 'success' });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleAddLiveSdi = () => {
    const newItem: BuilderItem = {
      id: `builder-live-sdi-${Date.now()}`,
      title: 'EN VIVO - SDI DECKLINK',
      file_path: 'sdi-in-1',
      event_type: 'LIVE_SDI',
      duration_ms: 3600000,
      show_graphics: true,
      timing_mode: 'AUTO_FOLLOW'
    };
    setItems(prev => [...prev, newItem]);
    setNotification({ message: 'Pase a En Vivo SDI (1 hora) agregado a la lista', type: 'success' });
  };

  const handleAddLiveNdi = () => {
    const newItem: BuilderItem = {
      id: `builder-live-ndi-${Date.now()}`,
      title: 'EN VIVO - NDI RED IP',
      file_path: 'NDI_DEFAULT',
      event_type: 'LIVE_NDI',
      duration_ms: 3600000,
      show_graphics: true,
      timing_mode: 'AUTO_FOLLOW'
    };
    setItems(prev => [...prev, newItem]);
    setNotification({ message: 'Pase a En Vivo NDI (1 hora) agregado a la lista', type: 'success' });
  };

  // ==========================================
  // OPERACIONES DE FILAS INDIVIDUALES Y MASIVAS
  // ==========================================
  const handleToggleItemCG = (id: string) => {
    setItems(prev =>
      prev.map(it => it.id === id ? { ...it, show_graphics: !it.show_graphics } : it)
    );
  };

  const handleMoveUp = (index: number) => {
    if (index <= 0) return;
    setItems(prev => {
      const copy = [...prev];
      const temp = copy[index - 1];
      copy[index - 1] = copy[index];
      copy[index] = temp;
      return copy;
    });
  };

  const handleMoveDown = (index: number) => {
    if (index >= items.length - 1) return;
    setItems(prev => {
      const copy = [...prev];
      const temp = copy[index + 1];
      copy[index + 1] = copy[index];
      copy[index] = temp;
      return copy;
    });
  };

  const handleDuplicate = (index: number) => {
    const source = items[index];
    const copyItem: BuilderItem = {
      ...source,
      id: `builder-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      title: `${source.title} (Copia)`
    };
    setItems(prev => {
      const next = [...prev];
      next.splice(index + 1, 0, copyItem);
      return next;
    });
  };

  const handleDeleteItem = (id: string) => {
    setItems(prev => prev.filter(it => it.id !== id));
    setSelectedIds(prev => {
      if (prev.has(id)) {
        const next = new Set(prev);
        next.delete(id);
        return next;
      }
      return prev;
    });
  };

  const handleClearAll = () => {
    if (items.length === 0) return;
    if (window.confirm('¿Deseas vaciar la lista de armado completa?')) {
      setItems([]);
      setSelectedIds(new Set());
      setNotification({ message: 'Lista de planificación vaciada', type: 'success' });
    }
  };

  const handleSaveDurationEdit = (id: string) => {
    const ms = Math.max(1000, editDurationMin * 60 * 1000);
    setItems(prev => prev.map(it => it.id === id ? { ...it, duration_ms: ms } : it));
    setEditingDurationId(null);
  };

  const handleStartEditingDuration = (id: string, mins: number) => {
    setEditingDurationId(id);
    setEditDurationMin(mins);
  };

  const handleSetAllCG = (enable: boolean) => {
    setItems(prev => prev.map(it => ({ ...it, show_graphics: enable })));
    setNotification({
      message: enable ? 'CG activado en todos los elementos' : 'CG desactivado en todos los elementos',
      type: 'success'
    });
  };

  const handleAutoSuppressCommercialsCG = () => {
    setItems(prev => prev.map(it => {
      const isCom = it.event_type === 'COMMERCIAL' || isCommercialMedia(it.title, it.file_path);
      return { ...it, show_graphics: !isCom };
    }));
    setNotification({ message: 'CG desactivado en tandas / comerciales / promociones y activo en programas', type: 'success' });
  };

  const handleToggleCommercial = (item: BuilderItem) => {
    const isComm = item.event_type === 'COMMERCIAL' || isCommercialMedia(item.title, item.file_path);
    const targetType = isComm ? 'VIDEO' : 'COMMERCIAL';
    setItems(prev => prev.map(it => it.id === item.id ? {
      ...it,
      event_type: targetType,
      show_graphics: targetType !== 'COMMERCIAL'
    } : it));
    setNotification({
      message: targetType === 'COMMERCIAL'
        ? 'Elemento marcado como Tanda / Publicidad (CG desactivado)'
        : 'Elemento marcado como Video / Programa (CG activado)',
      type: 'success'
    });
  };

  // ==========================================
  // CARGA DESDE EL DECK MASTER Y SERIALIZACIÓN XML
  // ==========================================
  const handleLoadFromCurrentDeck = async () => {
    try {
      const res = await api.getPlaylist();
      if (!res.items || res.items.length === 0) {
        setNotification({ message: 'La emisión master actual no tiene videos cargados', type: 'error' });
        return;
      }

      const imported: BuilderItem[] = res.items.map((it, idx) => ({
        id: `deck-${it.id || idx}-${Date.now()}`,
        title: it.title,
        file_path: it.file_path,
        event_type: it.event_type as any || 'VIDEO',
        duration_ms: it.duration_ms,
        in_point_ms: it.in_point_ms || 0,
        out_point_ms: it.out_point_ms || 0,
        show_graphics: it.show_graphics !== false && (it.show_graphics as any) !== 0,
        timing_mode: it.timing_mode || 'AUTO_FOLLOW',
        scheduled_time: it.scheduled_time
      }));

      setItems(imported);
      setSelectedIds(new Set());
      setNotification({ message: `${imported.length} elementos cargados desde la emisión master`, type: 'success' });
    } catch (err: any) {
      setNotification({ message: `Error al cargar emisión: ${err.message}`, type: 'error' });
    }
  };

  const handleSavePlaylist = () => {
    if (items.length === 0) {
      setNotification({ message: 'No hay videos en la lista para guardar', type: 'error' });
      return;
    }

    if (missingCount > 0) {
      const confirmSave = window.confirm(`Atención: La playlist contiene ${missingCount} archivo(s) no encontrado(s) en disco (marcados en rojo).\n\n¿Deseas guardar el archivo XML de todos modos?`);
      if (!confirmSave) return;
    }

    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += `<playlist station="IB-Cast" version="1.0" profile="1080i59.94" totalDurationMs="${totalDurationMs}" itemsCount="${items.length}" exportedAt="${new Date().toISOString()}">\n`;
    items.forEach((item, idx) => {
      xml += '  <item>\n';
      xml += `    <order>${idx}</order>\n`;
      xml += `    <title><![CDATA[${item.title}]]></title>\n`;
      xml += `    <filePath><![CDATA[${item.file_path}]]></filePath>\n`;
      xml += `    <type>${item.event_type}</type>\n`;
      xml += `    <durationMs>${item.duration_ms}</durationMs>\n`;
      xml += `    <inPointMs>${item.in_point_ms || 0}</inPointMs>\n`;
      xml += `    <outPointMs>${item.out_point_ms || 0}</outPointMs>\n`;
      xml += `    <timingMode>${item.timing_mode || 'AUTO_FOLLOW'}</timingMode>\n`;
      xml += `    <scheduledTime>${item.scheduled_time || ''}</scheduledTime>\n`;
      xml += `    <showGraphics>${item.show_graphics ? 1 : 0}</showGraphics>\n`;
      xml += '  </item>\n';
    });
    xml += '</playlist>';

    const defaultName = `playlist_${new Date().toISOString().slice(0, 10)}`;
    const inputName = window.prompt('Nombre del archivo de Playlist para guardar:', defaultName);
    if (inputName === null) return;
    const finalName = (inputName.trim() || defaultName).replace(/\.xml$/i, '') + '.xml';

    const blob = new Blob([xml], { type: 'application/xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = finalName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setNotification({ message: `Playlist guardada exitosamente en archivo "${finalName}"`, type: 'success' });
  };

  const handleOpenPlaylistFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        let loadedItems: BuilderItem[] = [];

        if (file.name.endsWith('.json') || content.trim().startsWith('{') || content.trim().startsWith('[')) {
          const parsed = JSON.parse(content);
          const rawItems = Array.isArray(parsed) ? parsed : (parsed.items || []);
          loadedItems = rawItems.map((it: any, idx: number) => ({
            id: `imported-${Date.now()}-${idx}`,
            title: it.title || `Elemento ${idx + 1}`,
            file_path: it.file_path || it.filePath || '',
            event_type: it.event_type || it.type || 'VIDEO',
            duration_ms: Number(it.duration_ms || it.durationMs) || 30000,
            in_point_ms: Number(it.in_point_ms || it.inPointMs) || 0,
            out_point_ms: Number(it.out_point_ms || it.outPointMs) || 0,
            show_graphics: it.show_graphics !== undefined ? Boolean(it.show_graphics) : (it.showGraphics !== '0' && it.showGraphics !== 0),
            timing_mode: it.timing_mode || 'AUTO_FOLLOW',
            scheduled_time: it.scheduled_time || null
          }));
        } else {
          const itemBlocks = content.match(/<item>([\s\S]*?)<\/item>/g) || [];
          loadedItems = itemBlocks.map((block, idx) => {
            const getTag = (tag: string) => {
              const m = block.match(new RegExp(`<${tag}>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?<\\/${tag}>`));
              return m ? m[1].trim() : '';
            };

            return {
              id: `imported-xml-${Date.now()}-${idx}`,
              title: getTag('title') || `Elemento ${idx + 1}`,
              file_path: getTag('filePath') || '',
              event_type: (getTag('type') as any) || 'VIDEO',
              duration_ms: parseInt(getTag('durationMs'), 10) || 30000,
              in_point_ms: parseInt(getTag('inPointMs'), 10) || 0,
              out_point_ms: parseInt(getTag('outPointMs'), 10) || 0,
              show_graphics: getTag('showGraphics') !== '0',
              timing_mode: (getTag('timingMode') as any) || 'AUTO_FOLLOW',
              scheduled_time: getTag('scheduledTime') || null
            };
          });
        }

        if (loadedItems.length === 0) {
          setNotification({ message: 'No se encontraron elementos válidos en el archivo', type: 'error' });
          return;
        }

        setItems(loadedItems);
        setSelectedIds(new Set());
        verifyItemsFiles(loadedItems, true);
        setNotification({ message: `${loadedItems.length} videos cargados desde el archivo de playlist`, type: 'success' });
      } catch (err: any) {
        setNotification({ message: `Error al leer archivo de playlist: ${err.message}`, type: 'error' });
      }
    };
    reader.readAsText(file);
    if (openPlaylistFileRef.current) openPlaylistFileRef.current.value = '';
  };

  const handleLoadToDeck = async (replace: boolean) => {
    if (items.length === 0) {
      setNotification({ message: 'No hay elementos para enviar a la emisión', type: 'error' });
      return;
    }

    if (missingCount > 0) {
      const confirmDeck = window.confirm(`¡Atención de Emisión Master!\n\nHay ${missingCount} archivo(s) marcado(s) en rojo que no existen en disco.\nSi se transmiten provocarán pausas o cortinillas de respaldo.\n\n¿Deseas cargarlos a la emisión de todos modos?`);
      if (!confirmDeck) return;
    }

    try {
      setIsSendingToDeck(true);
      setNotification(null);

      const toSend: AddPlaylistItemDto[] = items.map(it => ({
        title: it.title,
        file_path: it.file_path,
        event_type: it.event_type,
        duration_ms: it.duration_ms,
        in_point_ms: it.in_point_ms || 0,
        out_point_ms: it.out_point_ms || 0,
        show_graphics: it.show_graphics,
        timing_mode: it.timing_mode || 'AUTO_FOLLOW',
        scheduled_time: it.scheduled_time || null
      }));

      if (replace) {
        await (api as any).replacePlaylist(toSend);
      } else {
        await api.addItems(toSend);
      }

      if (onLoadToDeckSuccess) onLoadToDeckSuccess();

      setNotification({
        message: `${toSend.length} elementos cargados con éxito al Deck Master de emisión (${replace ? 'Reemplazo completo' : 'Anexados'})`,
        type: 'success'
      });
    } catch (err: any) {
      setNotification({ message: `Error al enviar al deck: ${err.message}`, type: 'error' });
    } finally {
      setIsSendingToDeck(false);
    }
  };

  // ==========================================
  // RENDER: COMPONENTE PRINCIPAL
  // ==========================================
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--color-canvas)', overflow: 'hidden' }}>
      {/* 1. Header con Resumen de Horas Grandes y Métricas Claras */}
      <div style={{
        padding: '12px 18px',
        background: 'var(--color-canvas-soft)',
        borderBottom: '1px solid var(--color-hairline)',
        flexShrink: 0
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <CalendarClock size={20} color="var(--color-primary)" />
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-ink)', letterSpacing: '0.1px' }}>
                  Armar & Planificar Playlist
                </span>
                <span style={{
                  fontSize: 10,
                  fontWeight: 600,
                  padding: '2px 7px',
                  borderRadius: 4,
                  background: 'var(--color-primary-subtle, rgba(0, 122, 255, 0.12))',
                  color: 'var(--color-primary, #007aff)',
                  letterSpacing: '0.3px',
                  textTransform: 'uppercase'
                }}>
                  Entorno Offline
                </span>
              </div>
              <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>
                Área de trabajo aislada del aire: planifica escaletas de varios días, recorta videos (Trim), calcula horas de bloques y verifica archivos sin afectar la emisión.
              </div>
            </div>
          </div>

          {/* Botones de Navegación y Herramientas */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn-tool"
              onClick={() => setIsNetworkModalOpen(true)}
              style={{ fontSize: 11.5, padding: '5px 12px', gap: 6 }}
              title="Obtener enlace IP para que otra PC de la emisora acceda a este Armador en red"
            >
              <Network size={13} color="var(--color-cyan)" />
              <span>Acceso Red LAN</span>
            </button>

            {onNavigateToDeck && (
              <button
                type="button"
                className="btn-tool"
                onClick={onNavigateToDeck}
                style={{ fontSize: 11.5, padding: '5px 12px', gap: 6, fontWeight: 500 }}
                title="Regresar a la pantalla del Deck de emisión en vivo"
              >
                <ArrowLeft size={13} />
                <span>Volver al Deck On-Air</span>
              </button>
            )}
          </div>
        </div>

        {/* Métricas Clave y Herramientas Inteligentes */}
        <BuilderHeaderCards
          totalDurationMs={totalDurationMs}
          totalCount={totalCount}
          videoCount={videoCount}
          liveCount={liveCount}
          spotCount={spotCount}
          selectedCount={selectedIds.size}
          selectedDurationMs={selectedDurationMs}
          selectedMinutesFormatted={selectedMinutesFormatted}
          selectedPct={selectedPct}
          onDeselectAll={() => setSelectedIds(new Set())}
          missingCount={missingCount}
          isValidating={isValidatingFiles}
          onVerifyFiles={() => verifyItemsFiles(items, true)}
          onPurgeMissing={handlePurgeAllMissing}
        />
      </div>

      {/* 2. Barra de Herramientas de Inserción & Acciones */}
      <BuilderToolbar
        onAddVideos={handleAddVideosClick}
        onAddLiveSdi={handleAddLiveSdi}
        onAddLiveNdi={handleAddLiveNdi}
        onOpenBatchModal={() => setIsBatchModalOpen(true)}
        repeatedGroupsCount={repeatedGroups.length}
        onSetAllCG={handleSetAllCG}
        onAutoSuppressCommercialsCG={handleAutoSuppressCommercialsCG}
        startTimeStr={startTimeStr}
        onStartTimeChange={setStartTimeStr}
        onSetStartTimeNow={handleSetStartTimeNow}
        selectedCount={selectedIds.size}
        onToggleSelectedCG={handleToggleSelectedCG}
        onDeleteSelected={handleDeleteSelected}
        onLoadFromCurrentDeck={handleLoadFromCurrentDeck}
        onLoadToDeck={handleLoadToDeck}
        isSendingToDeck={isSendingToDeck}
        hasItems={items.length > 0}
        onOpenPlaylistFile={() => openPlaylistFileRef.current?.click()}
        onSavePlaylist={handleSavePlaylist}
        onClearAll={handleClearAll}
      />

      {/* Banner de Notificación */}
      {notification && (
        <div style={{
          padding: '8px 18px',
          background: notification.type === 'success' ? 'var(--color-success-subtle)' : 'var(--color-live-subtle)',
          color: notification.type === 'success' ? 'var(--color-success-on-subtle)' : 'var(--color-live-on-subtle)',
          fontSize: 11.5,
          fontWeight: 500,
          borderBottom: '1px solid var(--color-hairline)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {notification.type === 'success' ? <Check size={14} /> : <AlertCircle size={14} />}
            <span>{notification.message}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="ide-icon-btn"
            style={{ width: 22, height: 22 }}
          >
            ✕
          </button>
        </div>
      )}

      {/* 3. Contenedor de Tabla con Loader Pinned Estacionario (Zero Saltos de Layout) */}
      <div style={{ flex: 1, minHeight: 0, position: 'relative', display: 'flex', flexDirection: 'column' }}>
        <LinearLoader
          active={isValidatingFiles || isSendingToDeck}
          label={
            isSendingToDeck
              ? 'Despachando programación al Deck Master de emisión...'
              : validationLabel
          }
        />

        <BuilderTable
          items={items}
          selectedIds={selectedIds}
          fileStatusMap={fileStatusMap}
          getItemEstimatedStart={getItemEstimatedStart}
          editingDurationId={editingDurationId}
          editDurationMin={editDurationMin}
          onEditDurationMinChange={setEditDurationMin}
          onSaveDurationEdit={handleSaveDurationEdit}
          onStartEditingDuration={handleStartEditingDuration}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onRowClick={handleRowClick}
          onRowContextMenu={(e, item, idx) => {
            setContextMenu({
              x: e.clientX,
              y: e.clientY,
              item,
              index: idx
            });
          }}
          onToggleItemCG={handleToggleItemCG}
          onOpenTrimModal={handleOpenTrimModal}
          onMoveUp={handleMoveUp}
          onMoveDown={handleMoveDown}
          onTriggerReplaceItem={handleTriggerReplaceItem}
          onDuplicate={handleDuplicate}
          onDeleteItem={handleDeleteItem}
        />
      </div>

      {/* Menú Contextual (Clic Derecho en Fila) */}
      <BuilderContextMenu
        contextMenu={contextMenu}
        onClose={() => setContextMenu(null)}
        items={items}
        selectedCount={selectedIds.size}
        onOpenTrimModal={handleOpenTrimModal}
        onClearTrim={handleClearTrim}
        onToggleCommercial={handleToggleCommercial}
        onToggleCG={handleToggleItemCG}
        onStartEditingDuration={handleStartEditingDuration}
        onTriggerReplaceItem={handleTriggerReplaceItem}
        onDuplicate={handleDuplicate}
        onMoveUp={handleMoveUp}
        onMoveDown={handleMoveDown}
        onCopyPath={(path) => {
          navigator.clipboard.writeText(path);
          setNotification({ message: 'Ruta de archivo copiada al portapapeles', type: 'success' });
        }}
        onDeleteSelected={handleDeleteSelected}
        onDeleteItem={handleDeleteItem}
      />

      {/* Modal de Confirmación: Reemplazar una vs todas las repeticiones */}
      <ReplaceOccurrencesModal
        pendingReplace={pendingReplace}
        onClose={() => setPendingReplace(null)}
        onApplyReplacement={(replaceAll) => {
          if (pendingReplace) {
            applyFileReplacement(
              pendingReplace.targetItem,
              pendingReplace.newPath,
              pendingReplace.newTitle,
              pendingReplace.newDurationMs,
              replaceAll
            );
          }
        }}
      />

      {/* Modal de Reemplazo en Lote Global */}
      <BatchReplaceModal
        isOpen={isBatchModalOpen}
        onClose={() => setIsBatchModalOpen(false)}
        repeatedGroups={repeatedGroups}
        onTriggerReplaceItem={(item) => {
          setIsBatchModalOpen(false);
          handleTriggerReplaceItem(item);
        }}
      />

      {/* Modal de Recorte Trim (IN / OUT) */}
      <TrimModal
        item={trimTargetItem}
        isOpen={isTrimModalOpen}
        onClose={() => {
          setIsTrimModalOpen(false);
          setTrimTargetItem(null);
        }}
        onSaveTrim={handleSaveTrim}
      />

      {/* Hidden File Inputs */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".mp4,.mov,.mkv,.ts,.mxf,.avi,.webm,video/mp4,video/quicktime,video/x-matroska,video/mp2t"
        style={{ display: 'none' }}
        onChange={handleBrowserFileChange}
      />
      <input
        ref={openPlaylistFileRef}
        type="file"
        accept=".xml,.json,.playlist"
        style={{ display: 'none' }}
        onChange={handleOpenPlaylistFile}
      />
      <input
        ref={replaceBuilderFileInputRef}
        type="file"
        accept=".mp4,.mov,.mkv,.ts,.mxf,.avi,.webm,video/mp4,video/quicktime,video/x-matroska,video/mp2t"
        style={{ display: 'none' }}
        onChange={handleBrowserReplaceBuilderFileChange}
      />

      {/* Modal de Conexión de Red para Acceso Remoto desde otra PC */}
      <NetworkModal
        isOpen={isNetworkModalOpen}
        onClose={() => setIsNetworkModalOpen(false)}
      />
    </div>
  );
};
