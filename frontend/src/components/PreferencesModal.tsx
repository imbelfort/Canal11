import { useEffect, useRef } from 'react';
import { Clock, Moon, Sun, X } from 'lucide-react';
import { usePreferences } from '../context/PreferencesContext';

const profiles = [
  { id: 'child', label: 'Niño' },
  { id: 'youth', label: 'Jóvenes' },
  { id: 'adult', label: 'Adulto' },
] as const;

const sizes = [
  { id: 'sm', label: 'Pequeña' },
  { id: 'md', label: 'Mediana' },
  { id: 'lg', label: 'Grande' },
  { id: 'xl', label: 'Muy grande' },
] as const;

const modes = [
  { id: 'light', label: 'Claro', icon: Sun },
  { id: 'dark', label: 'Oscuro', icon: Moon },
  { id: 'auto', label: 'Por horario', icon: Clock },
] as const;

export function PreferencesModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { prefs, updatePreferences } = usePreferences();
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const panel = dialog.current;
    if (isOpen && !panel?.open) panel?.showModal();
    if (!isOpen && panel?.open) panel.close();
  }, [isOpen]);

  return (
    <dialog ref={dialog} className="appearance-dialog" aria-labelledby="appearance-title"
      onCancel={event => { event.preventDefault(); onClose(); }}
      onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="appearance-content">
        <div className="appearance-heading">
          <h2 id="appearance-title">Apariencia</h2>
          <button type="button" aria-label="Cerrar apariencia" onClick={onClose}><X size={18} /></button>
        </div>
        <fieldset>
          <legend>Tema</legend>
          <div className="appearance-options">
            {profiles.map(profile => (
              <button key={profile.id} type="button" aria-pressed={prefs.profile === profile.id}
                onClick={() => updatePreferences({ profile: profile.id })}>
                <span className="appearance-swatch" data-swatch={profile.id} aria-hidden="true" />
                {profile.label}
              </button>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend>Tamaño de letra</legend>
          <div className="appearance-options">
            {sizes.map(size => (
              <button key={size.id} type="button" aria-pressed={prefs.fontSize === size.id}
                onClick={() => updatePreferences({ fontSize: size.id })}>{size.label}</button>
            ))}
          </div>
          <p className="appearance-font-preview">Vista previa del texto de la Parrilla</p>
        </fieldset>
        <fieldset>
          <legend>Contraste</legend>
          <label className="appearance-contrast">
            <input type="checkbox" role="switch" checked={prefs.highContrast}
              onChange={event => updatePreferences({ highContrast: event.target.checked })} />
            Alto contraste
          </label>
        </fieldset>
        <fieldset>
          <legend>Modo de pantalla</legend>
          <div className="appearance-options">
            {modes.map(({ id, label, icon: Icon }) => (
              <button key={id} type="button" aria-pressed={prefs.themeMode === id}
                onClick={() => updatePreferences({ themeMode: id })}><Icon size={16} /> {label}</button>
            ))}
          </div>
          {prefs.themeMode === 'auto' && (
            <div className="appearance-schedule">
              <label>Oscuro desde<input type="time" value={prefs.darkFrom}
                onChange={event => { if (event.target.value) updatePreferences({ darkFrom: event.target.value }); }} /></label>
              <label>Hasta<input type="time" value={prefs.darkUntil}
                onChange={event => { if (event.target.value) updatePreferences({ darkUntil: event.target.value }); }} /></label>
              <small>Hora de Bolivia (UTC−4){prefs.darkFrom === prefs.darkUntil && ' · Oscuro todo el día'}</small>
            </div>
          )}
        </fieldset>
      </div>
    </dialog>
  );
}
