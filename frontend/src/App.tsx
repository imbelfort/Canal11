import React, { useState, useEffect } from 'react';
import { api } from './services/api';
import { usePlayoutSocket } from './hooks/usePlayoutSocket';
import { IdeTopBar } from './components/IdeTopBar';
import { MasterDeck } from './components/MasterDeck';
import { PlaylistTable } from './components/Playlist/PlaylistTable';
import { OutputConfigModal, InputConfigModal } from './components/Hardware';
import { NdiModal } from './components/Ndi/NdiModal';
import { GraphicsModal } from './components/Graphics/GraphicsModal';
import { EmergencyModal } from './components/Emergency/EmergencyModal';
import { NetworkModal } from './components/Network/NetworkModal';
import { AboutModal } from './components/About/AboutModal';
import { ExitConfirmModal } from './components/Common/ExitConfirmModal';
import { MasterAudioModal } from './components/Audio/MasterAudioModal';
import { SessionSplashLoader } from './components/Common/SessionSplashLoader';
import { AuditView } from './components/Audit/AuditView';
import { IncidentsView } from './components/Incidents/IncidentsView';
import { PlaylistBuilderView } from './components/Playlist/PlaylistBuilderView';
import { ErrorBoundary } from './components/Common/ErrorBoundary';
import { ErrorAlertBanner } from './components/Common/ErrorAlertBanner';
import { ListVideo, FileSpreadsheet, AlertCircle, CalendarClock, Cpu, Layers, Gauge, Clock, Tv, Sliders } from 'lucide-react';
import { SystemMetrics } from './types/playout';
import { resolveUrl } from './services/api/client';

import { LoginModal } from './components/LoginModal';
import { PreferencesModal } from './components/PreferencesModal';
import { RoleBasedPlayoutView } from './components/RoleBasedPlayoutView';
import { usePreferences } from './context/PreferencesContext';

type TabType = 'PLAYLIST' | 'BUILDER' | 'BMS' | 'AUDIT' | 'INCIDENTS';

export const App: React.FC = () => {
  const { user, setUser } = usePreferences();
  const [isPreferencesOpen, setIsPreferencesOpen] = useState(false);

  const { playoutState, isConnected } = usePlayoutSocket();
  // Reloj Oficial de Bolivia (BOT, UTC-4) en Vivo con Segundero
  const [boliviaTime, setBoliviaTime] = useState<string>(() => {
    try {
      return new Intl.DateTimeFormat('es-BO', {
        timeZone: 'America/La_Paz',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      }).format(new Date());
    } catch {
      return new Date().toLocaleTimeString();
    }
  });

  useEffect(() => {
    const timer = setInterval(() => {
      try {
        setBoliviaTime(
          new Intl.DateTimeFormat('es-BO', {
            timeZone: 'America/La_Paz',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
          }).format(new Date())
        );
      } catch {
        setBoliviaTime(new Date().toLocaleTimeString());
      }
    }, 500);
    return () => clearInterval(timer);
  }, []);

  // Deteccion de vista inicial por parametro URL (ej. ?view=builder o ?mode=builder)
  const isStandaloneBuilder = typeof window !== 'undefined' && (() => {
    const params = new URLSearchParams(window.location.search);
    const v = (params.get('view') || params.get('mode') || '').toUpperCase();
    return v === 'BUILDER' || v === 'ARMAR' || window.location.pathname === '/builder';
  })();

  const [activeTab, setActiveTab] = useState<TabType>(() => {
    if (isStandaloneBuilder) return 'BUILDER';
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const v = (params.get('view') || params.get('mode') || '').toUpperCase();
      if (v === 'AUDIT') return 'AUDIT';
      if (v === 'INCIDENTS') return 'INCIDENTS';
      if (v === 'PLAYLIST') return 'PLAYLIST';
    }
    return 'BMS';
  });

  const [isLiveInputsModalOpen, setIsLiveInputsModalOpen] = useState(false);
  const [isDeckLinkModalOpen, setIsDeckLinkModalOpen] = useState(false);
  const [deckLinkInitialTab, setDeckLinkInitialTab] = useState<'OUTPUT' | 'INPUTS'>('OUTPUT');
  const [isNdiModalOpen, setIsNdiModalOpen] = useState(false);
  const [isGraphicsModalOpen, setIsGraphicsModalOpen] = useState(false);
  const [isEmergencyModalOpen, setIsEmergencyModalOpen] = useState(false);
  const [isNetworkModalOpen, setIsNetworkModalOpen] = useState(false);
  const [isAudioModalOpen, setIsAudioModalOpen] = useState(false);
  const [monitorMuted, setMonitorMuted] = useState(true);
  const [monitorVolume, setMonitorVolume] = useState(1.0);
  const [isAboutModalOpen, setIsAboutModalOpen] = useState(false);
  const [isExitModalOpen, setIsExitModalOpen] = useState(false);
  const [playlistRefreshKey, setPlaylistRefreshKey] = useState(0);
  const [globalError, setGlobalError] = useState<{ title: string; message: string } | null>(null);
  const [fallbackMetrics, setFallbackMetrics] = useState<SystemMetrics | null>(null);

  // Muestreo de respaldo para telemetria de hardware
  useEffect(() => {
    if (playoutState?.systemMetrics) return;
    const fetchMetrics = () => {
      fetch(resolveUrl('/api/system/metrics'))
        .then(res => res.json())
        .then(data => {
          if (data && data.cpu !== undefined) {
            setFallbackMetrics(data);
          }
        })
        .catch(() => { });
    };
    fetchMetrics();
    const timer = setInterval(fetchMetrics, 3000);
    return () => clearInterval(timer);
  }, [playoutState?.systemMetrics]);

  const metrics = playoutState?.systemMetrics || fallbackMetrics;

  // Manejo de errores globales
  useEffect(() => {
    const handleWindowError = (event: ErrorEvent) => {
      console.error('[Error Global no controlado]', event.error || event.message);
      setGlobalError({
        title: 'Error Inesperado en Interfaz',
        message: event.error?.message || event.message || 'Excepcion no controlada en ventana'
      });
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('[Rechazo de Promesa Global]', event.reason);
      const detail = event.reason instanceof Error ? event.reason.message : String(event.reason);
      setGlobalError({
        title: 'Fallo Asincrono no Controlado',
        message: detail || 'Promesa rechazada en la interfaz'
      });
    };

    window.addEventListener('error', handleWindowError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F9') {
        e.preventDefault();
        setIsGraphicsModalOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    const electron = (window as any).electronAPI;
    if (electron && typeof electron.onExitRequested === 'function') {
      electron.onExitRequested(() => {
        setIsExitModalOpen(true);
      });
    }

    return () => {
      window.removeEventListener('error', handleWindowError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handlePlaylistUpdated = () => {
    setPlaylistRefreshKey(k => k + 1);
  };

  // Si no hay usuario autenticado, renderizar LoginModal
  if (!user) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg-main, #0b1120)' }}>
        <LoginModal onLoginSuccess={(u) => setUser(u)} />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      {/* Animacion de sesion */}
      <SessionSplashLoader isSessionReady={Boolean(isConnected && playoutState)} />

      {/* Top Application Bar */}
      {isStandaloneBuilder ? (
        <header style={{
          padding: '8px 18px',
          background: 'var(--color-canvas-soft)',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: 'rgba(59, 130, 246, 0.12)',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-primary)'
            }}>
              <CalendarClock size={16} />
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-ink)' }}>
                Canal 11 • Armador de Playlist Remoto (LAN)
              </div>
              <div style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>
                Estacion de Planificacion • Grupo 12 SC
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              type="button"
              className="btn-tool"
              onClick={() => setIsPreferencesOpen(true)}
              style={{ fontSize: 11, padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 4 }}
            >
              <Sliders size={13} />
              <span>Apariencia</span>
            </button>
          </div>
        </header>
      ) : (
        <ErrorBoundary moduleName="Barra de Control Superior (IdeTopBar)">
          <IdeTopBar
            playoutState={playoutState}
            isConnected={isConnected}
            onNavigateTab={(tab: any) => {
              if (tab === 'DECKLINK') setIsDeckLinkModalOpen(true);
              else setActiveTab(tab);
            }}
            onOpenLiveSdiModal={() => setIsLiveInputsModalOpen(true)}
            onOpenLiveNdiModal={() => setIsLiveInputsModalOpen(true)}
            onOpenDeckLinkModal={(tab?: 'OUTPUT' | 'INPUTS') => {
              if (tab === 'INPUTS') {
                setIsLiveInputsModalOpen(true);
              } else {
                setDeckLinkInitialTab('OUTPUT');
                setIsDeckLinkModalOpen(true);
              }
            }}
            onOpenNdiModal={() => setIsNdiModalOpen(true)}
            onOpenAudioModal={() => setIsAudioModalOpen(true)}
            onOpenGraphicsModal={() => setIsGraphicsModalOpen(true)}
            onOpenEmergencyModal={() => setIsEmergencyModalOpen(true)}
            onOpenNetworkModal={() => setIsNetworkModalOpen(true)}
            onOpenAboutModal={() => setIsAboutModalOpen(true)}
            onOpenExitModal={() => setIsExitModalOpen(true)}
            onPlaylistUpdated={handlePlaylistUpdated}
            theme="dark"
            onToggleTheme={() => setIsPreferencesOpen(true)}
          />
        </ErrorBoundary>
      )}

      {/* Banner de error global */}
      {globalError && (
        <ErrorAlertBanner
          title={globalError.title}
          message={globalError.message}
          onDismiss={() => setGlobalError(null)}
        />
      )}

      {/* Selector de modo: BMS Grupo 12 SC o Master Playout */}
      <div style={{
        background: 'var(--color-canvas, #090d16)',
        borderBottom: '1px solid var(--color-hairline, #1e293b)',
        padding: '4px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={() => setActiveTab('BMS')}
            style={{
              background: activeTab === 'BMS' ? 'var(--primary, #2563eb)' : 'transparent',
              color: activeTab === 'BMS' ? '#ffffff' : 'var(--color-ink, #94a3b8)',
              border: activeTab === 'BMS' ? 'none' : '1px solid var(--color-hairline, #334155)',
              borderRadius: 6,
              padding: '5px 12px',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            <Layers size={14} />
            <span>Sistema BMS y Casos de Uso (Grupo 12 SC)</span>
          </button>

          <button
            onClick={() => setActiveTab('PLAYLIST')}
            style={{
              background: activeTab === 'PLAYLIST' ? 'var(--primary, #2563eb)' : 'transparent',
              color: activeTab === 'PLAYLIST' ? '#ffffff' : 'var(--color-ink, #94a3b8)',
              border: activeTab === 'PLAYLIST' ? 'none' : '1px solid var(--color-hairline, #334155)',
              borderRadius: 6,
              padding: '5px 12px',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            <Tv size={14} />
            <span>Master Playout & Rundown en Vivo</span>
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 11, color: 'var(--color-ink-soft, #94a3b8)' }}>
            Usuario: <strong style={{ color: 'var(--primary, #38bdf8)' }}>{user.nombre} ({user.rol_principal})</strong>
          </span>
          <button
            onClick={() => setIsPreferencesOpen(true)}
            style={{
              background: 'transparent',
              border: '1px solid var(--color-hairline, #334155)',
              borderRadius: 6,
              color: 'var(--color-ink, #e2e8f0)',
              padding: '4px 10px',
              fontSize: 11,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4
            }}
          >
            <Sliders size={12} />
            <span>Preferencias Visuales</span>
          </button>
        </div>
      </div>

      {/* Contenido Principal segun Tab */}
      {activeTab === 'BMS' ? (
        <div style={{ flex: 1, overflow: 'auto' }}>
          <RoleBasedPlayoutView onOpenPreferences={() => setIsPreferencesOpen(true)} />
        </div>
      ) : (
        <main className="master-layout" style={{ flex: 1, overflow: 'hidden' }}>
          {/* Left Column: Compact Master PGM Screen and Playout Controls */}
          <section
            className="left-control-panel"
            style={{
              display: activeTab === 'BUILDER' ? 'none' : 'flex',
              flexDirection: 'column'
            }}
          >
            <ErrorBoundary moduleName="Panel Maestro y Monitor PGM (MasterDeck)">
              <MasterDeck
                playoutState={playoutState}
                isMuted={monitorMuted}
                monitorVolume={monitorVolume}
                onToggleMonitorMute={() => setMonitorMuted(prev => !prev)}
                onMonitorVolumeChange={(v) => setMonitorVolume(v)}
                onOpenAudioModal={() => setIsAudioModalOpen(true)}
              />
            </ErrorBoundary>
          </section>

          {/* Right Column: Programación Vertical Playlist and Audit */}
          <section className="right-workspace" style={{ width: activeTab === 'BUILDER' ? '100%' : undefined }}>
            <nav className="workspace-tabs">
              {!isStandaloneBuilder && (
                <button
                  className={`tab-btn ${activeTab === 'PLAYLIST' ? 'active' : ''}`}
                  onClick={() => setActiveTab('PLAYLIST')}
                >
                  <ListVideo size={16} />
                  <span>Playlist</span>
                </button>
              )}
              <button
                className={`tab-btn ${activeTab === 'BUILDER' ? 'active' : ''}`}
                onClick={() => setActiveTab('BUILDER')}
              >
                <CalendarClock size={16} />
                <span>Armar Playlist</span>
              </button>
              {!isStandaloneBuilder && (
                <>
                  <button
                    className={`tab-btn ${activeTab === 'AUDIT' ? 'active' : ''}`}
                    onClick={() => setActiveTab('AUDIT')}
                  >
                    <FileSpreadsheet size={16} />
                    <span>Auditoría As-Run</span>
                  </button>
                  <button
                    className={`tab-btn ${activeTab === 'INCIDENTS' ? 'active' : ''}`}
                    onClick={() => setActiveTab('INCIDENTS')}
                  >
                    <AlertCircle size={16} />
                    <span>Incidentes de Continuidad</span>
                  </button>
                </>
              )}
            </nav>

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <div style={{ display: activeTab === 'PLAYLIST' ? 'flex' : 'none', flex: 1, flexDirection: 'column', overflow: 'hidden' }}>
                <ErrorBoundary moduleName="Lista de Programación Vertical (PlaylistTable)">
                  <PlaylistTable
                    currentIndex={playoutState?.currentIndex ?? -1}
                    playoutState={playoutState}
                    onOpenLiveSdiModal={() => setIsLiveInputsModalOpen(true)}
                    onOpenLiveNdiModal={() => setIsLiveInputsModalOpen(true)}
                    refreshTrigger={playlistRefreshKey}
                  />
                </ErrorBoundary>
              </div>
              {activeTab === 'BUILDER' && (
                <ErrorBoundary moduleName="Constructor & Planificador de Playlist (PlaylistBuilderView)">
                  <PlaylistBuilderView
                    onLoadToDeckSuccess={() => {
                      handlePlaylistUpdated();
                      if (!isStandaloneBuilder) {
                        setActiveTab('PLAYLIST');
                      }
                    }}
                    onNavigateToDeck={isStandaloneBuilder ? undefined : () => setActiveTab('PLAYLIST')}
                  />
                </ErrorBoundary>
              )}
              {activeTab === 'AUDIT' && (
                <ErrorBoundary moduleName="Auditoría Oficial As-Run (AuditView)">
                  <AuditView />
                </ErrorBoundary>
              )}
              {activeTab === 'INCIDENTS' && (
                <ErrorBoundary moduleName="Historial de Incidentes de Continuidad (IncidentsView)">
                  <IncidentsView />
                </ErrorBoundary>
              )}
            </div>
          </section>
        </main>
      )}

      {/* Configuración de Hardware Master Broadcast */}
      <ErrorBoundary moduleName="Configuración de Hardware de Salida Master">
        <OutputConfigModal
          isOpen={isDeckLinkModalOpen}
          onClose={() => setIsDeckLinkModalOpen(false)}
          status={playoutState?.decklink}
          channelState={playoutState?.state}
        />
      </ErrorBoundary>

      {/* Configuración de Red NDI 6 */}
      <ErrorBoundary moduleName="Configuración de Red NDI 6">
        <NdiModal
          isOpen={isNdiModalOpen}
          onClose={() => setIsNdiModalOpen(false)}
        />
      </ErrorBoundary>

      {/* Generador de Gráficos al Aire */}
      <ErrorBoundary moduleName="Generador de Gráficos al Aire (CG)">
        <GraphicsModal
          isOpen={isGraphicsModalOpen}
          onClose={() => setIsGraphicsModalOpen(false)}
          onUpdated={handlePlaylistUpdated}
        />
      </ErrorBoundary>

      {/* Configuración de Cortinilla de Respaldo */}
      <ErrorBoundary moduleName="Configuración de Cortinilla de Respaldo">
        <EmergencyModal
          isOpen={isEmergencyModalOpen}
          onClose={() => setIsEmergencyModalOpen(false)}
          channelState={playoutState?.state}
        />
      </ErrorBoundary>

      {/* Información de Red y Acceso LAN */}
      <ErrorBoundary moduleName="Información de Red y Acceso Remoto">
        <NetworkModal
          isOpen={isNetworkModalOpen}
          onClose={() => setIsNetworkModalOpen(false)}
        />
      </ErrorBoundary>

      {/* Acerca de */}
      <ErrorBoundary moduleName="Ventana Informativa Acerca de">
        <AboutModal
          isOpen={isAboutModalOpen}
          onClose={() => setIsAboutModalOpen(false)}
        />
      </ErrorBoundary>

      {/* Salida Master y Calibración EBU R128 */}
      <ErrorBoundary moduleName="Procesador y Mezclador de Audio Master">
        <MasterAudioModal
          isOpen={isAudioModalOpen}
          onClose={() => setIsAudioModalOpen(false)}
        />
      </ErrorBoundary>

      {/* Diálogo de Confirmación de Salida */}
      <ExitConfirmModal
        isOpen={isExitModalOpen}
        channelState={playoutState?.state}
        onCancel={() => setIsExitModalOpen(false)}
        onConfirmExit={() => {
          setIsExitModalOpen(false);
          const electron = (window as any).electronAPI;
          if (electron && typeof electron.forceClose === 'function') {
            electron.forceClose();
          } else {
            window.close();
          }
        }}
      />

      {/* Modal de Preferencias Visuales Heredado */}
      <PreferencesModal
        isOpen={isPreferencesOpen}
        onClose={() => setIsPreferencesOpen(false)}
      />

      {/* Minimal Footer */}
      <footer className="master-footer">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid var(--color-hairline)',
            borderRadius: 4,
            padding: '2px 8px'
          }}>
            <Clock size={12} color="var(--color-primary)" />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5, fontWeight: 700, color: 'var(--color-ink)', letterSpacing: '0.5px' }}>
              {boliviaTime}
            </span>
            <span style={{ fontSize: 9.5, fontWeight: 600, color: 'var(--color-text-muted)' }}>UTC-4</span>
          </div>
          <span style={{ color: 'var(--color-text-muted)', fontSize: 11 }}>Canal 11 • Grupo 12 SC</span>
          <span style={{ color: 'var(--color-hairline)' }}>•</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, opacity: 0.85 }}>Servidor: {window.location.origin}</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {metrics && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 10.5, fontFamily: 'var(--font-mono)' }}>
              {/* CPU Metric */}
              <div
                title="Uso de Procesador Central (CPU)"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '2px 7px',
                  borderRadius: 4,
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid var(--color-hairline)',
                  cursor: 'default'
                }}
              >
                <Cpu size={12} color={metrics.cpu > 85 ? '#ff453a' : metrics.cpu > 65 ? '#ff9f0a' : 'var(--color-text-muted)'} />
                <span style={{ color: metrics.cpu > 85 ? '#ff453a' : metrics.cpu > 65 ? '#ff9f0a' : 'inherit', fontWeight: 500 }}>
                  CPU {metrics.cpu}%
                </span>
              </div>

              {/* RAM Metric */}
              <div
                title={`Memoria RAM: ${metrics.ram.usedGb} GB / ${metrics.ram.totalGb} GB (${metrics.ram.percent}%)`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '2px 7px',
                  borderRadius: 4,
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid var(--color-hairline)',
                  cursor: 'default'
                }}
              >
                <Layers size={12} color={metrics.ram.percent > 88 ? '#ff453a' : metrics.ram.percent > 75 ? '#ff9f0a' : 'var(--color-text-muted)'} />
                <span style={{ color: metrics.ram.percent > 88 ? '#ff453a' : metrics.ram.percent > 75 ? '#ff9f0a' : 'inherit', fontWeight: 500 }}>
                  RAM {metrics.ram.usedGb}/{metrics.ram.totalGb} GB ({metrics.ram.percent}%)
                </span>
              </div>

              {/* GPU Metric */}
              <div
                title={`GPU: ${metrics.gpu.name || 'Aceleración de Video'} (${metrics.gpu.percent}%)`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '2px 7px',
                  borderRadius: 4,
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid var(--color-hairline)',
                  cursor: 'default'
                }}
              >
                <Gauge size={12} color={metrics.gpu.percent > 85 ? '#ff453a' : metrics.gpu.percent > 60 ? '#ff9f0a' : 'var(--color-text-muted)'} />
                <span style={{ color: metrics.gpu.percent > 85 ? '#ff453a' : metrics.gpu.percent > 60 ? '#ff9f0a' : 'inherit', fontWeight: 500 }}>
                  GPU {metrics.gpu.percent}%
                </span>
              </div>

              <span style={{ color: 'var(--color-hairline)' }}>•</span>
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>Estado: <strong style={{ color: 'var(--color-ink)' }}>{playoutState?.state || 'IDLE'}</strong></span>
            <span style={{ color: 'var(--color-hairline)' }}>•</span>
            <span>
              Output: <strong style={{ color: playoutState?.decklink?.hardwarePresent ? '#30d158' : playoutState?.outputs?.ndi?.stream?.isBroadcasting ? '#0a84ff' : 'var(--color-warning)' }}>
                {playoutState?.decklink?.hardwarePresent
                  ? (playoutState?.decklink?.deviceName || 'Blackmagic DeckLink (Activo)')
                  : playoutState?.outputs?.ndi?.stream?.isBroadcasting
                    ? `NDI Network (${playoutState?.outputs?.ndi?.stream?.streamName || 'Master'})`
                    : 'Sin hardware conectado (Standby)'}
              </strong>
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
};
