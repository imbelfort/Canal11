import React, { useState, useRef, useEffect } from 'react';
import { api } from '../services/api';
import { bmsApi } from '../services/bmsApi';
import { usePreferences } from '../context/PreferencesContext';
import { PlayoutBroadcastState } from '../types/playout';
import {
  Play,
  Pause,
  SkipForward,
  Square,
  Search,
  Sliders,
  LogOut,
  FolderOpen,
  Save,
  FileSpreadsheet,
  Layers,
  Tv,
  CheckCircle,
  Sparkles,
  Shield,
  Video
} from 'lucide-react';

interface UnifiedTopBarProps {
  playoutState: PlayoutBroadcastState | null;
  activeMainTab: 'BMS' | 'PLAYLIST';
  onSelectMainTab: (tab: 'BMS' | 'PLAYLIST') => void;
  onOpenPreferences: () => void;
  onPlaylistUpdated: () => void;
  onNavigateTab: (tab: 'PLAYLIST' | 'BUILDER' | 'AUDIT') => void;
}

export const UnifiedTopBar: React.FC<UnifiedTopBarProps> = ({
  playoutState,
  activeMainTab,
  onSelectMainTab,
  onOpenPreferences,
  onPlaylistUpdated,
  onNavigateTab
}) => {
  const { user, logout } = usePreferences();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const userRoles: string[] = user?.roles || [];
  const isAdmin = userRoles.some(r => r.includes('ADMIN'));
  const isProg = userRoles.some(r => r.includes('PROG'));
  const isQC = userRoles.some(r => r.includes('CONT') || r.includes('QC'));

  const state = playoutState?.state || 'IDLE';
  const isPlaying = state === 'PLAYING';
  const isPaused = state === 'PAUSED';

  // Buscador Universal tipo Gmail
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);

  const handleSearch = async (val: string) => {
    setSearchQuery(val);
    if (!val.trim()) {
      setSearchResults([]);
      setShowSearchDropdown(false);
      return;
    }
    try {
      const res = await bmsApi.search(val);
      setSearchResults(res.results || []);
      setShowSearchDropdown(true);
    } catch (e) {
      console.error(e);
    }
  };

  // Guardar Playlist en XML
  const handleSavePlaylist = () => {
    window.open(api.getExportXmlUrl(), '_blank');
  };

  // Cargar Videos directamente
  const handleAddVideos = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const toAdd = files.map(f => {
      const title = f.name.replace(/\.[^/.]+$/, '');
      const blobUrl = URL.createObjectURL(f);
      return {
        title,
        file_path: blobUrl,
        event_type: 'VIDEO' as const,
        duration_ms: 30000,
        timing_mode: 'AUTO_FOLLOW' as const
      };
    });

    api.addItems(toAdd).then(() => {
      onPlaylistUpdated();
      onSelectMainTab('PLAYLIST');
    });

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <header className="unified-topbar">
      {/* 1. SECCIÓN MARCA / CANAL (TEXTO LIMPIO EN MATERIAL DESIGN 3.0) */}
      <div className="topbar-left">
        <div className="channel-info">
          <div className="channel-title">Playout BMS • Grupo 12 SC</div>
          <div className="channel-sub">
            {user?.nombre} <strong className="channel-role">({user?.rol_principal || 'OPERADOR'})</strong>
          </div>
        </div>
      </div>

      {/* 2. SELECTOR DE VISTA PRINCIPAL (BMS vs PLAYLIST MAESTRO) */}
      <div className="topbar-nav">
        <button
          className={`nav-btn ${activeMainTab === 'BMS' ? 'active' : ''}`}
          onClick={() => onSelectMainTab('BMS')}
          title="Gestión de Casos de Uso según Rol"
        >
          <Layers size={15} />
          <span>Sistema BMS</span>
        </button>

        {/* El Programador y Admin tienen acceso a la lista en vivo */}
        {(isAdmin || isProg || isQC) && (
          <button
            className={`nav-btn ${activeMainTab === 'PLAYLIST' ? 'active' : ''}`}
            onClick={() => onSelectMainTab('PLAYLIST')}
            title="Consola de Transmisión y Escaleta en Vivo"
          >
            <Tv size={15} />
            <span>Master Playout</span>
          </button>
        )}
      </div>

      {/* 3. BUSCADOR TIPO GMAIL */}
      <div className="topbar-search">
        <div className="search-box">
          <Search size={15} color="#94a3b8" />
          <input
            type="text"
            placeholder="Buscar programas, clientes, spots, materiales MAM o personal..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
          />
        </div>

        {showSearchDropdown && (
          <div className="search-dropdown">
            {searchResults.length === 0 ? (
              <div style={{ padding: 12, fontSize: 12, color: '#94a3b8', textAlign: 'center' }}>Sin resultados.</div>
            ) : (
              searchResults.map((r, i) => (
                <div
                  key={i}
                  className="search-item"
                  onClick={() => {
                    setShowSearchDropdown(false);
                    onSelectMainTab('BMS');
                  }}
                >
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{r.title}</div>
                    <div style={{ fontSize: 11, color: '#94a3b8' }}>{r.subtitle}</div>
                  </div>
                  <span className="bms-pill-badge bms-badge-cyan">{r.category}</span>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* 4. HERRAMIENTAS SEGÚN ROL: PLAYLIST, PLAY, BITÁCORA */}
      <div className="topbar-tools">
        {/* Controles de Playout / Play / Pause (Programador, Contenidos y Admin) */}
        <div className="transport-pill">
          {isPlaying ? (
            <button
              className="transport-btn pause"
              onClick={() => api.pause().then(onPlaylistUpdated)}
              title="Pausar Emisión"
            >
              <Pause size={14} />
            </button>
          ) : (
            <button
              className="transport-btn play"
              onClick={() => api.play().then(onPlaylistUpdated)}
              title="Iniciar Emisión (Play)"
            >
              <Play size={14} />
            </button>
          )}

          <button
            className="transport-btn next"
            onClick={() => api.next().then(onPlaylistUpdated)}
            title="Siguiente Video"
          >
            <SkipForward size={14} />
          </button>
          <button
            className="transport-btn stop"
            onClick={() => api.stop().then(onPlaylistUpdated)}
            title="Detener"
          >
            <Square size={14} />
          </button>
        </div>

        {/* Acceso a Bitácora As-Run / Auditoría */}
        <button
          className="tool-btn"
          onClick={() => {
            onSelectMainTab('PLAYLIST');
            onNavigateTab('AUDIT');
          }}
          title="Ver Bitácora As-Run y Auditoría"
        >
          <FileSpreadsheet size={14} />
          <span>Bitácora</span>
        </button>

        {/* Preferencias Visuales (Temas, Tamaño, Colores) */}
        <button
          className="tool-btn"
          onClick={onOpenPreferences}
          title="Configuración Visual Compartida"
        >
          <Sliders size={14} />
          <span>Apariencia</span>
        </button>

        {/* Cerrar Sesión */}
        <button
          className="tool-btn logout-btn"
          onClick={logout}
          title="Cerrar Sesión del Operador"
        >
          <LogOut size={14} />
          <span>Salir</span>
        </button>
      </div>

      {/* Input oculto para carga de videos */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="video/*,.mxf,.ts,.mp4,.mov,.mkv"
        style={{ display: 'none' }}
        onChange={handleAddVideos}
      />
    </header>
  );
};
