import { useEffect, useState, type FormEvent } from 'react';
import { useToast } from '../../context/ToastContext';
import { bmsApi } from '../../services/bmsApi';
import { WorkspaceDialog } from '../Common/WorkspaceDialog';

interface RegistrationProps {
  onClose: () => void;
  onCreated: () => void;
}

export function OperatorRegistration({ onClose, onCreated }: RegistrationProps) {
  const notify = useToast();
  const [roles, setRoles] = useState<{ id: number; nombre: string }[] | null>(null);
  const [roleError, setRoleError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    bmsApi.getRoles(controller.signal)
      .then(items => { if (!controller.signal.aborted) setRoles(items); })
      .catch(err => { if (!controller.signal.aborted) setRoleError(err.message); });
    return () => controller.abort();
  }, [attempt]);

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (saving || !roles?.length) return;
    const fields = new FormData(event.currentTarget);
    setSaving(true);
    setError('');
    try {
      const result = await bmsApi.createUsuario({
        nombre: String(fields.get('nombre')).trim(),
        apellidos: String(fields.get('apellidos')).trim(),
        ci: String(fields.get('ci')).trim(),
        email: String(fields.get('email')).trim(),
        password: String(fields.get('pass')),
        rol_id: Number(fields.get('rol')),
      });
      if (!result.success) throw new Error(result.message || 'No se pudo registrar el operador.');
      notify('Operador registrado.');
      onCreated();
    } catch (err) {
      const message = (err as Error).message;
      setError(message);
      notify(message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return <WorkspaceDialog title="Nuevo operador" wide busy={saving} onClose={onClose}>
    <form className="workspace-dialog-body" onSubmit={save}>
      <fieldset className="program-editor-fields" disabled={saving}>
        <label className="bms-form-group">Nombres<input name="nombre" autoComplete="given-name" required autoFocus /></label>
        <label className="bms-form-group">Apellidos<input name="apellidos" autoComplete="family-name" required /></label>
        <label className="bms-form-group">Cédula de identidad<input name="ci" required /></label>
        <label className="bms-form-group">Correo institucional<input name="email" type="email" autoComplete="email" required /></label>
        <label className="bms-form-group">Contraseña temporal<input name="pass" type="password" autoComplete="new-password" required /></label>
        <label className="bms-form-group">Rol
          <select name="rol" defaultValue="" required disabled={!roles?.length}>
            <option value="">{!roles && !roleError ? 'Cargando roles…' : 'Selecciona un rol'}</option>
            {roles?.map(role => <option key={role.id} value={role.id}>{role.nombre.replaceAll('_', ' ')}</option>)}
          </select>
        </label>
      </fieldset>
      {roleError && <div className="program-catalog-toolbar">
        <p className="operations-error" role="alert">{roleError}</p>
        <button type="button" className="bms-btn-secondary" onClick={() => { setRoleError(''); setAttempt(value => value + 1); }}>Reintentar roles</button>
      </div>}
      {roles?.length === 0 && <p role="status">No hay roles disponibles en el sistema.</p>}
      {error && <p className="operations-error" role="alert">{error}</p>}
      <div className="program-catalog-toolbar">
        <button type="submit" className="bms-btn-primary" disabled={saving || !roles?.length}>{saving ? 'Guardando…' : 'Registrar operador'}</button>
      </div>
    </form>
  </WorkspaceDialog>;
}

export function ClientRegistration({ onClose, onCreated }: RegistrationProps) {
  const notify = useToast();
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (saving) return;
    const fields = new FormData(event.currentTarget);
    const value = (key: string) => String(fields.get(key) ?? '').trim();
    const company = value('razon');
    setError('');
    setSaving(true);
    try {
      const result = await bmsApi.createCliente({
        razon_social: company,
        nit: value('nit'),
        contacto: value('contacto'),
        email: value('email'),
        telefono: value('tel'),
      });
      if (!result.success) throw new Error(result.message || 'No se pudo registrar el cliente.');
      notify(`Cliente «${company}» agregado.`);
      onCreated();
    } catch (err) {
      const message = (err as Error).message;
      setError(message);
      notify(message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return <WorkspaceDialog title="Nuevo cliente" wide busy={saving} onClose={onClose}>
    <form className="workspace-dialog-body" onSubmit={save}>
      <fieldset className="program-editor-fields" disabled={saving}>
        <label className="bms-form-group">Razón social<input name="razon" autoComplete="organization" required autoFocus /></label>
        <label className="bms-form-group">NIT<input name="nit" required /></label>
        <label className="bms-form-group">Persona de contacto (opcional)<input name="contacto" /></label>
        <label className="bms-form-group">Correo electrónico (opcional)<input name="email" type="email" autoComplete="email" /></label>
        <label className="bms-form-group">Teléfono (opcional)<input name="tel" type="tel" autoComplete="tel" /></label>
      </fieldset>
      {error && <p className="operations-error" role="alert">{error}</p>}
      <div className="program-catalog-toolbar">
        <button type="submit" className="bms-btn-primary" disabled={saving}>{saving ? 'Guardando…' : 'Registrar cliente'}</button>
      </div>
    </form>
  </WorkspaceDialog>;
}
