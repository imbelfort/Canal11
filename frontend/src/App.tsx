import React, { useState, useEffect } from 'react';
import { api } from './services/api';
import { usePlayoutSocket } from './hooks/usePlayoutSocket';
import { UnifiedTopBar } from './components/UnifiedTopBar';
import { MasterDeck } from './components/MasterDeck';
import { PlaylistTable } from './components/Playlist/PlaylistTable';
import { AuditView } from './components/Audit/AuditView';
import { PlaylistBuilderView } from './components/Playlist/PlaylistBuilderView';
import { ErrorBoundary } from './components/Common/ErrorBoundary';
import { ErrorAlertBanner } from './components/Common/ErrorAlertBanner';
import { ListVideo, FileSpreadsheet, CalendarClock, Cpu, Layers, Gauge, Clock } from 'lucide-react';
import { SystemMetrics } from './types/playout';
import { resolveUrl } from './services/api/client';

import { LoginModal } from './components/LoginModal';
import { PreferencesModal } from './components/PreferencesModal';
import { RoleBasedPlayoutView } from './components/RoleBasedPlayoutView';
import { usePreferences } from './context/PreferencesContext';

type TabType = 'PLAYLIST' | 'BUILDER' | 'AUDIT';

export const App: React.FC = () => {
  const { user, setUser } = usePreferences();
  const [isPreferencesOpen, setIsPreferencesOpen] = useState(false);

  // Selector unificado superior: BMS vs Master Playout
  const [mainTab, setMainTab] = useState<'BMS' | 'PLAYLIST'>('BMS');
  const [subTab, setSubTab] = useState<TabType>('PLAYLIST');

  const { playoutState } = usePlayoutSocket();

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

  const [monitorMuted, setMonitorMuted] = useState(true);
  const [monitorVolume, setMonitorVolume] = useState(1.0);
  const [playlistRefreshKey, setPlaylistRefreshKey] = useState(0);
  const [globalError, setGlobalError] = useState<{ title: string; message: string } | null>(null);
  const [fallbackMetrics, setFallbackMetrics] = useState<SystemMetrics | null>(null);

  // Muestreo de respaldo para telemetria
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
      {/* TOPBAR UNIFICADA (TOTALMENTE WEB Y ADAPTADA A ROLES) */}
      <UnifiedTopBar
        playoutState={playoutState}
        activeMainTab={mainTab}
        onSelectMainTab={(t) => setMainTab(t)}
        onOpenPreferences={() => setIsPreferencesOpen(true)}
        onPlaylistUpdated={handlePlaylistUpdated}
        onNavigateTab={(t) => setSubTab(t)}
      />

      {/* Banner de error global explícito si ocurre un fallo */}
      {globalError && (
        <ErrorAlertBanner
          title={globalError.title}
          message={globalError.message}
          onDismiss={() => setGlobalError(null)}
        />
      )}

      {/* CONTENIDO PRINCIPAL: BMS O CONSOLA DE PLAYOUT */}
      {mainTab === 'BMS' ? (
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <RoleBasedPlayoutView onOpenPreferences={() => setIsPreferencesOpen(true)} />
        </div>
      ) : (
        <main className="master-layout" style={{ flex: 1, overflow: 'hidden' }}>
          {/* Columna Izquierda: Monitor PGM y Mandos de Playout en Vivo */}
          <section
            className="left-control-panel"
            style={{
              display: subTab === 'BUILDER' ? 'none' : 'flex',
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
              />
            </ErrorBoundary>
          </section>

          {/* Columna Derecha: Programación Vertical Playlist y Auditoría */}
          <section className="right-workspace" style={{ width: subTab === 'BUILDER' ? '100%' : undefined }}>
            <nav className="workspace-tabs">
              <button
                className={`tab-btn ${subTab === 'PLAYLIST' ? 'active' : ''}`}
                onClick={() => setSubTab('PLAYLIST')}
              >
                <ListVideo size={16} />
                <span>Playlist Activa</span>
              </button>
              <button
                className={`tab-btn ${subTab === 'BUILDER' ? 'active' : ''}`}
                onClick={() => setSubTab('BUILDER')}
              >
                <CalendarClock size={16} />
                <span>Armar Playlist</span>
              </button>
              <button
                className={`tab-btn ${subTab === 'AUDIT' ? 'active' : ''}`}
                onClick={() => setSubTab('AUDIT')}
              >
                <FileSpreadsheet size={16} />
                <span>As-Run Log (Auditoría)</span>
              </button>
            </nav>

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <div style={{ display: subTab === 'PLAYLIST' ? 'flex' : 'none', flex: 1, flexDirection: 'column', overflow: 'hidden' }}>
                <ErrorBoundary moduleName="Lista de Programación Vertical (PlaylistTable)">
                  <PlaylistTable
                    currentIndex={playoutState?.currentIndex ?? -1}
                    playoutState={playoutState}
                    refreshTrigger={playlistRefreshKey}
                  />
                </ErrorBoundary>
              </div>
              {subTab === 'BUILDER' && (
                <ErrorBoundary moduleName="Constructor de Playlist (PlaylistBuilderView)">
                  <PlaylistBuilderView
                    onLoadToDeckSuccess={() => {
                      handlePlaylistUpdated();
                      setSubTab('PLAYLIST');
                    }}
                    onNavigateToDeck={() => setSubTab('PLAYLIST')}
                  />
                </ErrorBoundary>
              )}
              {subTab === 'AUDIT' && (
                <ErrorBoundary moduleName="Auditoría Oficial As-Run (AuditView)">
                  <AuditView />
                </ErrorBoundary>
              )}
            </div>
          </section>
        </main>
      )}

      {/* Modal de Preferencias Visuales Heredado */}
      <PreferencesModal
        isOpen={isPreferencesOpen}
        onClose={() => setIsPreferencesOpen(false)}
      />

      {/* Footer Minimalista de Telemetría */}
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

              <div
                title={`GPU: ${metrics.gpu.name || 'Aceleración Web'} (${metrics.gpu.percent}%)`}
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
              Salida: <strong style={{ color: '#30d158' }}>Web HTML5 Video Player (Full HD)</strong>
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
};
