import React from 'react';
import {
  Plus,
  Radio,
  Globe,
  RefreshCw,
  Sparkles,
  EyeOff,
  Sliders,
  Trash2,
  FolderOpen,
  Download,
  Send
} from 'lucide-react';

interface BuilderToolbarProps {
  onAddVideos: () => void;
  onAddLiveSdi: () => void;
  onAddLiveNdi: () => void;
  onOpenBatchModal: () => void;
  repeatedGroupsCount: number;
  onSetAllCG: (enable: boolean) => void;
  onAutoSuppressCommercialsCG: () => void;
  startTimeStr: string;
  onStartTimeChange: (val: string) => void;
  onSetStartTimeNow: () => void;
  selectedCount: number;
  onToggleSelectedCG: () => void;
  onDeleteSelected: () => void;
  onLoadFromCurrentDeck: () => void;
  onLoadToDeck: (replace: boolean) => void;
  isSendingToDeck: boolean;
  hasItems: boolean;
  onOpenPlaylistFile: () => void;
  onSavePlaylist: () => void;
  onClearAll: () => void;
}

export const BuilderToolbar: React.FC<BuilderToolbarProps> = ({
  onAddVideos,
  onAddLiveSdi,
  onAddLiveNdi,
  onOpenBatchModal,
  repeatedGroupsCount,
  onSetAllCG,
  onAutoSuppressCommercialsCG,
  startTimeStr,
  onStartTimeChange,
  onSetStartTimeNow,
  selectedCount,
  onToggleSelectedCG,
  onDeleteSelected,
  onLoadFromCurrentDeck,
  onLoadToDeck,
  isSendingToDeck,
  hasItems,
  onOpenPlaylistFile,
  onSavePlaylist,
  onClearAll
}) => {
  return (
    <div style={{
      padding: '8px 18px',
      background: 'var(--color-field)',
      borderBottom: '1px solid var(--color-hairline)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      flexWrap: 'wrap',
      gap: 8,
      flexShrink: 0
    }}>
      {/* Herramientas de Agregar & Operaciones en Lote */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        <button
          type="button"
          className="btn-tool primary"
          onClick={onAddVideos}
          style={{ fontSize: 11, fontWeight: 600, padding: '5px 12px', gap: 6 }}
        >
          <Plus size={13} />
          <span>Agregar Videos</span>
        </button>

        <button
          type="button"
          className="btn-tool"
          onClick={onAddLiveSdi}
          style={{ fontSize: 11, padding: '5px 10px', gap: 5 }}
          title="Inserta bloque en vivo SDI con duración predeterminada"
        >
          <Radio size={12} color="var(--color-primary)" />
          <span>+ Vivo SDI (1h)</span>
        </button>

        <button
          type="button"
          className="btn-tool"
          onClick={onAddLiveNdi}
          style={{ fontSize: 11, padding: '5px 10px', gap: 5 }}
          title="Inserta bloque en vivo NDI IP"
        >
          <Globe size={12} color="var(--color-cyan)" />
          <span>+ Vivo NDI (1h)</span>
        </button>

        {/* Reemplazo en Lote de archivos repetidos */}
        <button
          type="button"
          className="btn-tool"
          onClick={onOpenBatchModal}
          style={{ fontSize: 10.5, padding: '4px 8px', gap: 5 }}
          title="Sustituir comerciales o cortinillas repetidas en toda la pauta de una sola vez"
        >
          <RefreshCw size={11} color="var(--color-primary)" />
          <span>Reemplazar en Lote</span>
          {repeatedGroupsCount > 0 && (
            <span style={{
              fontSize: 9,
              fontWeight: 700,
              padding: '0 5px',
              borderRadius: 8,
              background: 'rgba(59, 130, 246, 0.2)',
              color: 'var(--color-primary)'
            }}>
              {repeatedGroupsCount}
            </span>
          )}
        </button>

        {/* Acciones Masivas de CG */}
        <button
          type="button"
          className="btn-tool"
          onClick={() => onSetAllCG(true)}
          style={{ fontSize: 10.5, padding: '4px 8px' }}
          title="Activa CG (mosca/reloj) en todas las filas"
        >
          <Sparkles size={11} color="var(--color-success)" />
          <span>CG Todo ON</span>
        </button>

        <button
          type="button"
          className="btn-tool"
          onClick={() => onSetAllCG(false)}
          style={{ fontSize: 10.5, padding: '4px 8px' }}
          title="Desactiva CG en todas las filas (limpio)"
        >
          <EyeOff size={11} color="var(--color-text-muted)" />
          <span>CG Todo OFF</span>
        </button>

        <button
          type="button"
          className="btn-tool"
          onClick={onAutoSuppressCommercialsCG}
          style={{ fontSize: 10.5, padding: '4px 8px' }}
          title="Apaga el CG automáticamente en los videos identificados como comerciales o spots publicitarios"
        >
          <Sliders size={11} color="var(--color-primary)" />
          <span>Auto CG en Comerciales</span>
        </button>

        {/* Ajuste de Hora de Inicio de la Pauta */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginLeft: 4, borderLeft: '1px solid var(--color-hairline)', paddingLeft: 8 }}>
          <span style={{ fontSize: 10.5, color: 'var(--color-text-muted)' }}>Inicio Pauta:</span>
          <input
            type="text"
            className="btn-tool"
            style={{ width: 70, padding: '2px 5px', fontSize: 11, fontFamily: 'var(--font-family-mono)', textAlign: 'center' }}
            value={startTimeStr}
            onChange={(e) => onStartTimeChange(e.target.value)}
            placeholder="12:00:00"
            title="Hora de inicio para proyectar la columna Inicio de cada elemento"
          />
          <button
            type="button"
            className="btn-tool"
            onClick={onSetStartTimeNow}
            style={{ padding: '2px 6px', fontSize: 9.5 }}
            title="Fijar hora de inicio a la hora actual"
          >
            Ahora
          </button>
        </div>
      </div>

      {/* Acciones de Archivo y Despacho al Deck Master */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        {selectedCount > 0 && (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginRight: 6 }}>
            <button
              type="button"
              className="btn-tool"
              onClick={onToggleSelectedCG}
              style={{ fontSize: 10.5, padding: '4px 8px' }}
              title="Alternar estado de gráficos en los elementos seleccionados"
            >
              <Sparkles size={11} color="var(--color-accent)" />
              <span>Alternar CG ({selectedCount})</span>
            </button>
            <button
              type="button"
              className="btn-tool"
              onClick={onDeleteSelected}
              style={{ fontSize: 10.5, padding: '4px 8px', color: 'var(--color-live)' }}
              title="Eliminar elementos seleccionados de la pauta"
            >
              <Trash2 size={11} />
              <span>Eliminar ({selectedCount})</span>
            </button>
          </div>
        )}

        <button
          type="button"
          className="btn-tool"
          onClick={onLoadFromCurrentDeck}
          style={{ fontSize: 11, padding: '5px 12px', gap: 6 }}
          title="Importa la lista que está actualmente cargada en la emisión master para planificar sobre ella"
        >
          <RefreshCw size={12} />
          <span>Traer del Deck</span>
        </button>

        <button
          type="button"
          className="modal-btn-primary"
          onClick={() => onLoadToDeck(true)}
          disabled={isSendingToDeck || !hasItems}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 11,
            fontWeight: 600,
            padding: '5px 12px'
          }}
          title="Reemplaza atómicamente la lista del deck con esta programación planificada"
        >
          {isSendingToDeck ? <RefreshCw size={12} className="spin" /> : <Send size={12} />}
          <span>Enviar al Deck (Reemplazar)</span>
        </button>

        <button
          type="button"
          className="btn-tool"
          onClick={() => onLoadToDeck(false)}
          disabled={isSendingToDeck || !hasItems}
          style={{ fontSize: 11, padding: '5px 10px', gap: 5 }}
          title="Añade esta lista al final de la programación que está actualmente al aire"
        >
          <Plus size={12} />
          <span>Añadir al Deck</span>
        </button>

        <button
          type="button"
          className="btn-tool"
          onClick={onOpenPlaylistFile}
          style={{ fontSize: 11, padding: '5px 12px', gap: 6 }}
          title="Cargar una lista de emisión previamente guardada en archivo XML o JSON"
        >
          <FolderOpen size={13} />
          <span>Cargar XML</span>
        </button>

        <button
          type="button"
          className="btn-tool"
          onClick={onSavePlaylist}
          disabled={!hasItems}
          style={{ fontSize: 11, padding: '5px 12px', gap: 6 }}
          title="Guardar la lista actual en un archivo de emisión XML"
        >
          <Download size={13} />
          <span>Guardar en XML</span>
        </button>

        <button
          type="button"
          className="btn-tool"
          onClick={onClearAll}
          disabled={!hasItems}
          style={{ fontSize: 11, padding: '5px 8px', color: 'var(--color-live)' }}
          title="Vaciar la lista de armado"
        >
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  );
};

