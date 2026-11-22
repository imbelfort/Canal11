/**
 * Tipado TypeScript Oficial para Blackmagic DeckLink SDK 16.0
 * Según Documento de Ingeniería ib_cast_decklink_integration_guide.md
 */

export type BMDDisplayMode =
  | 'bmdModeHD1080i50'
  | 'bmdModeHD1080i5994'
  | 'bmdModeHD1080p2997'
  | 'bmdModeHD1080p50'
  | 'bmdModeHD1080p5994'
  | 'bmdModeHD720p50'
  | 'bmdModeHD720p5994';

export type BMDPixelFormat =
  | 'bmdFormat8BitYUV'      // '2vuy' - UYVY 4:2:2 8-bit
  | 'bmdFormat10BitYUV'     // 'v210' - 10-bit YUV broadcast
  | 'bmdFormat8BitBGRA'     // 'BGRA' - Canal Alfa para Fill & Key de Gráficos (CG)
  | 'bmdFormat10BitYUVA';   // 'Ay10' - 10-bit con canal Alfa

export type BMDKeyerMode = 'DISABLED' | 'INTERNAL' | 'EXTERNAL';

export interface DeckLinkKeyerState {
  enabled: boolean;
  mode: BMDKeyerMode;
  isExternal: boolean;
  blendLevel: number; // 0 (transparente) a 255 (opaco)
  blendPercent: number; // 0% a 100%
  isRamping: boolean;
  rampFrames: number;
  rampDirection: 'IN' | 'OUT';
  supportsInternalKeying: boolean;
  supportsExternalKeying: boolean;
  supported?: boolean;
}

export interface DirectShowFiltersStatus {
  videoCapture: boolean;
  audioCapture: boolean;
  videoRender: boolean;
  audioRender: boolean;
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

export interface DeckLinkFullStatus {
  deviceName: string;
  activeProfile: string;
  resolution: string;
  fieldRate: string;
  frameRate: string;
  scanType: string;
  // Estados de hardware separados con rigor broadcast
  hardwarePresent: boolean;
  driverInstalled: boolean;
  outputInitialized: boolean;
  outputRunning: boolean;
  sdiOutputLocked: boolean;
  inputSignalDetected: boolean;
  inputLocked: boolean;
  sdiInputDetected: boolean;
  sdiInputLocked: boolean;
  inputs?: DeckLinkInputStatus[];
  audio: string;
  videoSampling: string;
  timecodeFormat: string;
  operatingMode: string;
  keyer?: DeckLinkKeyerState;
  droppedFramesCount: number;
  totalEmittedFrames: number;
  // Métricas avanzadas desde el motor Rust
  metrics?: {
    frames_scheduled: number;
    frames_completed: number;
    frames_dropped: number;
    video_underruns: number;
    audio_underruns: number;
    av_sync_diff_ms: number;
    memory_rss_mb: number;
  };
}
