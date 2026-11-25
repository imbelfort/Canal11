import { useEffect, useState } from 'react';
import { Play, RefreshCw, Upload } from 'lucide-react';
import { WorkspaceDialog } from '../Common/WorkspaceDialog';
import { ScreenVisitCount } from '../Common/ScreenVisitCount';
import { bmsApi } from '../../services/bmsApi';
import { requestJson } from '../../services/api/client';
import { mediaHeaders, qualityLabels, uploadCatalogVideo, uploadProgressLabel, type MediaQuality } from '../../services/parrillaMedia';

interface QualityFile {
  id: number;
  titulo: string;
  ruta: string;
  duracion_ms: number;
  qc: MediaQuality | null;
  programa: { titulo: string } | null;
  program_titles?: string[];
  spots: { id: number; titulo_spot: string }[];
}

export function ContenidosQCView() {
  const [programs, setPrograms] = useState<{ id: number; titulo: string }[]>([]);
  const [files, setFiles] = useState<QualityFile[]>([]);
  const [program, setProgram] = useState('');
  const [uploadProgram, setUploadProgram] = useState('');
  const [ingestOpen, setIngestOpen] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [query, setQuery] = useState('');
  const [preview, setPreview] = useState<QualityFile | null>(null);
  const [revision, setRevision] = useState(0);
  const [busy, setBusy] = useState('');
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState('');
  const [programError, setProgramError] = useState('');
  const [fileError, setFileError] = useState('');

  useEffect(() => {
    let active = true;
    bmsApi.getProgramas().then(data => { if (active) setPrograms(data); })
      .catch(err => { if (active) setProgramError(err.message); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams();
      if (program) params.set('program_id', program);
      if (query.trim()) params.set('q', query.trim());
      requestJson<QualityFile[]>(`/api/parrilla/qc?${params}`, { headers: mediaHeaders(), signal: controller.signal })
        .then(data => { if (!controller.signal.aborted) { setFiles(data); setFileError(''); } })
        .catch(err => { if (!controller.signal.aborted) setFileError(err.message); });
    }, 160);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [program, query, revision]);

  const upload = async () => {
    if (!pendingFiles.length || !uploadProgram || busy) return;
    setError('');
    setFeedback('');
    let uploaded = 0;
    let approved = 0;
    try {
      for (const file of pendingFiles) {
        const saved = await uploadCatalogVideo(file, Number(uploadProgram), progress =>
          setBusy(uploadProgressLabel(progress, file.name)));
        uploaded++;
        if (saved.qc?.status === 'APROBADO_TECNICO') approved++;
        setPendingFiles(previous => previous.slice(1));
      }
      setProgram(uploadProgram);
      setQuery('');
      setIngestOpen(false);
      setFeedback(`Guardados: ${uploaded}. Aprobados: ${approved}. Para revisar: ${uploaded - approved}.`);
    } catch (err) {
      setError(uploaded ? `Se guardaron ${uploaded} archivos. ${(err as Error).message}` : (err as Error).message);
    } finally {
      setRevision(value => value + 1);
      setBusy('');
    }
  };

  const analyze = async (file: QualityFile) => {
    setBusy(`Analizando ${file.titulo}…`);
    setError('');
    setFeedback('');
    try {
      const updated = await requestJson<QualityFile>(`/api/parrilla/qc/${file.id}`, { method: 'POST', headers: mediaHeaders(), signal: AbortSignal.timeout(35_000) });
      setFiles(previous => previous.map(item => item.id === updated.id ? { ...item, ...updated } : item));
      setFeedback(`${file.titulo}: ${updated.qc ? qualityLabels[updated.qc.status] : 'Sin análisis'}.`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy('');
    }
  };

  return (
    <div className="bms-container">
      <div className="bms-content-area">
        <section className="bms-card quality-view">
          <header className="program-catalog-header">
            <div><h1>Catálogo de archivos</h1><p className="bms-text-muted">{files.length} archivos en la vista · {programs.length} programas</p></div>
            <div className="operations-actions">
              <ScreenVisitCount screen="contenidos:qc" />
              <button type="button" className="parrilla-primary" aria-haspopup="dialog" onClick={() => {
                setUploadProgram(program);
                setPendingFiles([]);
                setError('');
                setIngestOpen(true);
              }} disabled={Boolean(busy)}><Upload size={16} /> Ingestar videos</button>
            </div>
          </header>
          <p className="bms-text-muted">Asocia clips a un programa y revisa su control técnico antes de programarlos en Parrilla.</p>
          {(!ingestOpen && (error || fileError || programError)) && <p className="operations-error" role="alert">{error || fileError || programError}</p>}
          {!ingestOpen && (busy || feedback) && <p role="status">{busy || feedback}</p>}
          <div className="quality-toolbar">
            <label className="bms-form-group">Buscar archivo<input type="search" maxLength={150} value={query} onChange={event => setQuery(event.target.value)} /></label>
            <label className="bms-form-group">Filtrar por programa
              <select value={program} onChange={event => setProgram(event.target.value)}>
                <option value="">Todos los programas</option>
                {programs.map(item => <option key={item.id} value={item.id}>{item.titulo}</option>)}
              </select>
            </label>
          </div>
          {files.length ? <ul className="quality-files">
            {files.map(file => {
              const analysis = file.qc;
              const programsForFile = file.program_titles?.join(', ') || file.programa?.titulo;
              return (
                <li key={file.id}>
                  <div>
                    <strong>{file.titulo}</strong>
                    {programsForFile && <small>Programa · {programsForFile}</small>}
                    {file.spots.length > 0 && <small>Spot · {file.spots.map(spot => spot.titulo_spot).join(', ')}</small>}
                    <span className="audit-status" data-state={analysis?.status === 'APROBADO_TECNICO' ? 'EMITIDO_CORRECTO' : undefined}>
                      {analysis ? qualityLabels[analysis.status] : 'Sin análisis'}
                    </span>
                    {analysis?.video && <small>{analysis.video.width} × {analysis.video.height} · {analysis.video.codec_name?.toUpperCase()} · {(file.duracion_ms / 1000).toFixed(1)} s</small>}
                    {analysis?.status === 'APROBADO_TECNICO' && <small>{analysis.audio ? `Audio ${analysis.audio.codec_name?.toUpperCase()} · ${analysis.audio.channels} canales · ${analysis.audio.sample_rate} Hz` : 'Sin pista de audio'}</small>}
                    {analysis?.issues?.length ? <small>{analysis.issues.join(' ')}</small> : null}
                  </div>
                  <div className="operations-actions">
                    <button type="button" onClick={() => setPreview(file)}><Play size={15} /> Ver</button>
                    <button type="button" disabled={Boolean(busy)} onClick={() => void analyze(file)}><RefreshCw size={15} /> {analysis ? 'Reanalizar' : 'Analizar'}</button>
                  </div>
                </li>
              );
            })}
          </ul> : <p>No hay archivos que mostrar. Puedes subir un video o cambiar el filtro.</p>}
        </section>
        {ingestOpen && <WorkspaceDialog title="Ingesta de videos (CU4)" description="Elige el programa y los archivos. El control técnico se ejecuta al guardarlos." busy={Boolean(busy)} onClose={() => setIngestOpen(false)}>
          <form className="workspace-dialog-body quality-ingest" onSubmit={event => { event.preventDefault(); void upload(); }}>
            <label className="bms-form-group">Programa
              <select value={uploadProgram} required disabled={Boolean(busy)} onChange={event => setUploadProgram(event.target.value)}>
                <option value="">Selecciona un programa</option>
                {programs.map(item => <option key={item.id} value={item.id}>{item.titulo}</option>)}
              </select>
            </label>
            {!programs.length && <p>Registra el programa en Programas (CU2) para poder asociarle videos.</p>}
            <label className="operations-upload"><Upload size={16} /> Seleccionar videos
              <input type="file" aria-label="Seleccionar videos" accept="video/mp4,video/webm,video/ogg,.ogv" multiple disabled={Boolean(busy)} onChange={event => {
                const selected = Array.from(event.currentTarget.files ?? []);
                event.currentTarget.value = '';
                if (selected.length) setPendingFiles(selected);
              }} />
            </label>
            <small>Formatos para playout web: MP4, WebM y Ogg.</small>
            {pendingFiles.length > 0 && <ul>{pendingFiles.map((file, index) => <li key={`${file.name}-${index}`}>{file.name}</li>)}</ul>}
            {busy && <p role="status">{busy}</p>}
            {error && <p className="operations-error" role="alert">{error}</p>}
            <div className="operations-actions"><button type="submit" className="parrilla-primary" disabled={Boolean(busy) || !uploadProgram || !pendingFiles.length}>Ingestar y analizar</button></div>
          </form>
        </WorkspaceDialog>}
        {preview && <WorkspaceDialog title={preview.titulo} onClose={() => setPreview(null)}>
          <div className="workspace-dialog-body"><video className="workspace-video" controls playsInline src={preview.ruta} preload="metadata" /></div>
        </WorkspaceDialog>}
      </div>
    </div>
  );
}
