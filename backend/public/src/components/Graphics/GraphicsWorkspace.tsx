import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { api } from '../../services/api';
import { GraphicsState, GraphicsLayers, LogoLayerConfig, ClockLayerConfig, WeatherLayerConfig, TickerLayerConfig } from '../../types/graphics';
import { GraphicsOverlay } from './GraphicsOverlay';
import {
  Sparkles,
  Tv,
  Clock,
  CloudSun,
  Layers,
  Image,
  RefreshCw,
  FolderOpen,
  Eye,
  EyeOff,
  Check,
  X,
  AlertCircle,
  Search,
  Sliders,
  RotateCcw,
  AlertTriangle
} from 'lucide-react';

// Interfaz auxiliar de props para controles comunes
interface SliderRowProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  isWarning?: boolean;
  warningText?: string;
  onChange: (val: number) => void;
}

const SliderRow: React.FC<SliderRowProps> = ({
  label,
  value,
  min,
  max,
  step = 1,
  unit = '',
  isWarning = false,
  warningText = '',
  onChange
}) => (
  <div>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 10.5, marginBottom: 3 }}>
      <span style={{ color: isWarning ? 'var(--apple-orange, #ff9f0a)' : 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
        {label}
        {isWarning && (
          <span title={warningText} style={{ display: 'inline-flex', alignItems: 'center' }}>
            <AlertTriangle size={11} color="var(--apple-orange, #ff9f0a)" />
          </span>
        )}
      </span>
      <span style={{ fontWeight: 600, color: isWarning ? 'var(--apple-orange, #ff9f0a)' : 'var(--color-ink)', fontFamily: 'var(--font-mono, monospace)' }}>
        {value}{unit}
      </span>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      style={{
        width: '100%',
        accentColor: isWarning ? 'var(--apple-orange, #ff9f0a)' : 'var(--color-primary)'
      }}
    />
  </div>
);

interface LayerCardProps {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  enabled: boolean;
  isLoadedInRust?: boolean;
  onToggle: (enabled: boolean) => void;
  children: React.ReactNode;
}

const LayerCard: React.FC<LayerCardProps> = ({
  title,
  subtitle,
  icon,
  enabled,
  isLoadedInRust,
  onToggle,
  children
}) => (
  <div style={{
    background: 'var(--color-canvas)',
    border: '1px solid var(--color-hairline)',
    borderRadius: 'var(--radius-lg)',
    padding: 14,
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
  }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {icon}
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-ink)' }}>
            {title}
          </div>
          <div style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>
            {subtitle}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {/* Indicador de estado confirmado por Rust */}
        {enabled && (
          <span
            style={{
              fontSize: 9,
              fontWeight: 600,
              padding: '2px 6px',
              borderRadius: 4,
              letterSpacing: '0.3px',
              background: isLoadedInRust ? 'rgba(48, 209, 88, 0.15)' : 'rgba(255, 159, 10, 0.15)',
              color: isLoadedInRust ? 'var(--color-success, #30d158)' : 'var(--apple-orange, #ff9f0a)',
              border: `1px solid ${isLoadedInRust ? 'rgba(48, 209, 88, 0.3)' : 'rgba(255, 159, 10, 0.3)'}`
            }}
            title={isLoadedInRust ? 'Confirmado en memoria del motor Rust' : 'Configurado localmente, en espera de confirmación nativa'}
          >
            {isLoadedInRust ? 'RUST ONLINE' : 'PENDIENTE'}
          </span>
        )}

        <button
          type="button"
          className={`m3-loop-toggle ${enabled ? 'active' : ''}`}
          onClick={() => onToggle(!enabled)}
          style={{ padding: '3px 8px', fontSize: 10.5 }}
          title={enabled ? 'Deshabilitar capa' : 'Habilitar capa'}
        >
          <span>{enabled ? 'ACTIVO' : 'DESACTIVADO'}</span>
          <span className={`m3-switch-pill ${enabled ? 'checked' : ''}`}>
            <span className="m3-switch-thumb" />
          </span>
        </button>
      </div>
    </div>

    {children}
  </div>
);

const DEFAULT_LAYERS: GraphicsLayers = {
  logo: {
    enabled: false,
    type: 'STATIC_PNG',
    path: '',
    sequenceDir: '',
    speed: 1.0,
    sequenceFramesCount: 0,
    position: 'TOP_RIGHT',
    x: 88,
    y: 6,
    scale: 75,
    opacity: 85
  },
  clock: {
    enabled: false,
    format: 'HH:MM:SS',
    timezone: 'BOT',
    position: 'TOP_RIGHT_UNDER_LOGO',
    x: 88,
    y: 14,
    fontSize: 14,
    fontColor: '#ffffff',
    bgOpacity: 0.5,
    showBox: true
  },
  weather: {
    enabled: false,
    city: '',
    latitude: null,
    longitude: null,
    temperature: null,
    humidity: null,
    weatherCode: null,
    conditionText: '',
    icon: '',
    position: 'WITH_CLOCK',
    x: 88,
    y: 18,
    showIcon: true,
    showHumidity: true,
    lastUpdated: null
  },
  ticker: {
    enabled: false,
    text: 'IB-CAST BROADCAST SYSTEM • EMISIÓN CONTINUA 24/7',
    speed: 'NORMAL',
    position: 'BOTTOM',
    bgColor: 'rgba(0, 43, 73, 0.85)',
    textColor: '#ffffff'
  }
};

export const GraphicsWorkspace: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'WEATHER' | 'LOGO' | 'CLOCK' | 'TICKER' | 'ALL'>('ALL');
  const [serverState, setServerState] = useState<GraphicsState | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Monitor preview controls
  const [bgMode, setBgMode] = useState<'STUDIO' | 'SMPTE' | 'GRID'>('STUDIO');
  const [showSafeAreas, setShowSafeAreas] = useState<boolean>(true);

  // Draft estructurado único y snapshot inicial
  const [masterEnabled, setMasterEnabled] = useState(true);
  const [draftLayers, setDraftLayers] = useState<GraphicsLayers>(DEFAULT_LAYERS);
  const [initialSnapshot, setInitialSnapshot] = useState<string>('');

  // Clima API
  const [weatherCityQuery, setWeatherCityQuery] = useState<string>('');
  const [isQueryingWeather, setIsQueryingWeather] = useState(false);
  const [weatherPositionMode, setWeatherPositionMode] = useState<'UNDER_CLOCK' | 'CUSTOM'>('UNDER_CLOCK');

  // Secuencia PNG escaneo
  const [sequenceScanInfo, setSequenceScanInfo] = useState<{
    text: string;
    isError?: boolean;
  } | null>(null);

  // Helper para actualizar el borrador de capas
  const updateLayer = useCallback(<K extends keyof GraphicsLayers>(layerKey: K, patch: Partial<GraphicsLayers[K]>) => {
    setDraftLayers(prev => ({
      ...prev,
      [layerKey]: {
        ...prev[layerKey],
        ...patch
      }
    }));
  }, []);

  // Comparación de borrador para detectar cambios sin guardar
  const currentSnapshot = useMemo(() => {
    return JSON.stringify({ masterEnabled, layers: draftLayers });
  }, [masterEnabled, draftLayers]);

  const hasUnsavedChanges = useMemo(() => {
    if (!initialSnapshot) return false;
    return initialSnapshot !== currentSnapshot;
  }, [initialSnapshot, currentSnapshot]);

  // Aviso al intentar cerrar o refrescar si hay cambios pendientes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // Cargar estado desde el servidor Node
  const loadState = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.getGraphicsState();
      setServerState(data);

      setMasterEnabled(Boolean(data.masterEnabled));

      const l = data.layers || {};
      const loadedLayers: GraphicsLayers = {
        logo: {
          ...DEFAULT_LAYERS.logo,
          ...(l.logo || {}),
          x: l.logo?.x ?? DEFAULT_LAYERS.logo.x,
          y: l.logo?.y ?? DEFAULT_LAYERS.logo.y,
          scale: l.logo?.scale ?? DEFAULT_LAYERS.logo.scale,
          opacity: l.logo?.opacity ?? DEFAULT_LAYERS.logo.opacity,
          speed: l.logo?.speed ?? 1.0
        },
        clock: {
          ...DEFAULT_LAYERS.clock,
          ...(l.clock || {}),
          x: l.clock?.x ?? DEFAULT_LAYERS.clock.x,
          y: l.clock?.y ?? DEFAULT_LAYERS.clock.y,
          fontSize: l.clock?.fontSize ?? DEFAULT_LAYERS.clock.fontSize,
          bgOpacity: l.clock?.bgOpacity ?? DEFAULT_LAYERS.clock.bgOpacity
        },
        weather: {
          ...DEFAULT_LAYERS.weather,
          ...(l.weather || {}),
          x: l.weather?.x ?? DEFAULT_LAYERS.weather.x,
          y: l.weather?.y ?? DEFAULT_LAYERS.weather.y
        },
        ticker: {
          ...DEFAULT_LAYERS.ticker,
          ...(l.ticker || {})
        }
      };

      setDraftLayers(loadedLayers);
      setWeatherCityQuery(loadedLayers.weather.city || '');
      setWeatherPositionMode(loadedLayers.weather.position === 'CUSTOM' ? 'CUSTOM' : 'UNDER_CLOCK');

      const snapshot = JSON.stringify({ masterEnabled: Boolean(data.masterEnabled), layers: loadedLayers });
      setInitialSnapshot(snapshot);
    } catch (err: any) {
      console.error('[GraphicsWorkspace] Error al cargar configuración:', err);
      setMessage({ text: `Error al conectar con el servidor: ${err.message}`, type: 'error' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadState();
  }, [loadState]);

  // Descartar cambios locales y volver a la configuración del servidor
  const handleDiscardChanges = useCallback(() => {
    if (initialSnapshot) {
      try {
        const parsed = JSON.parse(initialSnapshot);
        setMasterEnabled(parsed.masterEnabled);
        setDraftLayers(parsed.layers);
        setMessage({ text: 'Cambios descartados. Se restauró la configuración vigente.', type: 'info' });
      } catch {}
    }
  }, [initialSnapshot]);

  // Interruptor maestro CG Inmediato (Regla G2: parada de emergencia inmediata del CG sin esperar guardado)
  const handleToggleMasterCg = async () => {
    const nextVal = !masterEnabled;
    setMasterEnabled(nextVal);
    try {
      await api.toggleMasterGraphics(nextVal);
      setMessage({
        text: nextVal ? 'CG Master activado al aire inmediatamente.' : 'CG Master silenciado inmediatamente (video limpio al aire).',
        type: 'info'
      });
    } catch (err: any) {
      setMasterEnabled(!nextVal); // Revertir en fallo
      setMessage({ text: `Fallo al conmutar CG Master: ${err.message}`, type: 'error' });
    }
  };

  // Selector nativo de archivos para Logo (Electron o browser fallback)
  const handleBrowseLogo = async () => {
    const electron = (window as any).electronAPI;
    if (electron?.openImageDialog) {
      try {
        const filePath = await electron.openImageDialog();
        if (filePath) {
          updateLayer('logo', { path: filePath });
        }
      } catch (err: any) {
        setMessage({ text: `Error al abrir selector de archivo: ${err.message}`, type: 'error' });
      }
    } else {
      setMessage({ text: 'Ingresa la ruta absoluta del archivo PNG en el campo de texto.', type: 'info' });
    }
  };

  // Selector nativo de carpetas para Secuencia PNG (Electron o browser fallback)
  const handleBrowseSequenceFolder = async () => {
    const electron = (window as any).electronAPI;
    if (electron?.openFolderDialog) {
      try {
        const folderPath = await electron.openFolderDialog();
        if (folderPath) {
          updateLayer('logo', { sequenceDir: folderPath });
          handleScanSequence(folderPath);
        }
      } catch (err: any) {
        setMessage({ text: `Error al abrir selector de directorio: ${err.message}`, type: 'error' });
      }
    } else {
      setMessage({ text: 'Ingresa la ruta absoluta de la carpeta en el campo de texto.', type: 'info' });
    }
  };

  // Escaneo de secuencia PNG con análisis de resolución, alfa y memoria (Regla G7)
  const handleScanSequence = async (dirOverride?: string) => {
    const targetDir = (dirOverride || draftLayers.logo.sequenceDir || '').trim();
    if (!targetDir) {
      setMessage({ text: 'Especifica la ruta completa de la carpeta de imágenes PNG.', type: 'error' });
      return;
    }

    try {
      setLoading(true);
      const res = await api.scanPngSequence(targetDir);
      if (res.success && res.framesCount) {
        const memText = res.memoryMb !== undefined ? ` • Memoria estimada: ${res.memoryMb} MB` : '';
        const resText = res.width && res.height ? ` • ${res.width}x${res.height}` : '';
        const alphaText = res.hasAlpha ? ' • Alfa RGBA' : ' • Sin canal alfa';
        
        if (res.exceedsLimit) {
          setSequenceScanInfo({
            text: `ATENCIÓN: ${res.framesCount} cuadros (${res.memoryMb} MB). Excede el límite de 400 MB (Regla G7).`,
            isError: true
          });
          setMessage({ text: `Secuencia excede el límite de memoria permitido (400 MB).`, type: 'error' });
        } else {
          setSequenceScanInfo({
            text: `${res.framesCount} cuadros analizados${resText}${alphaText}${memText}`,
            isError: false
          });
          setMessage({ text: `Secuencia escaneada exitosamente: ${res.framesCount} fotogramas.`, type: 'success' });
        }
      } else {
        setSequenceScanInfo({ text: res.error || 'No se encontraron imágenes en la carpeta.', isError: true });
        setMessage({ text: res.error || 'Fallo al escanear carpeta.', type: 'error' });
      }
    } catch (err: any) {
      setSequenceScanInfo({ text: err.message, isError: true });
      setMessage({ text: `Error al escanear secuencia: ${err.message}`, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Consulta meteorológica al servidor (Open-Meteo)
  const handleQueryWeatherApi = async () => {
    if (!weatherCityQuery.trim()) {
      setMessage({ text: 'Ingresa el nombre de una ciudad (ej. Santa Cruz de la Sierra, La Paz).', type: 'error' });
      return;
    }

    try {
      setIsQueryingWeather(true);
      setMessage(null);

      const res = await api.updateWeatherLocation(null, null, weatherCityQuery.trim());
      if (res && res.weather) {
        updateLayer('weather', {
          city: res.weather.city,
          latitude: res.weather.latitude,
          longitude: res.weather.longitude,
          temperature: res.weather.temperature,
          humidity: res.weather.humidity,
          weatherCode: res.weather.weatherCode,
          conditionText: res.weather.conditionText,
          icon: res.weather.icon,
          lastUpdated: res.weather.lastUpdated
        });
        setMessage({
          text: `Datos meteorológicos actualizados para ${res.weather.city}: ${res.weather.temperature}°C, ${res.weather.conditionText} (${res.weather.humidity}% HR).`,
          type: 'success'
        });
      } else {
        throw new Error(res.error || 'No se encontraron datos para la ciudad especificada');
      }
    } catch (err: any) {
      setMessage({ text: `Error meteorológico: ${err.message}`, type: 'error' });
    } finally {
      setIsQueryingWeather(false);
    }
  };

  // Guardado atómico único en PUT /api/graphics/package
  const handleSavePackage = async () => {
    try {
      setSaving(true);
      setMessage(null);

      // Calcular posiciones relativas efectivas para el clima si está anclado a la hora
      const adjustedLayers = { ...draftLayers };
      if (weatherPositionMode === 'UNDER_CLOCK') {
        adjustedLayers.weather = {
          ...adjustedLayers.weather,
          position: 'WITH_CLOCK',
          x: adjustedLayers.clock.x,
          y: Math.min(92, adjustedLayers.clock.y + 4.5)
        };
      } else {
        adjustedLayers.weather = {
          ...adjustedLayers.weather,
          position: 'CUSTOM'
        };
      }

      const res = await api.saveGraphicsPackage({
        masterEnabled,
        layers: adjustedLayers
      });

      setServerState(res);
      setDraftLayers(adjustedLayers);
      const newSnapshot = JSON.stringify({ masterEnabled, layers: adjustedLayers });
      setInitialSnapshot(newSnapshot);

      const rustTelemetry = res.nativeTelemetry;
      const isRustLoaded = rustTelemetry ? Boolean(rustTelemetry.loaded) : false;

      if (isRustLoaded) {
        setMessage({ text: 'Configuración de Gráficos guardada y confirmada en el motor nativo Rust.', type: 'success' });
      } else {
        setMessage({ text: 'Configuración guardada en SQLite. Lista para emisión SDI al iniciar reproducción.', type: 'success' });
      }
    } catch (err: any) {
      console.error('[GraphicsWorkspace] Error al guardar paquete gráfico:', err);
      setMessage({ text: `Error al guardar: ${err.message}`, type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  // Estado memoizado para la vista previa en vivo
  const previewState = useMemo<GraphicsState>(() => {
    const isUnder = weatherPositionMode === 'UNDER_CLOCK';
    return {
      masterEnabled,
      effectiveVisible: masterEnabled,
      isCommercial: false,
      suppressReason: null,
      timestamp: serverState?.timestamp || new Date().toISOString(),
      nativeTelemetry: serverState?.nativeTelemetry || null,
      layers: {
        ...draftLayers,
        weather: {
          ...draftLayers.weather,
          position: isUnder ? 'WITH_CLOCK' : 'CUSTOM',
          x: isUnder ? draftLayers.clock.x : draftLayers.weather.x,
          y: isUnder ? Math.min(92, draftLayers.clock.y + 4.5) : draftLayers.weather.y
        }
      }
    };
  }, [masterEnabled, draftLayers, weatherPositionMode, serverState]);

  // Alertas de zona segura (Title Safe 80% / Action Safe 90%)
  const isLogoOutsideActionSafe = draftLayers.logo.x > 90 || draftLayers.logo.y > 90 || draftLayers.logo.x < 5 || draftLayers.logo.y < 5;
  const isClockOutsideActionSafe = draftLayers.clock.x > 90 || draftLayers.clock.y > 90 || draftLayers.clock.x < 5 || draftLayers.clock.y < 5;
  const isWeatherOutsideActionSafe = weatherPositionMode === 'CUSTOM' && (draftLayers.weather.x > 90 || draftLayers.weather.y > 90 || draftLayers.weather.x < 5 || draftLayers.weather.y < 5);

  // Diagnóstico de antigüedad del clima (Regla G11: más de 1 hora se considera no vigente)
  const weatherLastUpdatedTime = draftLayers.weather.lastUpdated ? new Date(draftLayers.weather.lastUpdated).getTime() : 0;
  const weatherAgeMin = weatherLastUpdatedTime > 0 ? Math.round((Date.now() - weatherLastUpdatedTime) / 60000) : null;
  const isWeatherStale = weatherAgeMin !== null && weatherAgeMin > 60;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--color-canvas)', overflow: 'hidden' }}>
      {/* Workspace Header Material Design 3 */}
      <div style={{
        padding: '10px 18px',
        borderBottom: '1px solid var(--color-hairline)',
        background: 'var(--color-canvas-soft)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Sparkles size={18} color="var(--color-primary)" />
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-ink)', letterSpacing: '0.1px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>Generador Gráfico Broadcast (CG & Mosca de Emisión)</span>
              {hasUnsavedChanges && (
                <span style={{
                  fontSize: 10,
                  fontWeight: 600,
                  background: 'var(--apple-orange, #ff9f0a)',
                  color: '#ffffff',
                  padding: '1px 6px',
                  borderRadius: 10
                }}>
                  Cambios pendientes
                </span>
              )}
            </div>
            <div style={{ fontSize: 10.5, color: 'var(--color-text-muted)' }}>
              Composición de Logo, Reloj BOT Oficial, Clima Dinámico y Ticker
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Master CG Switch Inmediato (Regla G2) */}
          <button
            type="button"
            className={`m3-loop-toggle ${masterEnabled ? 'active' : ''}`}
            onClick={handleToggleMasterCg}
            style={{ padding: '4px 10px', fontSize: 11 }}
            title={masterEnabled ? 'Desactivar CG Master inmediatamente' : 'Habilitar CG Master inmediatamente'}
          >
            {masterEnabled ? <Eye size={13} color="var(--color-success)" /> : <EyeOff size={13} color="var(--apple-orange, #ff9f0a)" />}
            <span>{masterEnabled ? 'CG MASTER ON' : 'CG MASTER MUTE'}</span>
            <span className={`m3-switch-pill ${masterEnabled ? 'checked' : ''}`}>
              <span className="m3-switch-thumb" />
            </span>
          </button>

          {/* Descartar cambios */}
          {hasUnsavedChanges && (
            <button
              type="button"
              className="m3-btn-tonal"
              onClick={handleDiscardChanges}
              disabled={saving}
              style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, padding: '0 12px', height: 32 }}
              title="Descartar cambios no guardados y restaurar valores vigentes"
            >
              <RotateCcw size={12} />
              <span>Descartar</span>
            </button>
          )}

          {/* Guardar cambios atómico */}
          <button
            className="m3-btn-filled"
            onClick={handleSavePackage}
            disabled={saving || !hasUnsavedChanges}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 11.5,
              padding: '0 16px',
              height: 32,
              opacity: (!hasUnsavedChanges && !saving) ? 0.6 : 1
            }}
          >
            {saving ? <RefreshCw size={13} className="spin" /> : <Check size={13} />}
            <span>{saving ? 'Guardando...' : 'Guardar'}</span>
          </button>
        </div>
      </div>

      {/* Alerta de Estado */}
      {message && (
        <div style={{
          padding: '8px 18px',
          background: message.type === 'success' ? 'var(--color-success-subtle)' : message.type === 'info' ? 'var(--color-field)' : 'var(--color-live-subtle)',
          color: message.type === 'success' ? 'var(--color-success-on-subtle)' : message.type === 'info' ? 'var(--color-ink)' : 'var(--color-live-on-subtle)',
          fontSize: 11.5,
          fontWeight: 500,
          borderBottom: '1px solid var(--color-hairline)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {message.type === 'success' ? <Check size={14} /> : message.type === 'info' ? <Sparkles size={14} color="var(--color-primary)" /> : <AlertCircle size={14} />}
            <span>{message.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setMessage(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: 2 }}
          >
            <X size={13} />
          </button>
        </div>
      )}

      {/* Main Body */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' }}>
        {/* LEFT COLUMN: Large High-Resolution 16:9 Monitor Preview */}
        <div style={{
          flex: '1 1 58%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 20,
          background: 'var(--color-canvas)',
          borderRight: '1px solid var(--color-hairline)',
          overflow: 'hidden'
        }}>
          {/* Monitor Toolbar */}
          <div style={{
            width: '100%',
            maxWidth: 880,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 8
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Tv size={14} color="var(--color-primary)" />
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-ink)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                Monitor Técnico de Vista Previa CG
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {/* Selector de fondo */}
              <div style={{ display: 'flex', gap: 4 }}>
                <button
                  type="button"
                  className={bgMode === 'STUDIO' ? 'm3-btn-filled' : 'm3-btn-tonal'}
                  onClick={() => setBgMode('STUDIO')}
                  style={{ fontSize: 10, padding: '0 8px', height: 26, borderRadius: 5 }}
                >
                  Estudio
                </button>
                <button
                  type="button"
                  className={bgMode === 'SMPTE' ? 'm3-btn-filled' : 'm3-btn-tonal'}
                  onClick={() => setBgMode('SMPTE')}
                  style={{ fontSize: 10, padding: '0 8px', height: 26, borderRadius: 5 }}
                >
                  Barras SMPTE
                </button>
                <button
                  type="button"
                  className={bgMode === 'GRID' ? 'm3-btn-filled' : 'm3-btn-tonal'}
                  onClick={() => setBgMode('GRID')}
                  style={{ fontSize: 10, padding: '0 8px', height: 26, borderRadius: 5 }}
                >
                  Retícula
                </button>
              </div>

              {/* Toggle Safe Areas */}
              <button
                type="button"
                className={showSafeAreas ? 'm3-btn-filled' : 'm3-btn-tonal'}
                onClick={() => setShowSafeAreas(!showSafeAreas)}
                style={{ fontSize: 10, padding: '0 8px', height: 26, borderRadius: 5 }}
                title="Muestra guías de seguridad Action Safe (90%) y Title Safe (80%)"
              >
                Safe Area (80/90%)
              </button>
            </div>
          </div>

          {/* 16:9 Aspect Ratio Frame */}
          <div style={{
            width: '100%',
            maxWidth: 880,
            aspectRatio: '16 / 9',
            position: 'relative',
            background: bgMode === 'SMPTE'
              ? 'linear-gradient(to right, #c0c0c0 14.28%, #c0c000 14.28%, #c0c000 28.56%, #00c0c0 28.56%, #00c0c0 42.84%, #00c000 42.84%, #00c000 57.12%, #c000c0 57.12%, #c000c0 71.4%, #c00000 71.4%, #c00000 85.68%, #0000c0 85.68%)'
              : (bgMode === 'GRID' ? '#111520' : '#0a0d14'),
            borderRadius: 'var(--radius-md)',
            overflow: 'hidden',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
            border: '1px solid var(--color-hairline)'
          }}>
            {/* Grid Pattern Background if selected */}
            {bgMode === 'GRID' && (
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                backgroundImage: 'linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)',
                backgroundSize: '40px 40px',
                pointerEvents: 'none'
              }} />
            )}

            {/* Broadcast Safe Area Overlays */}
            {showSafeAreas && (
              <>
                {/* Action Safe (90%) */}
                <div style={{
                  position: 'absolute',
                  top: '5%',
                  left: '5%',
                  width: '90%',
                  height: '90%',
                  border: '1px dashed rgba(255, 214, 10, 0.45)',
                  pointerEvents: 'none',
                  zIndex: 20
                }}>
                  <span style={{ position: 'absolute', top: 3, left: 5, fontSize: 8.5, color: '#ffd60a', fontWeight: 600 }}>
                    ACTION SAFE 90%
                  </span>
                </div>

                {/* Title Safe (80%) */}
                <div style={{
                  position: 'absolute',
                  top: '10%',
                  left: '10%',
                  width: '80%',
                  height: '80%',
                  border: '1px dashed rgba(100, 210, 255, 0.55)',
                  pointerEvents: 'none',
                  zIndex: 20
                }}>
                  <span style={{ position: 'absolute', top: 3, left: 5, fontSize: 8.5, color: '#64d2ff', fontWeight: 600 }}>
                    TITLE SAFE 80%
                  </span>
                </div>
              </>
            )}

            {/* Live Graphics Overlay Component */}
            <GraphicsOverlay
              graphics={previewState}
              isPaused={false}
            />

            {/* Monitor Tally Badge */}
            <div style={{
              position: 'absolute',
              bottom: 8,
              right: 10,
              zIndex: 25,
              background: 'rgba(0,0,0,0.7)',
              padding: '2px 8px',
              borderRadius: 'var(--radius-full)',
              fontSize: 9.5,
              fontWeight: 500,
              color: '#ffffff',
              border: '1px solid rgba(255,255,255,0.2)',
              pointerEvents: 'none',
              fontFamily: 'var(--font-family-mono)'
            }}>
              VISTA PREVIA DE DISEÑO (16:9)
            </div>
          </div>

          <div style={{ width: '100%', maxWidth: 880, display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 10.5, color: 'var(--color-text-muted)' }}>
            <span>La emisión de gráficos se rige por: Master CG + Botón CG por ítem en escaleta (Regla G2).</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              {masterEnabled ? (
                <>
                  <Check size={12} color="var(--color-success)" />
                  <span style={{ color: 'var(--color-success)' }}>Master CG Habilitado</span>
                </>
              ) : (
                <>
                  <X size={12} color="var(--apple-orange, #ff9f0a)" />
                  <span style={{ color: 'var(--apple-orange, #ff9f0a)' }}>Master CG Muteado</span>
                </>
              )}
            </span>
          </div>
        </div>

        {/* RIGHT COLUMN: Control Panels */}
        <div style={{
          flex: '1 1 42%',
          display: 'flex',
          flexDirection: 'column',
          minWidth: 380,
          background: 'var(--color-canvas-soft)',
          overflowY: 'auto'
        }}>
          {/* Subnavigation Tabs */}
          <div style={{
            display: 'flex',
            borderBottom: '1px solid var(--color-hairline)',
            background: 'var(--color-field)',
            padding: '6px 10px',
            gap: 6,
            flexShrink: 0
          }}>
            <button
              type="button"
              className={activeTab === 'ALL' ? 'm3-btn-filled' : 'm3-btn-tonal'}
              onClick={() => setActiveTab('ALL')}
              style={{ fontSize: 11, padding: '0 10px', height: 28, borderRadius: 6 }}
            >
              <Sliders size={12} />
              <span>General</span>
            </button>
            <button
              type="button"
              className={activeTab === 'LOGO' ? 'm3-btn-filled' : 'm3-btn-tonal'}
              onClick={() => setActiveTab('LOGO')}
              style={{ fontSize: 11, padding: '0 10px', height: 28, borderRadius: 6 }}
            >
              <Image size={12} />
              <span>Mosca / Logo</span>
            </button>
            <button
              type="button"
              className={activeTab === 'CLOCK' ? 'm3-btn-filled' : 'm3-btn-tonal'}
              onClick={() => setActiveTab('CLOCK')}
              style={{ fontSize: 11, padding: '0 10px', height: 28, borderRadius: 6 }}
            >
              <Clock size={12} />
              <span>Reloj BOT</span>
            </button>
            <button
              type="button"
              className={activeTab === 'WEATHER' ? 'm3-btn-filled' : 'm3-btn-tonal'}
              onClick={() => setActiveTab('WEATHER')}
              style={{ fontSize: 11, padding: '0 10px', height: 28, borderRadius: 6 }}
            >
              <CloudSun size={12} />
              <span>Clima (API)</span>
            </button>
            <button
              type="button"
              className={activeTab === 'TICKER' ? 'm3-btn-filled' : 'm3-btn-tonal'}
              onClick={() => setActiveTab('TICKER')}
              style={{ fontSize: 11, padding: '0 10px', height: 28, borderRadius: 6 }}
            >
              <Layers size={12} />
              <span>Ticker</span>
            </button>
          </div>

          {/* Panels Container */}
          <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>

            {/* SECCIÓN MOSCA / LOGO */}
            {(activeTab === 'ALL' || activeTab === 'LOGO') && (
              <LayerCard
                title="Logo / Mosca de Canal"
                subtitle="PNG con Alfa o Secuencia Animada (1 cuadro por cuadro de salida)"
                icon={<Image size={16} color="var(--color-primary)" />}
                enabled={draftLayers.logo.enabled}
                isLoadedInRust={serverState?.nativeTelemetry?.loaded}
                onToggle={(val) => updateLayer('logo', { enabled: val })}
              >
                <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                  <button
                    type="button"
                    className={draftLayers.logo.type === 'STATIC_PNG' ? 'm3-btn-filled' : 'm3-btn-tonal'}
                    onClick={() => updateLayer('logo', { type: 'STATIC_PNG' })}
                    style={{ flex: 1, fontSize: 11, padding: '0 8px', height: 28, borderRadius: 5 }}
                  >
                    PNG Estático
                  </button>
                  <button
                    type="button"
                    className={draftLayers.logo.type === 'PNG_SEQUENCE' ? 'm3-btn-filled' : 'm3-btn-tonal'}
                    onClick={() => updateLayer('logo', { type: 'PNG_SEQUENCE' })}
                    style={{ flex: 1, fontSize: 11, padding: '0 8px', height: 28, borderRadius: 5 }}
                  >
                    Secuencia PNG Animada
                  </button>
                </div>

                {draftLayers.logo.type === 'STATIC_PNG' ? (
                  <div style={{ marginBottom: 10 }}>
                    <label style={{ display: 'block', fontSize: 10.5, color: 'var(--color-text-muted)', marginBottom: 4 }}>
                      Ruta del Archivo PNG con Alfa:
                    </label>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <input
                        type="text"
                        style={{
                          flex: 1,
                          padding: '6px 10px',
                          fontSize: 11,
                          background: 'var(--color-field)',
                          border: '1px solid var(--color-hairline)',
                          borderRadius: 'var(--radius-sm)',
                          color: 'var(--color-ink)',
                          outline: 'none'
                        }}
                        placeholder="C:\Graphics\Logo_HD.png"
                        value={draftLayers.logo.path}
                        onChange={(e) => updateLayer('logo', { path: e.target.value })}
                      />
                      <button
                        type="button"
                        className="m3-btn-tonal"
                        onClick={handleBrowseLogo}
                        style={{ padding: '0 10px', height: 28, fontSize: 11, display: 'flex', alignItems: 'center', gap: 5 }}
                        title="Seleccionar archivo desde el explorador"
                      >
                        <FolderOpen size={12} />
                        <span>Examinar...</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ marginBottom: 10 }}>
                    <label style={{ display: 'block', fontSize: 10.5, color: 'var(--color-text-muted)', marginBottom: 4 }}>
                      Carpeta con Secuencia PNG numerada:
                    </label>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <input
                        type="text"
                        style={{
                          flex: 1,
                          padding: '6px 10px',
                          fontSize: 11,
                          background: 'var(--color-field)',
                          border: '1px solid var(--color-hairline)',
                          borderRadius: 'var(--radius-sm)',
                          color: 'var(--color-ink)',
                          outline: 'none'
                        }}
                        placeholder="C:\Graphics\Mosca_Secuencia"
                        value={draftLayers.logo.sequenceDir || ''}
                        onChange={(e) => updateLayer('logo', { sequenceDir: e.target.value })}
                      />
                      <button
                        type="button"
                        className="m3-btn-tonal"
                        onClick={handleBrowseSequenceFolder}
                        style={{ padding: '0 10px', height: 28, fontSize: 11, display: 'flex', alignItems: 'center', gap: 5 }}
                        title="Seleccionar carpeta desde el explorador"
                      >
                        <FolderOpen size={12} />
                        <span>Examinar...</span>
                      </button>
                      <button
                        type="button"
                        className="m3-btn-tonal"
                        onClick={() => handleScanSequence()}
                        style={{ padding: '0 10px', height: 28, fontSize: 11, display: 'flex', alignItems: 'center', gap: 5 }}
                        title="Inspeccionar archivos, dimensiones y memoria"
                      >
                        <Search size={12} />
                        <span>Escanear</span>
                      </button>
                    </div>
                    {sequenceScanInfo && (
                      <div style={{
                        fontSize: 10,
                        color: sequenceScanInfo.isError ? 'var(--color-live, #ff453a)' : 'var(--color-success, #30d158)',
                        marginTop: 4,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4
                      }}>
                        {sequenceScanInfo.isError ? <AlertCircle size={11} /> : <Check size={11} />}
                        <span>{sequenceScanInfo.text}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Control de Velocidad de la secuencia (Regla G6: un cuadro de logo por cuadro de salida con speed) */}
                {draftLayers.logo.type === 'PNG_SEQUENCE' && (
                  <div style={{ marginBottom: 12 }}>
                    <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5, color: 'var(--color-text-muted)', marginBottom: 3 }}>
                      <span>Velocidad de Animación (Multiplicador de cadencia)</span>
                      <span>{draftLayers.logo.speed || 1.0}x</span>
                    </label>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {[0.5, 1.0, 1.5, 2.0].map((spd) => (
                        <button
                          key={spd}
                          type="button"
                          className={(draftLayers.logo.speed ?? 1.0) === spd ? 'm3-btn-filled' : 'm3-btn-tonal'}
                          onClick={() => updateLayer('logo', { speed: spd })}
                          style={{ flex: 1, fontSize: 10.5, padding: '0 8px', height: 26, borderRadius: 5 }}
                        >
                          {spd}x
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Sliders de Transformación */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginTop: 8 }}>
                  <SliderRow
                    label="Escala"
                    value={draftLayers.logo.scale}
                    min={20}
                    max={150}
                    unit="%"
                    onChange={(val) => updateLayer('logo', { scale: val })}
                  />
                  <SliderRow
                    label="Opacidad"
                    value={draftLayers.logo.opacity}
                    min={10}
                    max={100}
                    unit="%"
                    onChange={(val) => updateLayer('logo', { opacity: val })}
                  />
                  <SliderRow
                    label="Posición X (Ancla Derecha)"
                    value={draftLayers.logo.x}
                    min={0}
                    max={95}
                    unit="%"
                    isWarning={isLogoOutsideActionSafe}
                    warningText="Elemento cercano o fuera de Action Safe (90%)"
                    onChange={(val) => updateLayer('logo', { x: val })}
                  />
                  <SliderRow
                    label="Posición Y"
                    value={draftLayers.logo.y}
                    min={0}
                    max={90}
                    unit="%"
                    isWarning={isLogoOutsideActionSafe}
                    warningText="Elemento cercano o fuera de Action Safe (90%)"
                    onChange={(val) => updateLayer('logo', { y: val })}
                  />
                </div>
              </LayerCard>
            )}

            {/* SECCIÓN RELOJ */}
            {(activeTab === 'ALL' || activeTab === 'CLOCK') && (
              <LayerCard
                title="Reloj Oficial de Transmisión"
                subtitle="Hora Oficial de Bolivia (BOT, UTC-4) generada por telemetría"
                icon={<Clock size={16} color="var(--color-primary)" />}
                enabled={draftLayers.clock.enabled}
                onToggle={(val) => updateLayer('clock', { enabled: val })}
              >
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 10 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 10.5, color: 'var(--color-text-muted)', marginBottom: 4 }}>
                      Zona Horaria Oficial:
                    </label>
                    <select
                      style={{
                        width: '100%',
                        padding: '5px 8px',
                        fontSize: 11,
                        background: 'var(--color-field)',
                        border: '1px solid var(--color-hairline)',
                        borderRadius: 'var(--radius-sm)',
                        color: 'var(--color-ink)',
                        outline: 'none'
                      }}
                      value={draftLayers.clock.timezone}
                      onChange={(e) => updateLayer('clock', { timezone: e.target.value as 'BOT' | 'LOCAL' })}
                    >
                      <option value="BOT">Bolivia Oficial (BOT, UTC-4)</option>
                      <option value="LOCAL">Hora Local del Sistema</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 10.5, color: 'var(--color-text-muted)', marginBottom: 4 }}>
                      Formato de Tiempo:
                    </label>
                    <select
                      style={{
                        width: '100%',
                        padding: '5px 8px',
                        fontSize: 11,
                        background: 'var(--color-field)',
                        border: '1px solid var(--color-hairline)',
                        borderRadius: 'var(--radius-sm)',
                        color: 'var(--color-ink)',
                        outline: 'none'
                      }}
                      value={draftLayers.clock.format}
                      onChange={(e) => updateLayer('clock', { format: e.target.value as 'HH:MM:SS' | 'HH:MM' })}
                    >
                      <option value="HH:MM:SS">HH:MM:SS (Con segundos)</option>
                      <option value="HH:MM">HH:MM (Solo minutos)</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 14, marginBottom: 10 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--color-ink)', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={draftLayers.clock.showBox}
                      onChange={(e) => updateLayer('clock', { showBox: e.target.checked })}
                      disabled={!draftLayers.clock.enabled}
                      style={{ accentColor: 'var(--color-primary)' }}
                    />
                    <span>Fondo con transparencia constante</span>
                  </label>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, paddingTop: 10, borderTop: '1px solid var(--color-hairline)' }}>
                  <SliderRow
                    label="Posición X (Ancla Derecha)"
                    value={draftLayers.clock.x}
                    min={0}
                    max={95}
                    unit="%"
                    isWarning={isClockOutsideActionSafe}
                    warningText="Cercano o fuera de Action Safe (90%)"
                    onChange={(val) => updateLayer('clock', { x: val })}
                  />
                  <SliderRow
                    label="Posición Y"
                    value={draftLayers.clock.y}
                    min={0}
                    max={90}
                    unit="%"
                    isWarning={isClockOutsideActionSafe}
                    warningText="Cercano o fuera de Action Safe (90%)"
                    onChange={(val) => updateLayer('clock', { y: val })}
                  />
                  <SliderRow
                    label="Tamaño de Fuente"
                    value={draftLayers.clock.fontSize}
                    min={10}
                    max={26}
                    unit="px"
                    onChange={(val) => updateLayer('clock', { fontSize: val })}
                  />
                  <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                    <button
                      type="button"
                      className="m3-btn-tonal"
                      onClick={() => {
                        updateLayer('clock', {
                          x: draftLayers.logo.x,
                          y: Math.min(90, draftLayers.logo.y + 8)
                        });
                      }}
                      style={{ width: '100%', fontSize: 10.5, height: 28, borderRadius: 5 }}
                      title="Alinear automáticamente debajo de las coordenadas del logo"
                    >
                      Alinear debajo del Logo
                    </button>
                  </div>
                </div>
              </LayerCard>
            )}

            {/* SECCIÓN CLIMA */}
            {(activeTab === 'ALL' || activeTab === 'WEATHER') && (
              <LayerCard
                title="Información Meteorológica (API)"
                subtitle="Consulta meteorológica gobernada y respaldada por el servidor (Open-Meteo)"
                icon={<CloudSun size={16} color="var(--color-primary)" />}
                enabled={draftLayers.weather.enabled}
                onToggle={(val) => updateLayer('weather', { enabled: val })}
              >
                {/* Formulario de consulta de API dinámica */}
                <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
                  <input
                    type="text"
                    style={{
                      flex: 1,
                      padding: '6px 10px',
                      fontSize: 11.5,
                      background: 'var(--color-field)',
                      border: '1px solid var(--color-hairline)',
                      borderRadius: 'var(--radius-sm)',
                      color: 'var(--color-ink)',
                      outline: 'none'
                    }}
                    placeholder="Ciudad (ej. Santa Cruz de la Sierra, La Paz...)"
                    value={weatherCityQuery}
                    onChange={(e) => setWeatherCityQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleQueryWeatherApi();
                    }}
                  />
                  <button
                    type="button"
                    className="m3-btn-filled"
                    onClick={handleQueryWeatherApi}
                    disabled={isQueryingWeather}
                    style={{ padding: '0 12px', height: 30, fontSize: 11, display: 'flex', alignItems: 'center', gap: 5 }}
                  >
                    {isQueryingWeather ? <RefreshCw size={12} className="spin" /> : <Search size={12} />}
                    <span>{isQueryingWeather ? 'Consultando...' : 'Consultar'}</span>
                  </button>
                </div>

                {/* Tarjeta de estado de datos meteorológicos */}
                {draftLayers.weather.temperature !== null ? (
                  <div style={{
                    background: 'var(--color-field)',
                    borderRadius: 'var(--radius-md)',
                    padding: '8px 12px',
                    border: '1px solid var(--color-hairline)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 10
                  }}>
                    <div>
                      <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--color-ink)' }}>
                        {draftLayers.weather.city}
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--color-text-muted)', marginTop: 2 }}>
                        {draftLayers.weather.conditionText} • Humedad: {draftLayers.weather.humidity}%
                      </div>
                      {weatherAgeMin !== null && (
                        <div style={{
                          fontSize: 9.5,
                          color: isWeatherStale ? 'var(--apple-orange, #ff9f0a)' : 'var(--color-text-faint)',
                          marginTop: 2,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4
                        }}>
                          {isWeatherStale && <AlertTriangle size={10} color="var(--apple-orange, #ff9f0a)" />}
                          <span>{isWeatherStale ? `Dato desactualizado (hace ${weatherAgeMin} min) - Se auto-oculta tras 60m` : `Actualizado hace ${weatherAgeMin} min`}</span>
                        </div>
                      )}
                    </div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-primary)', fontFamily: 'var(--font-mono, monospace)' }}>
                      {draftLayers.weather.temperature}°C
                    </div>
                  </div>
                ) : (
                  <div style={{
                    background: 'var(--color-field)',
                    borderRadius: 'var(--radius-md)',
                    padding: '8px 12px',
                    border: '1px solid var(--color-hairline)',
                    fontSize: 10.5,
                    color: 'var(--color-text-muted)',
                    marginBottom: 10
                  }}>
                    Sin datos cargados. La capa no mostrará gráficos al aire hasta obtener lectura de temperatura válida.
                  </div>
                )}

                {/* Checkboxes de opciones */}
                <div style={{ display: 'flex', gap: 14, marginBottom: 10 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--color-ink)', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={draftLayers.weather.showIcon}
                      onChange={(e) => updateLayer('weather', { showIcon: e.target.checked })}
                      disabled={!draftLayers.weather.enabled}
                      style={{ accentColor: 'var(--color-primary)' }}
                    />
                    <span>Mostrar Icono</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--color-ink)', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={draftLayers.weather.showHumidity}
                      onChange={(e) => updateLayer('weather', { showHumidity: e.target.checked })}
                      disabled={!draftLayers.weather.enabled}
                      style={{ accentColor: 'var(--color-primary)' }}
                    />
                    <span>Mostrar Humedad</span>
                  </label>
                </div>

                {/* Ubicación del Clima */}
                <div style={{ paddingTop: 10, borderTop: '1px solid var(--color-hairline)' }}>
                  <label style={{ display: 'block', fontSize: 10.5, color: 'var(--color-text-muted)', marginBottom: 6, fontWeight: 500 }}>
                    Ubicación en Pantalla:
                  </label>
                  <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                    <button
                      type="button"
                      className={weatherPositionMode === 'UNDER_CLOCK' ? 'm3-btn-filled' : 'm3-btn-tonal'}
                      onClick={() => setWeatherPositionMode('UNDER_CLOCK')}
                      style={{ flex: 1, fontSize: 10.5, padding: '0 8px', height: 26, borderRadius: 5 }}
                    >
                      Anclar bajo la Hora
                    </button>
                    <button
                      type="button"
                      className={weatherPositionMode === 'CUSTOM' ? 'm3-btn-filled' : 'm3-btn-tonal'}
                      onClick={() => setWeatherPositionMode('CUSTOM')}
                      style={{ flex: 1, fontSize: 10.5, padding: '0 8px', height: 26, borderRadius: 5 }}
                    >
                      Posición Libre
                    </button>
                  </div>

                  {weatherPositionMode === 'CUSTOM' ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginTop: 8 }}>
                      <SliderRow
                        label="Posición X"
                        value={draftLayers.weather.x}
                        min={0}
                        max={95}
                        unit="%"
                        isWarning={isWeatherOutsideActionSafe}
                        warningText="Cercano o fuera de Action Safe (90%)"
                        onChange={(val) => updateLayer('weather', { x: val })}
                      />
                      <SliderRow
                        label="Posición Y"
                        value={draftLayers.weather.y}
                        min={0}
                        max={90}
                        unit="%"
                        isWarning={isWeatherOutsideActionSafe}
                        warningText="Cercano o fuera de Action Safe (90%)"
                        onChange={(val) => updateLayer('weather', { y: val })}
                      />
                    </div>
                  ) : (
                    <div style={{ fontSize: 10, color: 'var(--color-text-muted)', marginTop: 2 }}>
                      La pastilla meteorológica se ancla automáticamente bajo el reloj oficial para evitar solapamientos.
                    </div>
                  )}
                </div>
              </LayerCard>
            )}

            {/* SECCIÓN TICKER */}
            {(activeTab === 'ALL' || activeTab === 'TICKER') && (
              <LayerCard
                title="Zócalo Inferior de Titulares (Ticker)"
                subtitle="Cintillo continuo desplazado por hardware en Rust (píxeles por cuadro)"
                icon={<Layers size={16} color="var(--color-primary)" />}
                enabled={draftLayers.ticker.enabled}
                onToggle={(val) => updateLayer('ticker', { enabled: val })}
              >
                <div style={{ marginBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5, color: 'var(--color-text-muted)', marginBottom: 4 }}>
                    <span>Titulares para el cintillo (separados por •):</span>
                    <span style={{ color: draftLayers.ticker.text.length > 300 ? 'var(--apple-orange, #ff9f0a)' : 'inherit' }}>
                      {draftLayers.ticker.text.length} caracteres
                    </span>
                  </div>
                  <textarea
                    style={{
                      width: '100%',
                      minHeight: 56,
                      padding: '6px 10px',
                      fontSize: 11,
                      fontFamily: 'inherit',
                      resize: 'vertical',
                      background: 'var(--color-field)',
                      border: '1px solid var(--color-hairline)',
                      borderRadius: 'var(--radius-sm)',
                      color: 'var(--color-ink)',
                      outline: 'none'
                    }}
                    value={draftLayers.ticker.text}
                    onChange={(e) => updateLayer('ticker', { text: e.target.value })}
                    placeholder="TITULAR 1 • TITULAR 2 • PROGRAMACIÓN ESPECIAL HOY 21:00..."
                  />
                  {draftLayers.ticker.text.length > 500 && (
                    <div style={{ fontSize: 9.5, color: 'var(--apple-orange, #ff9f0a)', marginTop: 2 }}>
                      Aviso: Textos excesivamente largos aumentan la huella de memoria del bitmap del zócalo.
                    </div>
                  )}
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 10.5, color: 'var(--color-text-muted)', marginBottom: 4 }}>
                    Velocidad de desplazamiento (Píxeles por Cuadro):
                  </label>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {(['SLOW', 'NORMAL', 'FAST'] as const).map((spd) => {
                      const speedLabels = {
                        SLOW: 'Lenta (1 px/f)',
                        NORMAL: 'Normal (2 px/f)',
                        FAST: 'Rápida (3 px/f)'
                      };
                      return (
                        <button
                          key={spd}
                          type="button"
                          className={draftLayers.ticker.speed === spd ? 'm3-btn-filled' : 'm3-btn-tonal'}
                          onClick={() => updateLayer('ticker', { speed: spd })}
                          style={{ flex: 1, fontSize: 10.5, padding: '0 8px', height: 26, borderRadius: 5 }}
                        >
                          {speedLabels[spd]}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </LayerCard>
            )}

          </div>
        </div>
      </div>
    </div>
  );
};
