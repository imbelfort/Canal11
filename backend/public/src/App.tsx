import React, { useState, useEffect } from 'react';
import { api } from './services/api';
import { usePlayoutSocket } from './hooks/usePlayoutSocket';
import { IdeTopBar } from './components/IdeTopBar';
import { MasterDeck } from './components/MasterDeck';
import { PlaylistTable } from './components/Playlist/PlaylistTable';
import { OutputConfigModal, InputConfigModal } from './components/Hardware';
import { NdiModal } from './components/Ndi/NdiModal';
import { GraphicsModal } from './components/Graphics/GraphicsModal';
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
import { ListVideo, FileSpreadsheet, AlertCircle, CalendarClock, Cpu, Layers, Gauge, Clock } from 'lucide-react';
import { SystemMetrics } from './types/playout';
import { resolveUrl } from './services/api/client';

type TabType = 'PLAYLIST' | 'BUILDER' | 'AUDIT' | 'INCIDENTS';

export const App: React.FC = () => {
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


  // Detección de vista inicial por parámetro URL (ej. ?view=builder o ?mode=builder desde otra PC)
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
    }
    return 'PLAYLIST';
  });
  const [isLiveInputsModalOpen, setIsLiveInputsModalOpen] = useState(false);
  const [isDeckLinkModalOpen, setIsDeckLinkModalOpen] = useState(false);
  const [deckLinkInitialTab, setDeckLinkInitialTab] = useState<'OUTPUT' | 'INPUTS'>('OUTPUT');
  const [isNdiModalOpen, setIsNdiModalOpen] = useState(false);
  const [isGraphicsModalOpen, setIsGraphicsModalOpen] = useState(false);
  const [isNetworkModalOpen, setIsNetworkModalOpen] = useState(false);
  const [isAudioModalOpen, setIsAudioModalOpen] = useState(false);
  const [monitorMuted, setMonitorMuted] = useState(true);
  const [monitorVolume, setMonitorVolume] = useState(1.0);
  const [isAboutModalOpen, setIsAboutModalOpen] = useState(false);
  const [isExitModalOpen, setIsExitModalOpen] = useState(false);
  const [playlistRefreshKey, setPlaylistRefreshKey] = useState(0);
  const [globalError, setGlobalError] = useState<{ title: string; message: string } | null>(null);
  const [fallbackMetrics, setFallbackMetrics] = useState<SystemMetrics | null>(null);

  // Muestreo de respaldo para telemetría de hardware si aún no ha llegado el socket
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

  // Soporte Modular para Modo Oscuro y Claro (Google Material Design 3.0)
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('ibcast_theme') as 'dark' | 'light') || 'light';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('ibcast_theme', theme);
    if ((window as any).electronAPI?.setTheme) {
      (window as any).electronAPI.setTheme(theme);
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  // Captura global de excepciones no controladas en tiempo de ejecución (Anti-Monolito)
  // Garantiza que un error inesperado jamás cierre la interfaz ni interrumpa la emisión.
  useEffect(() => {
    const handleWindowError = (event: ErrorEvent) => {
      console.error('[Error Global no controlado]', event.error || event.message);
      setGlobalError({
        title: 'Error Inesperado en Interfaz',
        message: event.error?.message || event.message || 'Excepción no controlada en ventana'
      });
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('[Rechazo de Promesa Global]', event.reason);
      const detail = event.reason instanceof Error ? event.reason.message : String(event.reason);
      setGlobalError({
        title: 'Fallo Asíncrono no Controlado',
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      {/* Animación fluida de inicio y recuperación de sesión 24/7 */}
      <SessionSplashLoader isSessionReady={Boolean(isConnected && playoutState)} />

      {/* Top Application Bar matching VS Code / Antigravity IDE (O cabecera dedicada en Armador Remoto) */}
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
                IB-Cast • Armador de Playlist Remoto (LAN)
              </div>
              <div style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>
                Estación de Planificación de Emisión • Controles Master Protegidos
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              fontSize: 10.5,
              fontWeight: 600,
              padding: '3px 10px',
              borderRadius: 4,
              background: isConnected ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
              color: isConnected ? '#15803d' : '#ef4444',
              border: isConnected ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)',
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}>
              <span className="tally-dot" style={{ width: 6, height: 6, background: isConnected ? '#22c55e' : '#ef4444' }} />
              <span>{isConnected ? 'Servidor Master Online' : 'Desconectado del Master'}</span>
            </span>

            <button
              type="button"
              className="btn-tool"
              onClick={() => setIsNetworkModalOpen(true)}
              title="Información de red y acceso remoto"
              style={{ fontSize: 11, padding: '4px 10px' }}
            >
              Info Red
            </button>

            <button
              type="button"
              className="btn-tool"
              onClick={toggleTheme}
              title="Cambiar tema claro / oscuro"
              style={{ fontSize: 11, padding: '4px 10px' }}
            >
              {theme === 'dark' ? 'Modo Claro' : 'Modo Oscuro'}
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
            onOpenNetworkModal={() => setIsNetworkModalOpen(true)}
            onOpenAboutModal={() => setIsAboutModalOpen(true)}
            onOpenExitModal={() => setIsExitModalOpen(true)}
            onPlaylistUpdated={handlePlaylistUpdated}
            theme={theme}
            onToggleTheme={toggleTheme}
          />
        </ErrorBoundary>
      )}

      {/* Banner de error global explícito si ocurre un fallo no capturado */}
      {globalError && (
        <ErrorAlertBanner
          title={globalError.title}
          message={globalError.message}
          onDismiss={() => setGlobalError(null)}
        />
      )}

      <main className="master-layout">
        {/* Left Column: Compact Master PGM Screen and Playout Controls (Mantenido siempre montado para emisión ininterrumpida) */}
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

      {/* Configuración de Hardware Master Broadcast (Salida PGM SDI / HAL) */}
      <ErrorBoundary moduleName="Configuración de Hardware de Salida Master">
        <OutputConfigModal
          isOpen={isDeckLinkModalOpen}
          onClose={() => setIsDeckLinkModalOpen(false)}
          status={playoutState?.decklink}
          channelState={playoutState?.state}
        />
      </ErrorBoundary>

      {/* Configuración de Red NDI 6 (IP Broadcast & Fuentes LAN) */}
      <ErrorBoundary moduleName="Configuración de Red NDI 6">
        <NdiModal
          isOpen={isNdiModalOpen}
          onClose={() => setIsNdiModalOpen(false)}
        />
      </ErrorBoundary>

      {/* Generador de Gráficos al Aire (GraphicsEngine / CG) */}
      <ErrorBoundary moduleName="Generador de Gráficos al Aire (CG)">
        <GraphicsModal
          isOpen={isGraphicsModalOpen}
          onClose={() => setIsGraphicsModalOpen(false)}
          onUpdated={handlePlaylistUpdated}
        />
      </ErrorBoundary>


      {/* Configuración de Armado en Red & Conexión Multi-Estación */}
      <ErrorBoundary moduleName="Armado en Red & Multi-Estación">
        <NetworkModal
          isOpen={isNetworkModalOpen}
          onClose={() => setIsNetworkModalOpen(false)}
        />
      </ErrorBoundary>

      {/* Configuración de Entradas de Captura en Vivo (SDI / NDI) */}
      <ErrorBoundary moduleName="Configuración de Entradas de Captura en Vivo">
        <InputConfigModal
          isOpen={isLiveInputsModalOpen}
          onClose={() => setIsLiveInputsModalOpen(false)}
          onSuccess={handlePlaylistUpdated}
        />
      </ErrorBoundary>

      {/* Ventana Acerca de... (Estilo Antigravity / VS Code) */}
      <ErrorBoundary moduleName="Información del Sistema (Acerca de...)">
        <AboutModal
          isOpen={isAboutModalOpen}
          onClose={() => setIsAboutModalOpen(false)}
        />
      </ErrorBoundary>

      {/* Modal Dedicado de Procesamiento Master de Audio de Salida y Vúmetro */}
      <ErrorBoundary moduleName="Procesador Master de Audio">
        <MasterAudioModal
          isOpen={isAudioModalOpen}
          onClose={() => setIsAudioModalOpen(false)}
          playoutState={playoutState}
          monitorMuted={monitorMuted}
          monitorVolume={monitorVolume}
          onToggleMonitorMute={() => setMonitorMuted(prev => !prev)}
          onMonitorVolumeChange={(v) => setMonitorVolume(v)}
        />
      </ErrorBoundary>

      {/* Modal de Confirmación de Salida 24/7 (2 Opciones con Estética Broadcast) */}
      <ErrorBoundary moduleName="Protección de Salida 24/7">
        <ExitConfirmModal
          isOpen={isExitModalOpen}
          onClose={() => setIsExitModalOpen(false)}
        />
      </ErrorBoundary>

      {/* Minimal Footer con Telemetría Sutil de Hardware (CPU, RAM, GPU) */}
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
          <span style={{ color: 'var(--color-text-muted)', fontSize: 11 }}>Hora Local Estación</span>
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
