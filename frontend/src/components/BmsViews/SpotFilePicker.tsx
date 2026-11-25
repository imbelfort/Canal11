import { useEffect, useState } from 'react';
import { WorkspaceDialog } from '../Common/WorkspaceDialog';
import { searchCatalogVideos, type CatalogFile } from '../../services/parrillaMedia';

export function SpotFilePicker({ onSelect, onClose }: {
  onSelect: (file: CatalogFile) => Promise<void>;
  onClose: () => void;
}) {
  const [query, setQuery] = useState('');
  const [files, setFiles] = useState<CatalogFile[]>([]);
  const [searching, setSearching] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      searchCatalogVideos(query, controller.signal).then(result => {
        if (controller.signal.aborted) return;
        setFiles(result.filter(file => file.id.startsWith('archivo:') && file.qc?.status === 'APROBADO_TECNICO'));
        setError('');
      }).catch(err => {
        if (!controller.signal.aborted) setError(err.message);
      }).finally(() => {
        if (!controller.signal.aborted) setSearching(false);
      });
    }, 160);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [query]);

  const choose = async (file: CatalogFile) => {
    setSaving(true);
    try {
      await onSelect(file);
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <WorkspaceDialog title="Elegir video aprobado" description="Contenidos realiza la ingesta y el control de calidad." busy={saving} onClose={onClose}>
      <div className="workspace-dialog-body">
        <label className="bms-form-group">Buscar archivo
          <input type="search" disabled={saving} value={query} onChange={event => { setSearching(true); setQuery(event.target.value); }} />
        </label>
        {error && <p className="operations-error" role="alert">{error}</p>}
        {searching ? <p role="status">Buscando…</p> : files.length ? <ul className="parrilla-catalog">
          {files.map(file => (
            <li key={file.id}>
              <span>{file.titulo}<small>{(file.duracion_ms / 1000).toFixed(1)} s</small></span>
              <button className="bms-btn-secondary" type="button" disabled={saving} onClick={() => void choose(file)}>Usar archivo</button>
            </li>
          ))}
        </ul> : <p>No hay archivos aprobados que coincidan.</p>}
      </div>
    </WorkspaceDialog>
  );
}
