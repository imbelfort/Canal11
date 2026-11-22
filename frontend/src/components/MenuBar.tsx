import React, { useState, useRef, useEffect } from 'react';
import { api } from '../services/api';
import { PlayoutBroadcastState } from '../types/playout';
import { FileCode, Clock, Tv } from 'lucide-react';

interface MenuBarProps {
  playoutState: PlayoutBroadcastState | null;
  isConnected: boolean;
  onNavigateTab: (tab: 'PLAYLIST' | 'BUILDER' | 'GRAPHICS' | 'AUDIT' | 'DECKLINK' | 'INCIDENTS') => void;
  onOpenLiveModal: () => void;
  onOpenLiveSdiModal?: () => void;
  onOpenDeckLinkModal?: (tab?: 'OUTPUT' | 'INPUTS') => void;
  onPlaylistUpdated: () => void;
}

export const MenuBar: React.FC<MenuBarProps> = ({
  playoutState,
  isConnected,
  onNavigateTab,
  onOpenLiveModal,
  onOpenLiveSdiModal,
  onOpenDeckLinkModal,
  onPlaylistUpdated
}) => {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const xmlFileInputRef = useRef<HTMLInputElement | null>(null);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setOpenMenu(null);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  const masterTimecode = playoutState?.timecodes?.stationMaster || '00:00:00;00';

  const handleOpenXmlFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const content = evt.target?.result as string;
      if (content) {
        const isXml = file.name.endsWith('.xml') || content.trim().startsWith('<');
        await api.importPlaylist(content, isXml ? 'xml' : 'json');
        onPlaylistUpdated();
        onNavigateTab('PLAYLIST');
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

  return (
    <div className="ide-menu-bar" onClick={(e) => e.stopPropagation()}>
      <div className="ide-menu-items">
        <span className="ide-station-brand">IB-Cast</span>

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
                <span>Cargar Playlist...</span>
                <span className="ide-shortcut">Ctrl+O</span>
              </div>
              <div className="ide-menu-divider" />
              <div className="ide-menu-item" onClick={() => { handleExportXml(); setOpenMenu(null); }}>
                <span>Guardar Playlist...</span>
                <span className="ide-shortcut">Ctrl+S</span>
              </div>

              <div className="ide-menu-divider" />
              <div className="ide-menu-item" onClick={() => { handleExportAuditCsv(); setOpenMenu(null); }}>
                <span>Descargar Auditoría (CSV)...</span>
              </div>
            </div>
          )}
        </div>

        {/* EDITAR */}
        <div className="ide-menu-dropdown">
          <button
            className={`ide-menu-btn ${openMenu === 'editar' ? 'active' : ''}`}
            onClick={() => setOpenMenu(openMenu === 'editar' ? null : 'editar')}
          >
            Edición
          </button>
          {openMenu === 'editar' && (
            <div className="ide-dropdown-menu">
              <div className="ide-menu-item" onClick={() => { fileInputRef.current?.click(); setOpenMenu(null); }}>
                <span>Agregar Videos...</span>
              </div>
              <div className="ide-menu-item" onClick={() => { onOpenLiveModal(); setOpenMenu(null); }}>
                <span>Insertar Señal en Vivo SDI...</span>
              </div>
              <div className="ide-menu-divider" />
              <div className="ide-menu-item" onClick={() => { api.clearPlaylist(); onPlaylistUpdated(); setOpenMenu(null); }}>
                <span>Vaciar Lista de Emisión</span>
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
                <span>Iniciar Emisión (Play)</span>
                <span className="ide-shortcut">Espacio</span>
              </div>
              <div className="ide-menu-item" onClick={() => { api.pause(); setOpenMenu(null); }}>
                <span>Pausar (Freeze)</span>
              </div>
              <div className="ide-menu-item" onClick={() => { api.next(); setOpenMenu(null); }}>
                <span>Saltar al Siguiente (Next)</span>
                <span className="ide-shortcut">F10</span>
              </div>
              <div className="ide-menu-item" onClick={() => { api.stop(); setOpenMenu(null); }}>
                <span>Detener Salida PGM</span>
              </div>
              <div className="ide-menu-divider" />
              <div className="ide-menu-item" onClick={() => { api.takeLive(); setOpenMenu(null); }}>
                <span>Conmutar a Entrada SDI en Vivo</span>
                <span className="ide-shortcut">F8</span>
              </div>
              <div className="ide-menu-item" onClick={() => { api.triggerEmergency('Menú Emisión'); setOpenMenu(null); }}>
                <span style={{ color: 'var(--apple-red)' }}>Cortinilla de Respaldo</span>
                <span className="ide-shortcut">F12</span>
              </div>
            </div>
          )}
        </div>

        {/* HARDWARE */}
        <div className="ide-menu-dropdown">
          <button
            className={`ide-menu-btn ${openMenu === 'hardware' ? 'active' : ''}`}
            onClick={() => setOpenMenu(openMenu === 'hardware' ? null : 'hardware')}
          >
            Hardware
          </button>
          {openMenu === 'hardware' && (
            <div className="ide-dropdown-menu">
              <div className="ide-menu-item" onClick={() => { onOpenDeckLinkModal ? onOpenDeckLinkModal('OUTPUT') : onNavigateTab('DECKLINK'); setOpenMenu(null); }}>
                <span>Salida Master (SDI / NDI)...</span>
              </div>
              <div className="ide-menu-item" onClick={() => { (onOpenLiveSdiModal || onOpenLiveModal)(); setOpenMenu(null); }}>
                <span>Entradas SDI Físicas (En Vivo)...</span>
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
                <span>Lista de Emisión (Playlist)</span>
              </div>
              <div className="ide-menu-item" onClick={() => { onNavigateTab('AUDIT'); setOpenMenu(null); }}>
                <span>Auditoría Oficial (As-Run Log)</span>
              </div>
              <div className="ide-menu-item" onClick={() => { onNavigateTab('INCIDENTS'); setOpenMenu(null); }}>
                <span>Incidentes Técnicos</span>
              </div>
              <div className="ide-menu-item" onClick={() => { onNavigateTab('DECKLINK'); setOpenMenu(null); }}>
                <span>Parámetros de Emisión Hardware</span>
              </div>
            </div>
          )}
        </div>

        {/* Hidden inputs for opening files */}
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
          accept="video/*,image/*"
          style={{ display: 'none' }}
          onChange={async (e) => {
            const files = Array.from(e.target.files || []);
            if (files.length === 0) return;
            const toAdd = files.map(f => ({
              title: f.name.replace(/\.[^/.]+$/, ''),
              file_path: (f as any).path || f.name,
              event_type: f.type.startsWith('image') ? 'IMAGE' as const : 'VIDEO' as const,
              duration_ms: 30000,
              timing_mode: 'AUTO_FOLLOW' as const
            }));
            await api.addItems(toAdd);
            onPlaylistUpdated();
          }}
        />
      </div>

      {/* Right side: Bolivia Master Clock & Output profile */}
      <div className="ide-menu-status">
        <div className="ide-status-item">
          <span className={`ide-dot ${isConnected ? 'online' : ''}`} />
          <span>SDI Master</span>
        </div>
        <div className="ide-status-clock" title="Hora Estación Master (UTC-4)">
          <Clock size={12} style={{ color: 'var(--text-secondary)' }} />
          <span>{masterTimecode}</span>
          <span style={{ fontSize: 9, color: 'var(--text-tertiary)', marginLeft: 3 }}>BOT</span>
        </div>
      </div>
    </div>
  );
};

