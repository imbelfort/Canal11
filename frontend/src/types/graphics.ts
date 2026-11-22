export type LogoType = 'STATIC_PNG' | 'PNG_SEQUENCE';
export type OverlayPosition = 'TOP_RIGHT' | 'TOP_LEFT' | 'BOTTOM_RIGHT' | 'BOTTOM_LEFT' | 'CUSTOM' | 'TOP_RIGHT_UNDER_LOGO' | 'WITH_CLOCK';

export interface LogoLayerConfig {
  id?: string;
  enabled: boolean;
  type: LogoType;
  path: string;
  sequenceDir?: string;
  sequenceFps?: number;
  sequenceFramesCount?: number;
  speed?: number; // Velocidad de reproducción (1.0x, 0.5x, 2.0x)
  position: OverlayPosition;
  x: number; // porcentaje 0-100
  y: number; // porcentaje 0-100
  scale: number; // porcentaje 20-150
  opacity: number; // porcentaje 0-100
}

export interface ClockLayerConfig {
  id?: string;
  enabled: boolean;
  format: 'HH:MM:SS' | 'HH:MM';
  timezone: 'BOT' | 'LOCAL';
  position: OverlayPosition;
  x: number;
  y: number;
  fontSize: number;
  fontColor: string;
  bgOpacity: number;
  showBox: boolean;
}

export interface WeatherLayerConfig {
  id?: string;
  enabled: boolean;
  city: string;
  latitude: number | null;
  longitude: number | null;
  temperature: number | null;
  humidity: number | null;
  weatherCode: number | null;
  conditionText: string;
  icon: string;
  position: OverlayPosition;
  x: number;
  y: number;
  fontColor?: string;
  fontSize?: number;
  showIcon: boolean;
  showHumidity: boolean;
  lastUpdated: string | null;
}

export interface TickerLayerConfig {
  id?: string;
  enabled: boolean;
  text: string;
  speed: 'SLOW' | 'NORMAL' | 'FAST';
  position: 'BOTTOM';
  bgColor: string;
  textColor: string;
  fontSize?: number;
  height?: number;
}

export interface GraphicsLayers {
  logo: LogoLayerConfig;
  clock: ClockLayerConfig;
  weather: WeatherLayerConfig;
  ticker: TickerLayerConfig;
}

export interface NativeGraphicsTelemetry {
  loaded: boolean;
  frames_count: number;
  master_enabled: boolean;
  visible: boolean;
  crop_rect?: [number, number, number, number] | null;
}

export interface GraphicsState {
  masterEnabled: boolean;
  effectiveVisible: boolean;
  isCommercial: boolean;
  suppressReason: string | null;
  layers: GraphicsLayers;
  nativeTelemetry?: NativeGraphicsTelemetry | null;
  timestamp: string;
}
