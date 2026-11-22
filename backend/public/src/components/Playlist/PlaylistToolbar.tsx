import React, { useRef } from 'react';
import { api } from '../../services/api';
import { Plus, Radio, Globe, ArrowUp, ArrowDown, Trash2, RotateCcw, FolderOpen, Repeat } from 'lucide-react';

interface PlaylistToolbarProps {
  onRefresh: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDeleteSelected: () => void;
  onClear: () => void;
  hasSelection?: boolean;
  onOpenLiveModal?: () => void;
  onOpenLiveSdiModal?: () => void;
  onOpenLiveNdiModal?: () => void;
  loop?: boolean;
  onToggleLoop?: () => void;
}

export const isCommercialMedia = (title: string, _filePath?: string): boolean => {
  const titleLower = (title || '').toLowerCase();
  const commercialKeywords = [
    'comercial', 'comerciales', 'publicidad', 'spot', 'spots',
    'tanda', 'tandas', 'promo', 'promocion', 'promoción', 'promos', 'promociones',
    'avance', 'avances', 'corte', 'cortes', 'aviso', 'avisos',
    'anuncio', 'anuncios', 'pnt', 'sponsor', 'auspicio', 'patrocinio'
  ];
  return commercialKeywords.some(kw => titleLower.includes(kw));
};

export const getMediaDuration = (file: File): Promise<number> => {
  return new Promise((resolve) => {
    try {
      const url = URL.createObjectURL(file);
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.onloadedmetadata = () => {
        URL.revokeObjectURL(url);
        const durationSec = video.duration;
        if (durationSec && !isNaN(durationSec) && durationSec > 0) {
          resolve(Math.round(durationSec * 1000));
        } else {
          resolve(file.type.startsWith('image') ? 10000 : 30000);
        }
      };
      video.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(file.type.startsWith('image') ? 10000 : 30000);
      };
      video.src = url;
    } catch {
      resolve(file.type.startsWith('image') ? 10000 : 30000);
    }
  });
};

export const PlaylistToolbar: React.FC<PlaylistToolbarProps> = ({
  onRefresh,
  onMoveUp,
  onMoveDown,
  onDeleteSelected,
  onClear,
  hasSelection = false,
  onOpenLiveModal,
  onOpenLiveSdiModal,
  onOpenLiveNdiModal,
  loop = false,
  onToggleLoop,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const xmlFileInputRef = useRef<HTMLInputElement | null>(null);

  const handleImportXml = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const content = ev.target?.result as string;
        if (!content) return;
        const format = file.name.endsWith('.json') ? 'json' : 'xml';
        const count = await api.importPlaylist(content, format);
        onRefresh();
        alert(`Se cargaron exitosamente ${count} elementos desde el archivo XML a la emisión.`);
      } catch (err: any) {
        alert(`Error al importar archivo XML: ${err.message}`);
      }
    };
    reader.readAsText(file);
    if (xmlFileInputRef.current) xmlFileInputRef.current.value = '';
  };

  const handleAddVideosClick = async () => {
    if ((window as any).electronAPI?.openVideoDialog) {
      const paths: string[] = await (window as any).electronAPI.openVideoDialog();
      if (!paths || paths.length === 0) return;
      const toAdd = await Promise.all(
        paths.map(async (fp) => {
          const filename = fp.split(/[\\/]/).pop() || fp;
          const title = filename.replace(/\.[^/.]+$/, '');
          let durationMs = 30000;
          try {
            const data: any = await api.probeMedia(fp);
            if (data?.durationMs) durationMs = data.durationMs;
          } catch { }
          const isCommercial = isCommercialMedia(title, fp);
          return {
            title,
            file_path: fp,
            event_type: isCommercial ? ('COMMERCIAL' as const) : ('VIDEO' as const),
            duration_ms: durationMs,
            show_graphics: !isCommercial,
            timing_mode: 'AUTO_FOLLOW' as const
          };
        })
      );
      await api.addItems(toAdd);
      onRefresh();
    } else {
      fileInputRef.current?.click();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const toAdd = await Promise.all(
      files.map(async (file) => {
        const durationMs = await getMediaDuration(file);
        let realPath = (file as any).path || file.name;
        if ((window as any).electronAPI?.getPathForFile) {
          try {
            const p = (window as any).electronAPI.getPathForFile(file);
            if (p) realPath = p;
          } catch { }
        }
        const title = file.name.replace(/\.[^/.]+$/, "");
        const isCommercial = isCommercialMedia(title, realPath);
        return {
          title,
          file_path: realPath,
          event_type: isCommercial ? ('COMMERCIAL' as const) : ('VIDEO' as const),
          duration_ms: durationMs,
          show_graphics: !isCommercial,
          timing_mode: 'AUTO_FOLLOW' as const
        };
      })
    );

    await api.addItems(toAdd);
    onRefresh();
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleAddLiveSdi = async () => {
    try {
      // Obtener la entrada SDI predeterminada establecida por el operador
      const inputs = await api.getHardwareInputs();
      const defaultSdi = inputs.find(i => i.is_default === 1) || inputs.find(i => i.connector?.includes('SDI')) || inputs[0];

      const inputId = defaultSdi ? defaultSdi.id : 'sdi-in-1';
      const inputTitle = defaultSdi ? `EN VIVO - ${defaultSdi.name}` : 'EN VIVO - SDI DECKLINK';

      await api.addItems([{
        title: inputTitle,
        file_path: inputId,
        event_type: 'LIVE_SDI',
        duration_ms: 3600000, // 1 hora estimada de bloque
        timing_mode: 'AUTO_FOLLOW'
      }]);
      onRefresh();
    } catch {
      if (onOpenLiveSdiModal) onOpenLiveSdiModal();
      else if (onOpenLiveModal) onOpenLiveModal();
    }
  };

  const handleAddLiveNdi = async () => {
    try {
      // Obtener la fuente NDI predeterminada
      const { selected } = await api.getNdiSources();
      const inputId = selected ? selected.id : 'NDI_DEFAULT';
      const inputTitle = selected ? `EN VIVO - NDI (${selected.name})` : 'EN VIVO - NDI RED IP';

      await api.addItems([{
        title: inputTitle,
        file_path: inputId,
        event_type: 'LIVE_NDI',
        duration_ms: 3600000,
        timing_mode: 'AUTO_FOLLOW'
      }]);
      onRefresh();
    } catch {
      if (onOpenLiveNdiModal) onOpenLiveNdiModal();
    }
  };

  return (
    <div className="playlist-toolbar">
      <div className="toolbar-group">
        <button
          className="btn-tool primary"
          onClick={handleAddVideosClick}
          title="Seleccionar archivos de video desde el explorador"
        >
          <Plus size={13} />
          <span>Agregar Videos</span>
        </button>
        <button className="btn-tool" onClick={handleAddLiveSdi} title="Insertar bloque SDI en vivo (+1h)">
          <Radio size={13} />
          <span>Vivo SDI</span>
        </button>
        <button className="btn-tool" onClick={handleAddLiveNdi} title="Insertar fuente NDI sobre red IP (vMix, OBS, PTZ)">
          <Globe size={13} />
          <span>Vivo NDI</span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".mp4,.mov,.mkv,.ts,.mxf,.avi,.webm,video/mp4,video/quicktime,video/x-matroska,video/mp2t"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
      </div>

      <div className="toolbar-group">
        <button className="btn-tool" onClick={onMoveUp} title="Subir orden">
          <ArrowUp size={13} />
          <span>Subir</span>
        </button>
        <button className="btn-tool" onClick={onMoveDown} title="Bajar orden">
          <ArrowDown size={13} />
          <span>Bajar</span>
        </button>
        <button
          className="btn-tool"
          onClick={onDeleteSelected}
          style={{ color: 'var(--color-live)', opacity: hasSelection ? 1 : 0.6 }}
          title={hasSelection ? 'Eliminar elemento seleccionado de la lista' : 'Seleccione una fila para eliminar'}
        >
          <Trash2 size={13} />
          <span>Eliminar</span>
        </button>
        <button className="btn-tool" onClick={onClear} title="Vaciar playlist">
          <RotateCcw size={13} />
          <span>Limpiar</span>
        </button>

        <button
          className="btn-tool"
          onClick={() => xmlFileInputRef.current?.click()}
          title="Cargar lista desde archivo XML o JSON directamente a la emisión"
        >
          <FolderOpen size={13} />
          <span>Cargar XML</span>
        </button>

        {onToggleLoop && (
          <button
            type="button"
            className={`btn-tool ${loop ? 'primary' : ''}`}
            onClick={onToggleLoop}
            title={loop ? "Bucle continuo activo (24/7): al finalizar la lista se reinicia automáticamente" : "Bucle inactivo: la emisión se detiene al finalizar el último elemento"}
            style={{
              background: loop ? 'rgba(59, 130, 246, 0.2)' : undefined,
              color: loop ? 'var(--color-primary)' : undefined,
              borderColor: loop ? 'rgba(59, 130, 246, 0.5)' : undefined
            }}
          >
            <Repeat size={13} />
            <span>{loop ? 'Bucle: ON' : 'Bucle: OFF'}</span>
          </button>
        )}

        <input
          ref={xmlFileInputRef}
          type="file"
          accept=".xml,.json,application/xml,text/xml,application/json"
          style={{ display: 'none' }}
          onChange={handleImportXml}
        />

      </div>
    </div>
  );
};
