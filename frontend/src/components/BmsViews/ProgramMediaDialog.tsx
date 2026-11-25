import { useEffect, useState } from 'react';
import { Play } from 'lucide-react';
import { WorkspaceDialog } from '../Common/WorkspaceDialog';
import { MediaDetails } from '../Common/MediaDetails';
import { requestJson } from '../../services/api/client';
import { mediaHeaders, type CatalogFile } from '../../services/parrillaMedia';

export function ProgramMediaDialog({ program, onClose }: { program: { id: number; titulo: string }; onClose: () => void }) {
  const [files, setFiles] = useState<CatalogFile[] | null>(null);
  const [preview, setPreview] = useState<CatalogFile | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    requestJson<CatalogFile[]>(`/api/parrilla/archivos?program_id=${program.id}`, { headers: mediaHeaders(), signal: controller.signal })
      .then(data => { if (!controller.signal.aborted) setFiles(data); })
      .catch(err => { if (!controller.signal.aborted) setError(err.message); });
    return () => controller.abort();
  }, [program.id]);

  return (
    <WorkspaceDialog wide title={`Archivos de ${program.titulo}`} onClose={onClose}>
      <div className="workspace-dialog-body">
        {error ? <p className="operations-error" role="alert">{error}</p> : files === null ? <p role="status">Cargando archivos…</p> : !files.length ? <p>Contenidos todavía no ha asociado archivos a este programa.</p> : (
          <ul className="program-media-list">
            {files.map(file => (
              <li key={file.id}>
                <div className="program-media-heading">
                  <strong>{file.titulo}</strong>
                  {/^(?:https?:\/\/|\/(?!\/))/i.test(file.ruta ?? '') && <div className="operations-actions">
                    <button type="button" onClick={() => setPreview(file)}><Play size={15} /> Vista previa</button>
                  </div>}
                </div>
                <MediaDetails file={file} />
              </li>
            ))}
          </ul>
        )}
      </div>
      {preview && <WorkspaceDialog title={preview.titulo} onClose={() => setPreview(null)}>
        <div className="workspace-dialog-body"><video className="workspace-video" src={preview.ruta} controls playsInline preload="metadata" /></div>
      </WorkspaceDialog>}
    </WorkspaceDialog>
  );
}
