import { useEffect, useState } from 'react';
import { CheckCircle2, Play, RefreshCw, Upload } from 'lucide-react';
import { WorkspaceDialog } from '../Common/WorkspaceDialog';
import { ScreenVisitCount } from '../Common/ScreenVisitCount';
import { bmsApi } from '../../services/bmsApi';
import { requestJson } from '../../services/api/client';
import { type AnalysisProgress, type UploadProgress, mediaHeaders, qualityLabels, reanalyzeCatalogVideo, uploadCatalogVideo, type MediaQuality } from '../../services/parrillaMedia';

interface QualityFile {
  id: number;
  titulo: string;
  ruta: string;
  duracion_ms: number;
  qc: MediaQuality | null;
  programa: { id: number; titulo: string } | null;
  spots: { id: number; titulo_spot: string }[];
}

interface UploadResult {
  name: string;
  status: string;
  detail?: string;
}

const megabytes = (value: number) => (value / 1_000_000).toFixed(2);
const metric = (value?: number | string | null) =>
  value && Number(value) > 0 ? `${(Number(value) / 1_000_000).toFixed(2)} Mbps` : '—';

const analysisMessages: Record<AnalysisProgress['stage'], string> = {
  starting: 'Iniciando revisión',
  checking: 'Buscando el archivo',
  reading: 'Revisando el video y el audio',
  saving: 'Guardando el resultado',
};

function QualityProgress({ title, percent, message }: { title: string; percent: number | null; message: string }) {
  return (
    <div className="quality-progress">
      <div className="quality-progress-heading" role="status">
        <strong>{title}</strong>
        {percent !== null && <span>{percent}%</span>}
      </div>
      <progress max={100} value={percent ?? undefined} aria-label={title} />
      <small>{message}</small>
    </div>
  );
}

export function ContenidosQCView() {
  const [programs, setPrograms] = useState<{ id: number; titulo: string }[]>([]);
  const [files, setFiles] = useState<QualityFile[]>([]);
  const [program, setProgram] = useState('');
  const [uploadProgram, setUploadProgram] = useState('');
  const [ingestOpen, setIngestOpen] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const [results, setResults] = useState<UploadResult[]>([]);
  const [query, setQuery] = useState('');
  const [linkFile, setLinkFile] = useState<QualityFile | null>(null);
  const [linkProgram, setLinkProgram] = useState('');
  const [linkSaving, setLinkSaving] = useState(false);
  const [linkError, setLinkError] = useState('');
  const [preview, setPreview] = useState<QualityFile | null>(null);
  const [revision, setRevision] = useState(0);
  const [busy, setBusy] = useState('');
  const [analysisProgress, setAnalysisProgress] = useState<{ id: number; progress: AnalysisProgress } | null>(null);
  const [analysisResult, setAnalysisResult] = useState<{ id: number; error: boolean; message: string } | null>(null);
  const operationInProgress = Boolean(busy || analysisProgress);
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
    if (!pendingFiles.length || !uploadProgram || operationInProgress) return;
    setError('');
    setFeedback('');
    const currentResults: UploadResult[] = [];
    const programId = uploadProgram === 'spot' ? null : Number(uploadProgram);
    try {
      for (const file of pendingFiles) {
        try {
          const saved = await uploadCatalogVideo(file, programId, progress => {
            setUploadProgress(progress);
            setBusy(file.name);
          });
          const result = {
            name: file.name,
            status: saved.qc ? qualityLabels[saved.qc.status] : 'Guardado',
            detail: saved.qc?.issues.join(' '),
          };
          currentResults.push(result);
          setPendingFiles(previous => previous.slice(1));
          setResults(previous => [...previous, result]);
        } catch (err) {
          setError(`${file.name}: ${(err as Error).message}`);
          break;
        }
      }
      if (currentResults.length) {
        setProgram(programId ? String(programId) : '');
        setQuery('');
        const approved = currentResults.filter(result => result.status === qualityLabels.APROBADO_TECNICO).length;
        const rejected = currentResults.filter(result => result.status === qualityLabels.OBSERVADO).length;
        setFeedback(`Guardados: ${currentResults.length}. Aprobados: ${approved}. Rechazados: ${rejected}. Pendientes: ${currentResults.length - approved - rejected}.`);
      }
    } finally {
      setRevision(value => value + 1);
      setBusy('');
      setUploadProgress(null);
    }
  };

  const analyze = async (file: QualityFile) => {
    if (operationInProgress) return;
    setAnalysisResult(null);
    setAnalysisProgress({ id: file.id, progress: { percent: 0, stage: 'starting' } });
    try {
      const updated = await reanalyzeCatalogVideo<QualityFile>(file.id, progress => setAnalysisProgress({ id: file.id, progress }));
      setFiles(previous => previous.map(item => item.id === updated.id ? { ...item, ...updated } : item));
      setAnalysisResult({ id: file.id, error: false, message: `Revisión completa · 100% · ${updated.qc ? qualityLabels[updated.qc.status] : 'Sin resultado'}` });
    } catch (err) {
      setAnalysisResult({ id: file.id, error: true, message: (err as Error).message });
    } finally {
      setAnalysisProgress(null);
    }
  };

  const saveLink = async () => {
    if (!linkFile || linkSaving) return;
    setLinkSaving(true);
    setLinkError('');
    try {
      const updated = await requestJson<QualityFile>(`/api/parrilla/archivos/${linkFile.id}/programa`, {
        method: 'PUT',
        headers: { ...mediaHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ program_id: linkProgram ? Number(linkProgram) : null }),
      });
      setFiles(previous => previous.flatMap(file => file.id !== updated.id ? [file]
        : !program || String(updated.programa?.id) === program ? [updated] : []));
      setFeedback(updated.programa ? `Archivo vinculado a ${updated.programa.titulo}.` : 'Archivo desvinculado y conservado en MAM.');
      setError('');
      setLinkFile(null);
    } catch (err) {
      setLinkError((err as Error).message);
    } finally {
      setLinkSaving(false);
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
                setResults([]);
                setFeedback('');
                setError('');
                setIngestOpen(true);
              }} disabled={operationInProgress}><Upload size={16} /> Ingestar videos</button>
            </div>
          </header>
          <p className="bms-text-muted">Asocia clips a un programa y revisa su control técnico antes de programarlos en Parrilla.</p>
          {(!ingestOpen && (error || fileError || programError)) && <p className="operations-error" role="alert">{error || fileError || programError}</p>}
          {!ingestOpen && feedback && <p role="status">{feedback}</p>}
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
              const checking = analysisProgress?.id === file.id ? analysisProgress.progress : null;
              const programsForFile = file.programa?.titulo;
              return (
                <li key={file.id}>
                  <div>
                    <strong>{file.titulo}</strong>
                    <small>{programsForFile ? `Programa · ${programsForFile}` : 'Sin programa'}</small>
                    {file.spots.length > 0 && <small>Spot · {file.spots.map(spot => spot.titulo_spot).join(', ')}</small>}
                    <span className="audit-status" data-state={analysis?.status === 'APROBADO_TECNICO' ? 'EMITIDO_CORRECTO' : analysis?.status === 'OBSERVADO' ? 'FALLA_TECNICA' : undefined}>
                      {analysis ? qualityLabels[analysis.status] : 'Sin análisis'}
                    </span>
                    <dl className="quality-metadata">
                      <div><dt>Ruta</dt><dd><a href={file.ruta} target="_blank" rel="noreferrer">{file.ruta}</a></dd></div>
                      <div><dt>Formato</dt><dd>{analysis?.extension?.toUpperCase() || file.ruta.split('.').pop()?.toUpperCase() || '—'}{analysis?.video?.codec_name ? ` / ${analysis.video.codec_name.toUpperCase()}` : ''}</dd></div>
                      <div><dt>Resolución</dt><dd>{analysis?.video?.width && analysis.video.height ? `${analysis.video.width} × ${analysis.video.height}` : '—'}</dd></div>
                      <div><dt>Duración</dt><dd>{file.duracion_ms ? `${(file.duracion_ms / 1000).toFixed(1)} s` : '—'}</dd></div>
                      <div><dt>Tamaño</dt><dd>{analysis?.size_bytes ? `${megabytes(analysis.size_bytes)} MB` : '—'}</dd></div>
                      <div><dt>Bitrate de video</dt><dd>{metric(analysis?.video?.bit_rate)}</dd></div>
                      <div><dt>Bitrate total</dt><dd>{metric(analysis?.bit_rate)}</dd></div>
                      <div><dt>Audio</dt><dd>{analysis?.audio ? `${analysis.audio.codec_name?.toUpperCase()} · ${analysis.audio.channels ?? '—'} canales` : analysis?.video ? 'Sin pista' : '—'}</dd></div>
                    </dl>
                    {analysis?.issues?.length ? <small><strong>Observación:</strong> {analysis.issues.join(' ')}</small> : null}
                  </div>
                  <div className="operations-actions">
                    <button type="button" disabled={operationInProgress} onClick={() => {
                      setLinkProgram(file.programa ? String(file.programa.id) : '');
                      setLinkError('');
                      setLinkFile(file);
                    }}>Cambiar programa</button>
                    <button type="button" onClick={() => setPreview(file)}><Play size={15} /> Ver</button>
                    <button type="button" disabled={operationInProgress} onClick={() => void analyze(file)}><RefreshCw size={15} /> {checking ? 'Revisando…' : analysis ? 'Reanalizar' : 'Analizar'}</button>
                  </div>
                  {checking && <QualityProgress percent={checking.percent} title={analysisMessages[checking.stage]} message="Avance por etapas de la revisión." />}
                  {analysisResult?.id === file.id && <p className={analysisResult.error ? 'operations-error' : 'quality-complete'} role={analysisResult.error ? 'alert' : 'status'}>
                    {!analysisResult.error && <CheckCircle2 size={16} aria-hidden="true" />} {analysisResult.message}
                  </p>}
                </li>
              );
            })}
          </ul> : <p>No hay archivos que mostrar. Puedes subir un video o cambiar el filtro.</p>}
        </section>
        {ingestOpen && <WorkspaceDialog title="Ingesta de videos (CU4)" description="Elige el programa y los archivos. El control técnico se ejecuta al guardarlos." busy={Boolean(busy)} onClose={() => setIngestOpen(false)}>
          <form className="workspace-dialog-body quality-ingest" onSubmit={event => { event.preventDefault(); void upload(); }}>
            <label className="bms-form-group">Destino
              <select value={uploadProgram} required disabled={Boolean(busy)} onChange={event => setUploadProgram(event.target.value)}>
                <option value="">Selecciona un destino</option>
                <option value="spot">Spot (sin programa)</option>
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
            <div className="operations-actions"><button type="submit" className="parrilla-primary" disabled={Boolean(busy) || !uploadProgram || !pendingFiles.length}>
              {uploadProgress?.phase === 'qc' ? 'Revisando video…' : busy ? 'Subiendo video…' : 'Ingestar y analizar'}
            </button></div>
            {uploadProgress?.phase === 'upload' && <QualityProgress title="Subiendo video" percent={uploadProgress.percent} message={busy} />}
            {uploadProgress?.phase === 'qc' && <QualityProgress title="Revisando el video" percent={null} message={`Subida completa (100%). Revisando: ${busy}`} />}
            {pendingFiles.length > 0 && !busy && <ul>{pendingFiles.map((file, index) => <li key={`${file.name}-${index}`}>{file.name}</li>)}</ul>}
            {!busy && feedback && <p role="status">{feedback}</p>}
            {results.length > 0 && <ul className="quality-upload-results" aria-label="Resultados de la ingesta">
              {results.map((result, index) => <li key={`${result.name}-${index}`}>
                <strong>{result.name}</strong> · {result.status}
                {result.detail && <small>Observación: {result.detail}</small>}
              </li>)}
            </ul>}
            {error && <p className="operations-error" role="alert">{error}</p>}
          </form>
        </WorkspaceDialog>}
        {linkFile && <WorkspaceDialog title="Vínculo con programa" description={linkFile.titulo} busy={linkSaving} onClose={() => setLinkFile(null)}>
          <form className="workspace-dialog-body quality-ingest" onSubmit={event => { event.preventDefault(); void saveLink(); }}>
            <label className="bms-form-group">Programa
              <select value={linkProgram} disabled={linkSaving} onChange={event => setLinkProgram(event.target.value)}>
                <option value="">Sin programa (conservar en MAM)</option>
                {programs.map(item => <option key={item.id} value={item.id}>{item.titulo}</option>)}
              </select>
            </label>
            <small>El video sigue disponible en MAM. Los bloques ya guardados conservan su archivo.</small>
            {linkError && <p className="operations-error" role="alert">{linkError}</p>}
            <div className="operations-actions">
              <button type="submit" className="parrilla-primary" disabled={linkSaving || linkProgram === (linkFile.programa ? String(linkFile.programa.id) : '')}>
                {linkSaving ? 'Guardando…' : linkProgram ? 'Guardar vínculo' : 'Desvincular'}
              </button>
            </div>
          </form>
        </WorkspaceDialog>}
        {preview && <WorkspaceDialog title={preview.titulo} onClose={() => setPreview(null)}>
          <div className="workspace-dialog-body"><video className="workspace-video" controls playsInline src={preview.ruta} preload="metadata" /></div>
        </WorkspaceDialog>}
      </div>
    </div>
  );
}
