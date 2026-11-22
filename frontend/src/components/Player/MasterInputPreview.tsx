import React, { useState, useEffect } from 'react';
import { useDeckLink } from '../../hooks/useDeckLink';
import { useNdi } from '../../hooks/useNdi';
import { DeckLinkPreviewPlayer } from '../DeckLink/DeckLinkPreviewPlayer';
import { NdiPreviewPlayer } from '../Ndi/NdiPreviewPlayer';
import { Globe, RotateCcw, Video, ChevronDown, ChevronUp } from 'lucide-react';

interface MasterInputPreviewProps {
  isOnAir: boolean;
  isLive: boolean;
  profile?: string;
  isCompact?: boolean;
  onRefreshPlaylist?: () => void;
}

export const MasterInputPreview: React.FC<MasterInputPreviewProps> = ({
  isOnAir,
  isLive,
  profile = '1080i59.94',
  isCompact = true
}) => {
  const { inputs, refreshData: refreshDeckLink } = useDeckLink({ autoFetch: true });
  const { ndiSources, refreshData: refreshNdi, scanSources } = useNdi({ autoFetch: true });

  const [inputType, setInputType] = useState<'SDI' | 'NDI'>('SDI');
  const [selectedSdiId, setSelectedSdiId] = useState<string>('sdi-in-1');
  const [selectedNdiId, setSelectedNdiId] = useState<string>('');
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const [refreshKey, setRefreshKey] = useState<number>(Date.now());

  // Sincronizar selección inicial de SDI
  useEffect(() => {
    if (inputs && inputs.length > 0 && !inputs.some(i => i.id === selectedSdiId)) {
      setSelectedSdiId(inputs[0].id);
    }
  }, [inputs, selectedSdiId]);

  // Sincronizar selección inicial de NDI
  useEffect(() => {
    if (ndiSources && ndiSources.length > 0 && (!selectedNdiId || !ndiSources.some(s => s.id === selectedNdiId))) {
      setSelectedNdiId(ndiSources[0].id);
    }
  }, [ndiSources, selectedNdiId]);

  const activeNdiSource = ndiSources.find(s => s.id === selectedNdiId) || (ndiSources.length > 0 ? ndiSources[0] : null);
  const activeSdiInput = inputs.find(i => i.id === selectedSdiId) || (inputs.length > 0 ? inputs[0] : null);

  const handleManualRefresh = () => {
    setRefreshKey(Date.now());
    if (inputType === 'SDI') {
      refreshDeckLink();
    } else {
      refreshNdi();
      scanSources();
    }
  };

  return (
    <div className="monitor-card" style={{ borderTop: '1px solid var(--border-subtle)', borderBottom: 'none', marginTop: 2 }}>
      {/* Cabecera del Monitor de Entrada / Preview */}
      <div className="card-header" style={{ padding: '4px 8px', background: 'rgba(255, 255, 255, 0.015)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span
            className="m3-monitor-tag preview"
            style={{ fontSize: 9.5, padding: '2px 6px', fontWeight: 700, letterSpacing: '0.04em' }}
            title="Monitor Auxiliar de Entrada / Previo (Monitoreo de señales entrantes SDI o NDI antes de pasarlas a emisión)"
          >
            ENTRADA / PREVIO (PREVIEW)
          </span>

          {/* Selector de Entrada Integrado: SDI (DeckLink) / NDI (Red IP) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <button
              type="button"
              className={`m3-input-selector-btn ${inputType === 'SDI' ? 'active' : ''}`}
              onClick={() => setInputType('SDI')}
              title="Monitorear entrada física SDI (Blackmagic DeckLink)"
              style={{ padding: '2px 6px', fontSize: 9.5 }}
            >
              <Video size={10} />
              <span>SDI</span>
            </button>
            <button
              type="button"
              className={`m3-input-selector-btn ${inputType === 'NDI' ? 'active' : ''}`}
              onClick={() => setInputType('NDI')}
              title="Monitorear entrada NDI sobre red IP LAN"
              style={{ padding: '2px 6px', fontSize: 9.5 }}
            >
              <Globe size={10} />
              <span>NDI</span>
            </button>
          </div>
        </div>

        {/* Controles de Selección de Fuente Específica, Refresco y Plegado */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {inputType === 'SDI' ? (
            <select
              className="m3-input-dropdown"
              value={selectedSdiId}
              onChange={(e) => setSelectedSdiId(e.target.value)}
              title="Seleccionar canal o entrada SDI física"
              style={{ maxWidth: 120, height: 22, fontSize: 10, padding: '1px 4px' }}
            >
              {inputs && inputs.length > 0 ? (
                inputs.map((inp) => (
                  <option key={inp.id} value={inp.id}>
                    {inp.name || inp.id}
                  </option>
                ))
              ) : (
                <option value="sdi-in-1">SDI In 1</option>
              )}
            </select>
          ) : (
            <select
              className="m3-input-dropdown"
              value={selectedNdiId}
              onChange={(e) => setSelectedNdiId(e.target.value)}
              title="Seleccionar flujo de video NDI detectado en la red"
              style={{ maxWidth: 120, height: 22, fontSize: 10, padding: '1px 4px' }}
            >
              {ndiSources && ndiSources.length > 0 ? (
                ndiSources.map((src) => (
                  <option key={src.id} value={src.id}>
                    {src.stream_name}
                  </option>
                ))
              ) : (
                <option value="">Sin NDI detectado</option>
              )}
            </select>
          )}

          <button
            type="button"
            className="ide-icon-btn"
            onClick={handleManualRefresh}
            title="Refrescar señal de entrada previa"
            style={{
              padding: '2px 4px',
              borderRadius: 4,
              border: '1px solid var(--border-subtle)',
              background: 'transparent',
              cursor: 'pointer'
            }}
          >
            <RotateCcw size={11} color="var(--color-text-muted)" />
          </button>

          <button
            type="button"
            className="ide-icon-btn"
            onClick={() => setIsCollapsed(!isCollapsed)}
            title={isCollapsed ? 'Expandir monitor previo de entradas' : 'Plegar monitor previo'}
            style={{
              padding: '2px 4px',
              borderRadius: 4,
              border: '1px solid var(--border-subtle)',
              background: 'transparent',
              cursor: 'pointer'
            }}
          >
            {isCollapsed ? <ChevronDown size={11} /> : <ChevronUp size={11} />}
          </button>
        </div>
      </div>

      {/* Pantalla Previa directa hasta abajo (16:9 limpia sin barras intermedias ni botones) */}
      {!isCollapsed && (
        <div style={{ position: 'relative', width: '100%', background: '#000000', overflow: 'hidden' }}>
          {inputType === 'SDI' ? (
            <DeckLinkPreviewPlayer
              key={`sdi-${selectedSdiId}-${refreshKey}`}
              inputId={selectedSdiId}
              inputName={activeSdiInput?.name}
              format={profile}
              height={isCompact ? 175 : 210}
              showOverlay={true}
              preferSnapshot={true}
              style={{ border: 'none', borderRadius: 0, width: '100%' }}
            />
          ) : (
            <NdiPreviewPlayer
              key={`ndi-${selectedNdiId}-${refreshKey}`}
              sourceQuery={activeNdiSource?.ip_address}
              sourceName={activeNdiSource?.stream_name}
              sourceMachine={activeNdiSource?.machine_name}
              format={profile}
              height={isCompact ? 175 : 210}
              showOverlay={true}
              preferSnapshot={true}
              style={{ border: 'none', borderRadius: 0, width: '100%' }}
            />
          )}
        </div>
      )}
    </div>
  );
};
