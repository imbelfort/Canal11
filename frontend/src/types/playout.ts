import { GraphicsState } from './graphics';
export * from './graphics';
export * from './decklink';

export type EngineState = 'IDLE' | 'PLAYING' | 'PAUSED' | 'BLACK_FALLBACK' | 'STOPPED' | 'LIVE_SDI' | 'LIVE_NDI' | 'EMERGENCY_FALLBACK';

export type EventType = 'VIDEO' | 'IMAGE' | 'LIVE_SDI' | 'LIVE_NDI' | 'GRAPHIC' | 'COMMERCIAL';

export type TimingMode = 'AUTO_FOLLOW' | 'HARD_START' | 'MANUAL_CUE';

export type ItemStatus = 'PENDING' | 'ON_AIR' | 'PLAYED' | 'SKIPPED' | 'ERROR';

export type AuditStatus = 'PLAYED_SUCCESS' | 'INTERRUPTED' | 'SKIPPED' | 'ERROR' | 'FILE_CORRUPT_OR_MISSING';

export const NEAR_END_MS = 15000;
export const CRITICAL_MS = 10000;

export interface PlaylistItem {
  id: number;
  playlist_id: number;
  order_index: number;
  title: string;
  file_path: string;
  event_type: EventType;
  duration_ms: number;
  duration_known?: boolean;
  in_point_ms?: number;
  out_point_ms?: number;
  timing_mode: TimingMode;
  scheduled_time: string | null;
  scheduled_spots?: number;
  pauta_id?: number;
  cue_label?: string;
  group_id?: string | null;
  program_title?: string | null;
  status: ItemStatus | AuditStatus;
  error_message?: string | null;
  show_graphics?: boolean;
  cg_enabled?: boolean;
  file_exists?: boolean;
  audio_source?: string;
  loudness_lufs?: number | null;
  true_peak_db?: number | null;
  lra?: number | null;
  loudness_status?: 'PENDING' | 'OK' | 'NO_AUDIO' | 'ERROR';
}

export interface AddPlaylistItemDto {
  title: string;
  file_path: string;
  duration_ms?: number;
  event_type?: EventType;
  timing_mode?: TimingMode;
  scheduled_time?: string | null;
  in_point_ms?: number;
  out_point_ms?: number;
  audio_source?: string;
}

export interface PlayoutBroadcastState {
  state: EngineState;
  currentItem: PlaylistItem | null;
  nextItem: PlaylistItem | null;
  hasNextItem?: boolean;
  totalItems?: number;
  currentIndex: number;
  elapsedMs: number;
  remainingMs: number;
  progressPercent: number;
  emergencyMedia?: { mode: string; file_path: string; title: string } | null;
  emergencyConfig?: { mode: string; filePath: string; title: string };
  timecodes: {
    stationMaster: string;
    itemElapsed: string;
    itemRemaining: string;
  };
  loop: boolean;
  broadcastStandard?: {
    resolution: string;
    aspectRatio: string;
    /** Perfil activo de Rust. null si Rust no ha reportado telemetría aún (N2). */
    profile: string | null;
    standard?: string | null;
  };
  decklink: DeckLinkStatus;
  engine?: {
    connected: boolean;
    activeProfile: string | null;
    playoutState: 'IDLE' | 'PLAYING' | 'PAUSED' | 'BLACK_FALLBACK' | 'STOPPED';
    onAirId: number | null;
    clipElapsedMs: number;
    clipDurationMs: number;
    framesCompleted: number;
    framesDropped: number;
    videoUnderruns: number;
  } | null;
  masterAudio?: {
    normalization: 'EBU_R128' | 'ATSC_A85' | 'OFF';
    volumeDb: number;
    limiter: boolean;
    sampleRate: number;
    channels: number;
    standard: string;
    active?: boolean;
    nativeTelemetry?: {
      vu_left_dbfs: number;
      vu_right_dbfs: number;
      target_lufs: number;
      applied_gain_db: number;
      master_trim_db: number;
    } | null;
  };
  graphics?: GraphicsState;
  systemMetrics?: SystemMetrics;
  /** Estado de pre-validación de archivos (preloadManager). No es preroll de Rust. */
  preloaded?: boolean;
  /** Estado de salidas activas (DeckLink SDI + NDI). */
  outputs?: {
    ndi?: {
      stream?: {
        isBroadcasting?: boolean;
        streamName?: string;
      };
    };
    [key: string]: unknown;
  };
  timestamp: string;
}

export interface SystemMetrics {
  cpu: number;
  ram: {
    usedGb: string;
    totalGb: string;
    percent: number;
  };
  gpu: {
    name: string;
    percent: number;
    detected: boolean;
  };
  timestamp?: number;
}

export interface DeckLinkInputStatus {
  deviceId: string;
  connector: string;
  signalPresent: boolean;
  capturing: boolean;
  detectedFormat: string | null;
  droppedFrames: number;
  error: string | null;
}

export interface DeckLinkStatus {
  deviceName: string;
  activeProfile: string | null;
  resolution: string | null;
  fieldRate: string | null;
  frameRate: string | null;
  scanType: string | null;
  sdiOutputLocked: boolean;
  sdiInputDetected: boolean;
  sdiInputLocked: boolean;
  inputs?: DeckLinkInputStatus[];
  audio: string;
  videoSampling: string;
  timecodeFormat: string;
  operatingMode?: string;
  hardwarePresent?: boolean;
  driverInstalled?: boolean;
  droppedFramesCount?: number;
  totalEmittedFrames?: number;
  framesCompleted?: number;
  framesDropped?: number;
  genlockLocked?: boolean;
  rustEngineActive?: boolean;
  autoDetectInput?: boolean;
  detectedInputFormat?: string | null;
  availableStandards?: string[];
}

export interface AsRunLog {
  id: number;
  item_id: number;
  pauta_id: number | null;
  title: string;
  program_title: string | null;
  file_path: string | null;
  event_type: EventType;
  planned_start: string | null;
  started_at: string | null;
  ended_at: string | null;
  planned_duration_ms: number;
  actual_duration_ms: number;
  discrepancy_ms: number;
  broadcast_status: string;
  operator: string | null;
  notes: string | null;
}

export interface AuditStats {
  total_broadcasts: number;
  today_broadcasts: number;
  successful_broadcasts: number;
  failed_broadcasts: number;
  total_duration_hours: number;
  uptime_percentage: number | null;
}

export interface SystemIncident {
  id: number;
  timestamp: string;
  severity: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
  source: string;
  description: string;
  resolved: number;
}

export type HardwareInputType = 'SDI' | 'NDI';

export interface HardwareInput {
  id: string;
  name: string;
  type?: HardwareInputType;
  device_id?: string;
  device_name: string;
  connector: string;
  format: string;
  audio_channels: string;
  auto_detect: number;
  is_default?: number;
  is_enabled: number;
}

export interface HardwareOutput {
  id: string;
  name: string;
  device_name: string;
  connector: string;
  format: string;
  color_space: string;
  pixel_format: string;
  conversion_mode: string;
  is_enabled: number;
}

export interface DeckLinkDeviceInfo {
  id: string;
  name: string;
  status: string;
  isSimulated: boolean;
  modelName: string;
  interface?: string;
  connectors: string[];
  outputConnectors?: string[];
  inputConnectors?: string[];
  supportedProfiles: string[];
  hasHdmi?: boolean;
  hasSdi?: boolean;
  maxResolution?: string;
  hardwareNotes?: string;
  sdiCompliance: string;
  colorSpace: string;
  pixelFormat: string;
  supportsInternalKeying?: boolean;
  supportsExternalKeying?: boolean;
}

export interface DeckLinkPnpDevice {
  FriendlyName: string;
  Status: string;
  Present: boolean;
  InstanceId: string;
}

export interface AudioInputSource {
  id: string;
  name: string;
  category: 'EMBEDDED' | 'HARDWARE' | 'DIRECTSHOW' | 'SYSTEM' | 'NONE';
}

export interface DeckLinkScanResult {
  sdkInstalled?: boolean;
  sdkVersion?: string;
  sdkPath?: string;
  binDir?: string;
  binExists?: boolean;
  directShowFiltersAvailable?: boolean;
  driverInstalled: boolean;
  installerAvailable?: boolean;
  installerPath?: string | null;
  hardwarePresent: boolean;
  operatingMode: string;
  statusMessage: string;
  devices: DeckLinkDeviceInfo[];
  pnpDevices: DeckLinkPnpDevice[];
  audioInputDevices?: AudioInputSource[];
  knownModels?: string[];
}

export type MasterOutputType = 'DECKLINK' | 'NDI' | 'SIMULTANEOUS';

export interface MasterOutputConfig {
  outputType: MasterOutputType;
  blackmagicDevice: string;
  ndiStreamName: string;
  sdiFormat: string;
  sdiConnector: string;
  keyingMode?: 'DISABLED' | 'INTERNAL' | 'EXTERNAL';
  keyerBlendLevel?: number;
  inputLine?: string;
}

export interface SdiTestResult {
  success: boolean;
  outputId: string;
  name: string;
  connector: string;
  format: string;
  testPattern: string;
  audioTone: string;
  timecode: string;
  timestamp: string;
  message: string;
}

export interface NdiSource {
  id: string;
  name: string;
  machine_name: string;
  stream_name: string;
  ip_address: string;
  port: number;
  format: string;
  source_type: 'AUTO_DISCOVERED' | 'MANUAL';
  is_selected: number;
  audio_source?: string;
  last_seen?: string;
}

export interface NdiAudioConfig {
  enabled: boolean;
  normalize48k: boolean;
  mute: boolean;
  channelCount?: number;
}

export interface NdiReceiverStatus {
  sourceId: string | null;
  connected: boolean;
  receivingVideo: boolean;
  receivingAudio: boolean;
  videoFps?: number;
  audioSampleRate?: number;
  audioChannels?: number;
  droppedFrames?: number;
}

export interface NdiRuntimeStatus {
  available: boolean;
  isSystemInstalled: boolean;
  isBundled: boolean;
  installerAvailable: boolean;
  version: string;
  sdkVersion: string;
  activeLibraryPath: string | null;
  installerPath: string | null;
  receiver?: NdiReceiverStatus;
  outputStream: {
    name: string;
    channel: string;
    format: string;
    colorSpace: string;
    audio: string;
    status: string;
  };
}
