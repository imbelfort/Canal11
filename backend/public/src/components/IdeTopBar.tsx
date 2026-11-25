import React, { useState, useRef, useEffect } from 'react';
import { api } from '../services/api';
import { PlayoutBroadcastState } from '../types/playout';
import { Settings, Tv, Minus, Square, X, PlaySquare, Sun, Moon, Sparkles, Sliders } from 'lucide-react';

interface IdeTopBarProps {
  playoutState: PlayoutBroadcastState | null;
  isConnected: boolean;
  onNavigateTab: (tab: 'PLAYLIST' | 'BUILDER' | 'AUDIT' | 'DECKLINK' | 'INCIDENTS') => void;
  onOpenLiveModal?: () => void;
  onOpenLiveSdiModal?: () => void;
  onOpenLiveNdiModal?: () => void;
  onOpenDeckLinkModal: (tab?: 'OUTPUT' | 'INPUTS') => void;
  onOpenNdiModal?: () => void;
  onOpenAudioModal?: () => void;
  onOpenGraphicsModal?: () => void;
  onOpenNetworkModal?: () => void;
  onOpenAboutModal?: () => void;
  onPlaylistUpdated: () => void;
  onOpenExitModal?: () => void;
  theme?: 'dark' | 'light';
  onToggleTheme?: () => void;
}

export const IdeTopBar: React.FC<IdeTopBarProps> = ({
  playoutState,
  isConnected,
  onNavigateTab,
  onOpenLiveModal,
  onOpenLiveSdiModal,
  onOpenLiveNdiModal,
  onOpenDeckLinkModal,
  onOpenNdiModal,
  onOpenAudioModal,
  onOpenGraphicsModal,
  onOpenNetworkModal,
  onOpenAboutModal,
  onOpenExitModal,
  onPlaylistUpdated,
  theme = 'dark',
  onToggleTheme
}) => {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const xmlFileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const handleClickOutside = () => setOpenMenu(null);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  const state = playoutState?.state || 'IDLE';
  const isOnAir = state === 'PLAYING' || state === 'LIVE_SDI' || state === 'EMERGENCY_FALLBACK';
  const isPaused = state === 'PAUSED';

  const handleOpenXmlFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const content = evt.target?.result as string;
      if (content) {
        try {
          const isXml = file.name.endsWith('.xml') || content.trim().startsWith('<');
          await api.importPlaylist(content, isXml ? 'xml' : 'json');
          onPlaylistUpdated();
          onNavigateTab('PLAYLIST');
        } catch (err: any) {
          alert(`Error al importar archivo de programación: ${err.message || err}`);
        }
      }
    };
    reader.readAsText(file);
    if (xmlFileInputRef.current) xmlFileInputRef.current.value = '';
  };

  const handleExportXml = () => {
    window.open(api.getExportXmlUrl(), '_blank');
  };

  const handleExportM3u = () => {
    window.open(api.getExportM3uUrl(), '_blank');
  };

  const handleExportAuditCsv = () => {
    window.open(api.getExportCsvUrl(), '_blank');
  };

  const handleAddVideos = async () => {
    try {
      if ((window as any).electronAPI?.openVideoDialog) {
        const paths: string[] = await (window as any).electronAPI.openVideoDialog();
        if (!paths || paths.length === 0) return;
        const toAdd = await Promise.all(
          paths.map(async (fp) => {
            const filename = fp.split(/[\\/]/).pop() || fp;
            const title = filename.replace(/\.[^/.]+$/, '');
            let durationMs = 30000;
            try {
              const probeData = await api.probeMedia(fp);
              if (probeData?.durationMs) durationMs = probeData.durationMs;
            } catch {}
            return {
              title,
              file_path: fp,
              event_type: 'VIDEO' as const,
              duration_ms: durationMs,
              timing_mode: 'AUTO_FOLLOW' as const
            };
          })
        );
        await api.addItems(toAdd);
        onPlaylistUpdated();
      } else {
        fileInputRef.current?.click();
      }
    } catch (err: any) {
      alert(`Error al agregar videos a la programación: ${err.message || err}`);
    }
  };

  return (
    <header className="ide-titlebar" onClick={(e) => e.stopPropagation()}>
      {/* Left: App Icon & Menus */}
      <div className="ide-titlebar-left">
        <div className="ide-app-logo" title="IB-Cast Playout Master - Clic para Acerca de..." onClick={() => onOpenAboutModal?.()} style={{ cursor: 'pointer' }}>
          <PlaySquare size={18} color="var(--apple-cyan)" />
        </div>

        {/* ARCHIVO */}
        <div className="ide-menu-dropdown">
          <button
            className={`ide-menu-btn ${openMenu === 'archivo' ? 'active' : ''}`}
            onClick={() => setOpenMenu(openMenu === 'archivo' ? null : 'archivo')}
          >
            Archivo
          </button>
          {openMenu === 'archivo' && (
            <div className="ide-dropdown-menu">
              <div className="ide-menu-item" onClick={() => { api.clearPlaylist(); onPlaylistUpdated(); setOpenMenu(null); }}>
                <span>Nueva Lista</span>
                <span className="ide-shortcut">Ctrl+N</span>
              </div>
              <div className="ide-menu-item" onClick={() => { xmlFileInputRef.current?.click(); setOpenMenu(null); }}>
                <span>Cargar Playlist (XML)...</span>
                <span className="ide-shortcut">Ctrl+O</span>
              </div>
              <div className="ide-menu-divider" />
              <div className="ide-menu-item" onClick={() => { handleExportXml(); setOpenMenu(null); }}>
                <span>Guardar Playlist (XML)...</span>
                <span className="ide-shortcut">Ctrl+S</span>
              </div>

              <div className="ide-menu-divider" />
              <div className="ide-menu-item" onClick={() => { handleExportAuditCsv(); setOpenMenu(null); }}>
                <span>Exportar Auditoría (CSV)...</span>
              </div>
              <div className="ide-menu-divider" />
              <div className="ide-menu-item" onClick={() => {
                const electron = (window as any).electronAPI;
                if (electron && typeof electron.close === 'function') {
                  electron.close();
                } else if (onOpenExitModal) {
                  onOpenExitModal();
                }
                setOpenMenu(null);
              }}>
                <span>Salir</span>
                <span className="ide-shortcut">Alt+F4</span>
              </div>
            </div>
          )}
        </div>

        {/* EDICIÓN */}
        <div className="ide-menu-dropdown">
          <button
            className={`ide-menu-btn ${openMenu === 'editar' ? 'active' : ''}`}
            onClick={() => setOpenMenu(openMenu === 'editar' ? null : 'editar')}
          >
            Edición
          </button>
          {openMenu === 'editar' && (
            <div className="ide-dropdown-menu">
              <div className="ide-menu-item" onClick={() => { handleAddVideos(); setOpenMenu(null); }}>
                <span>Agregar Videos...</span>
              </div>
              <div className="ide-menu-item" onClick={() => { (onOpenLiveSdiModal || onOpenLiveModal)?.(); setOpenMenu(null); }}>
                <span>Insertar Vivo SDI...</span>
              </div>
              <div className="ide-menu-item" onClick={() => { onOpenLiveNdiModal?.(); setOpenMenu(null); }}>
                <span>Insertar Vivo NDI...</span>
              </div>
              <div className="ide-menu-divider" />
              <div className="ide-menu-item" onClick={() => { api.clearPlaylist(); onPlaylistUpdated(); setOpenMenu(null); }}>
                <span>Vaciar Lista</span>
              </div>
            </div>
          )}
        </div>

        {/* EMISIÓN */}
        <div className="ide-menu-dropdown">
          <button
            className={`ide-menu-btn ${openMenu === 'emision' ? 'active' : ''}`}
            onClick={() => setOpenMenu(openMenu === 'emision' ? null : 'emision')}
          >
            Emisión
          </button>
          {openMenu === 'emision' && (
            <div className="ide-dropdown-menu">
              <div className="ide-menu-item" onClick={() => { api.play(); setOpenMenu(null); }}>
                <span>Iniciar (Play)</span>
                <span className="ide-shortcut">Espacio</span>
              </div>
              <div className="ide-menu-item" onClick={() => { api.pause(); setOpenMenu(null); }}>
                <span>Pausar (Freeze)</span>
              </div>
              <div className="ide-menu-item" onClick={() => { api.next(); setOpenMenu(null); }}>
                <span>Siguiente (Next)</span>
                <span className="ide-shortcut">F10</span>
              </div>
              <div className="ide-menu-item" onClick={() => { api.stop(); setOpenMenu(null); }}>
                <span>Detener (Stop)</span>
              </div>
              <div className="ide-menu-divider" />
              <div className="ide-menu-item" onClick={() => { api.takeLive(); setOpenMenu(null); }}>
                <span>Conmutar a Vivo SDI</span>
                <span className="ide-shortcut">F8</span>
              </div>
              <div className="ide-menu-item" onClick={() => { api.triggerEmergency('Menú Emisión'); setOpenMenu(null); }}>
                <span style={{ color: 'var(--apple-red)' }}>Cortinilla de Emergencia</span>
                <span className="ide-shortcut">F12</span>
              </div>
            </div>
          )}
        </div>

        {/* CONFIGURACIÓN */}
        <div className="ide-menu-dropdown">
          <button
            className={`ide-menu-btn ${openMenu === 'configuracion' ? 'active' : ''}`}
            onClick={() => setOpenMenu(openMenu === 'configuracion' ? null : 'configuracion')}
          >
            Configuración
          </button>
          {openMenu === 'configuracion' && (
            <div className="ide-dropdown-menu">
              <div className="ide-menu-item" onClick={() => { onOpenAudioModal?.(); setOpenMenu(null); }}>
                <span>Audio Master y Volumen PGM...</span>
              </div>
              <div className="ide-menu-divider" />
              <div className="ide-menu-item" onClick={() => { onOpenDeckLinkModal?.('OUTPUT'); setOpenMenu(null); }}>
                <span>Salida Master (SDI / NDI)...</span>
              </div>
              <div className="ide-menu-item" onClick={() => { (onOpenLiveSdiModal || onOpenLiveModal)?.(); setOpenMenu(null); }}>
                <span>Entradas SDI Físicas (En Vivo)...</span>
              </div>
              <div className="ide-menu-item" onClick={() => { onOpenNdiModal?.(); setOpenMenu(null); }}>
                <span>Fuentes NDI...</span>
              </div>
              <div className="ide-menu-item" onClick={() => { onOpenGraphicsModal?.(); setOpenMenu(null); }}>
                <span>Gráficos al Aire (CG)...</span>
                <span className="ide-shortcut">F9</span>
              </div>
              <div className="ide-menu-divider" />
              <div className="ide-menu-item" onClick={() => { onOpenNetworkModal?.(); setOpenMenu(null); }}>
                <span>Acceso Red Local (LAN)...</span>
              </div>
            </div>
          )}
        </div>

        {/* VER */}
        <div className="ide-menu-dropdown">
          <button
            className={`ide-menu-btn ${openMenu === 'ver' ? 'active' : ''}`}
            onClick={() => setOpenMenu(openMenu === 'ver' ? null : 'ver')}
          >
            Ver
          </button>
          {openMenu === 'ver' && (
            <div className="ide-dropdown-menu">
              <div className="ide-menu-item" onClick={() => { onNavigateTab('PLAYLIST'); setOpenMenu(null); }}>
                <span>Playlist Deck</span>
              </div>
              <div className="ide-menu-item" onClick={() => { onNavigateTab('BUILDER'); setOpenMenu(null); }}>
                <span>Armar Playlist</span>
              </div>
              <div className="ide-menu-item" onClick={() => { onOpenGraphicsModal?.(); setOpenMenu(null); }}>
                <span>Gráficos (CG)...</span>
                <span className="ide-shortcut">F9</span>
              </div>
              <div className="ide-menu-item" onClick={() => { onNavigateTab('AUDIT'); setOpenMenu(null); }}>
                <span>Auditoría As-Run</span>
              </div>
              <div className="ide-menu-item" onClick={() => { onNavigateTab('INCIDENTS'); setOpenMenu(null); }}>
                <span>Incidentes</span>
              </div>
            </div>
          )}
        </div>

        {/* AYUDA */}
        <div className="ide-menu-dropdown">
          <button
            className={`ide-menu-btn ${openMenu === 'ayuda' ? 'active' : ''}`}
            onClick={() => setOpenMenu(openMenu === 'ayuda' ? null : 'ayuda')}
          >
            Ayuda
          </button>
          {openMenu === 'ayuda' && (
            <div className="ide-dropdown-menu">
              <div className="ide-menu-item" onClick={() => { onOpenAboutModal?.(); setOpenMenu(null); }}>
                <span>Acerca de IB-Cast...</span>
              </div>
            </div>
          )}
        </div>

        {/* Hidden inputs */}
        <input
          ref={xmlFileInputRef}
          type="file"
          accept=".xml,.json"
          style={{ display: 'none' }}
          onChange={handleOpenXmlFile}
        />
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".mp4,.mov,.mkv,.ts,.mxf,.avi,.webm,video/mp4,video/quicktime,video/x-matroska,video/mp2t"
          style={{ display: 'none' }}
          onChange={async (e) => {
            const files = Array.from(e.target.files || []);
            if (files.length === 0) return;
            const toAdd = files.map(f => ({
              title: f.name.replace(/\.[^/.]+$/, ''),
              file_path: (f as any).path || f.name,
              event_type: 'VIDEO' as const,
              duration_ms: 30000,
              timing_mode: 'AUTO_FOLLOW' as const
            }));
            await api.addItems(toAdd);
            onPlaylistUpdated();
            if (fileInputRef.current) fileInputRef.current.value = '';
          }}
        />
      </div>

      {/* Center: Document Title */}
      <div className="ide-titlebar-center">
        <span style={{ fontWeight: 500, letterSpacing: '0.3px', color: 'var(--text-primary)' }}>IB-Cast Playout</span>
      </div>

      {/* Right: Quick actions, Tally & Controls */}
      <div className="ide-titlebar-right">
        {isOnAir && (
          <div className="tally-on-air-pill" title="Emisión activa hacia salida Master (DeckLink / NDI)">
            <span className="tally-dot blinking" />
            <span>ON AIR</span>
          </div>
        )}
        {isPaused && (
          <div className="tally-paused-pill" title="Emisión en pausa">
            <span className="tally-dot paused" />
            <span>PAUSA</span>
          </div>
        )}

        {onToggleTheme && (
          <button
            className="theme-toggle-btn"
            onClick={onToggleTheme}
            title={theme === 'dark' ? 'Cambiar a Modo Claro' : 'Cambiar a Modo Oscuro'}
          >
            {theme === 'dark' ? <Sun size={13} /> : <Moon size={13} />}
            <span>{theme === 'dark' ? 'Modo Claro' : 'Modo Oscuro'}</span>
          </button>
        )}
        <button
          className="m3-btn-tonal"
          onClick={() => onOpenGraphicsModal?.()}
          title="Generador de Gráficos al Aire (CG / Logo / Reloj / Clima) [F9]"
          style={{
            height: 28,
            padding: '0 8px',
            fontSize: 11,
            fontWeight: 500,
            gap: 5,
            borderRadius: 6,
            border: '1px solid var(--color-hairline)',
            background: 'var(--color-accent-subtle)',
            color: 'var(--color-primary)'
          }}
        >
          <Sparkles size={13} color="var(--color-primary)" />
          <span>CG</span>
          <span style={{
            fontSize: 9,
            padding: '1px 4px',
            borderRadius: 4,
            background: 'var(--color-canvas)',
            border: '1px solid var(--color-hairline)',
            color: 'var(--color-ink)',
            fontFamily: 'var(--font-family-mono)'
          }}>F9</span>
        </button>
        <button
          className="ide-icon-btn"
          onClick={() => onOpenAudioModal?.()}
          title="Procesador y Control de Audio Master (Volumen PGM y Calibración EBU R128)"
        >
          <Sliders size={15} />
        </button>
        <button
          className="ide-icon-btn"
          onClick={() => onOpenDeckLinkModal?.()}
          title="Configuración de Hardware Broadcast y SDI"
        >
          <Settings size={16} />
        </button>

        {/* Windows Controls estilo VS Code / Antigravity IDE */}
        <div className="ide-window-controls" style={{ display: 'flex', alignItems: 'center', marginLeft: 8 }}>
          <button
            className="ide-win-btn"
            title="Minimizar"
            onClick={() => (window as any).electronAPI?.minimize?.()}
            style={{
              background: 'transparent',
              border: 'none',
              width: 38,
              height: 32,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: 'var(--color-ink-soft)',
              borderRadius: 4
            }}
          >
            <Minus size={14} />
          </button>
          <button
            className="ide-win-btn"
            title="Maximizar / Restaurar"
            onClick={() => (window as any).electronAPI?.maximize?.()}
            style={{
              background: 'transparent',
              border: 'none',
              width: 38,
              height: 32,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: 'var(--color-ink-soft)',
              borderRadius: 4
            }}
          >
            <Square size={12} />
          </button>
          <button
            className="ide-win-btn-close"
            title="Cerrar Sistema de Emisión"
            onClick={() => onOpenExitModal ? onOpenExitModal() : (window as any).electronAPI?.close?.()}
            style={{
              background: 'transparent',
              border: 'none',
              width: 38,
              height: 32,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: 'var(--color-ink-soft)',
              borderRadius: 4
            }}
          >
            <X size={15} />
          </button>
        </div>
      </div>
    </header>
  );
};

