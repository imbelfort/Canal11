import { TimingMode } from '../../../types/playout';

export interface BuilderItem {
  id: string;
  title: string;
  file_path: string;
  event_type: 'VIDEO' | 'LIVE_SDI' | 'LIVE_NDI' | 'COMMERCIAL' | 'IMAGE';
  duration_ms: number;
  in_point_ms?: number;
  out_point_ms?: number;
  show_graphics: boolean;
  timing_mode?: TimingMode;
  scheduled_time?: string | null;
  file_exists?: boolean;
}

export interface PendingReplace {
  targetItem: BuilderItem;
  newPath: string;
  newTitle: string;
  newDurationMs: number;
  occurrences: number;
}

export interface RepeatedGroup {
  title: string;
  file_path: string;
  count: number;
  totalMs: number;
  sampleItem: BuilderItem;
}

export interface ContextMenuState {
  x: number;
  y: number;
  item: BuilderItem;
  index: number;
}

// Formato de Duración en Timecode HH:MM:SS
export const formatDuration = (ms: number): string => {
  if (!ms || ms < 0) return '00:00:00';
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
};

// Formato expandido con soporte multidía (ej. "2d 04h 15m (52h 15m)" o "03h 02m 05s")
export const formatHoursMinutesSeconds = (ms: number): string => {
  if (!ms || ms < 0) return '00h 00m 00s';
  const totalSec = Math.floor(ms / 1000);
  const days = Math.floor(totalSec / 86400);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  if (days >= 1) {
    return `${days}d ${pad(h % 24)}h ${pad(m)}m (${pad(h)}h ${pad(m)}m)`;
  }
  return `${pad(h)}h ${pad(m)}m ${pad(s)}s`;
};

