import { useEffect, useState } from 'react';
import { WorkspaceDialog } from '../Common/WorkspaceDialog';
import { requestJson } from '../../services/api/client';
import { mediaHeaders } from '../../services/parrillaMedia';
import { useToast } from '../../context/ToastContext';

interface ValidationResult {
  pending: number;
  errors: string[];
  warnings: string[];
}

export function ParrillaValidationDialog({ onClose }: { onClose: () => void }) {
  const notify = useToast();
  const [result, setResult] = useState<ValidationResult | null>(null);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    requestJson<ValidationResult>('/api/parrilla/validacion', { headers: mediaHeaders(), signal: controller.signal })
      .then(data => {
        if (controller.signal.aborted) return;
        setResult(data);
        const errors = data.errors.length;
        const warnings = data.warnings.length;
        const findings = errors + warnings;
        notify(findings ? `Parrilla revisada · ${errors} ${errors === 1 ? 'error' : 'errores'} y ${warnings} ${warnings === 1 ? 'aviso' : 'avisos'}.` : 'Parrilla revisada sin hallazgos.',
          findings ? 'warning' : 'success');
      })
      .catch(err => { if (!controller.signal.aborted) { setError(err.message); notify(err.message, 'error'); } });
    return () => controller.abort();
  }, [notify, revision]);

  return (
    <WorkspaceDialog title="Validar Parrilla de hoy" description="Comprueba los bloques pendientes, sus archivos y los cruces de horario." onClose={onClose}>
      <div className="workspace-dialog-body parrilla-validation">
        {error && <p className="operations-error" role="alert">{error}</p>}
        {!result && !error && <p role="status">Revisando la Parrilla…</p>}
        {result && <>
          <p role="status"><strong>{!result.pending ? 'No hay emisiones pendientes.' : result.errors.length
            ? 'Hay problemas que debes corregir.' : 'Los bloques pendientes pasaron la revisión.'}</strong> {result.pending} elementos pendientes.</p>
          {result.errors.length > 0 && <>
            <h3>Problemas</h3><ul>{result.errors.map((item, index) => <li key={index}>{item}</li>)}</ul>
          </>}
          {result.warnings.length > 0 && <>
            <h3>Avisos</h3><ul>{result.warnings.map((item, index) => <li key={index}>{item}</li>)}</ul>
          </>}
        </>}
        {(result || error) && <div className="operations-actions">
          <button type="button" onClick={() => { setResult(null); setError(''); setRevision(value => value + 1); }}>Volver a validar</button>
        </div>}
      </div>
    </WorkspaceDialog>
  );
}
