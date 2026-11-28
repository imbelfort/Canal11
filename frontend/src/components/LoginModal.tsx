import { useState, type FormEvent } from 'react';
import { AlertCircle, ArrowRight, CalendarDays, Check, Eye, EyeOff, Film, LockKeyhole, ShieldCheck, UserRound } from 'lucide-react';
import { bmsApi } from '../services/bmsApi';
import type { UserSession } from '../context/PreferencesContext';
import { useToast } from '../context/ToastContext';
import '../styles/login.css';

const demoAccounts = import.meta.env.DEV ? [
  { label: 'Administración', description: 'Usuarios y auditoría', username: 'admin', password: 'admin123', icon: ShieldCheck },
  { label: 'Programación', description: 'Parrilla y pautas', username: 'programador', password: 'prog123', icon: CalendarDays },
  { label: 'Contenidos', description: 'Archivos y calidad', username: 'contenidos', password: 'cont123', icon: Film },
] : [];

export function LoginModal({ onLoginSuccess }: { onLoginSuccess: (user: UserSession) => void }) {
  const notify = useToast();
  const [selectedRole, setSelectedRole] = useState('');
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const fillAccount = (account: (typeof demoAccounts)[number]) => {
    setSelectedRole(account.username);
    setLogin(account.username);
    setPassword(account.password);
    setShowPassword(false);
    setError('');
  };

  const editCredentials = () => {
    setSelectedRole('');
    setError('');
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (loading) return;
    setError('');
    setLoading(true);

    try {
      const result = await bmsApi.login(login.trim(), password);
      if (!result.success) {
        const message = result.message || 'Revisa el usuario y la contraseña.';
        setError(message);
        notify(message, 'error');
        return;
      }

      localStorage.setItem('playout_token', result.token);
      localStorage.setItem('playout_user', JSON.stringify(result.usuario));
      onLoginSuccess(result.usuario);
      notify('Sesión iniciada.');
    } catch {
      const message = 'No se pudo conectar con Canal 11. Intenta de nuevo.';
      setError(message);
      notify(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="operations-login">
      <section className={`login-card${demoAccounts.length ? ' login-card-with-demo' : ''}`} aria-labelledby="login-title">
        <header className="login-heading">
          <span className="login-mark"><LockKeyhole size={21} aria-hidden="true" /></span>
          <div>
            <h1 id="login-title">Iniciar sesión</h1>
            <p>Accede al sistema de emisión de Canal 11.</p>
          </div>
        </header>

        {demoAccounts.length > 0 && (
          <fieldset className="login-demo" disabled={loading}>
            <legend>Cuentas de prueba</legend>
            <p>Elige un rol para completar los campos.</p>
            {demoAccounts.map(account => {
              const Icon = account.icon;
              const active = selectedRole === account.username;
              return (
                <button key={account.username} type="button" className="login-role" aria-pressed={active}
                  onClick={() => fillAccount(account)}>
                  <Icon size={18} aria-hidden="true" />
                  <span><strong>{account.label}</strong><small>{account.description}</small></span>
                  {active && <Check size={16} aria-hidden="true" />}
                </button>
              );
            })}
          </fieldset>
        )}

        <form className="login-form" onSubmit={handleSubmit} aria-busy={loading}>
          <fieldset disabled={loading}>
            <label htmlFor="login-user">Usuario o correo</label>
            <div className="login-field">
              <UserRound size={17} aria-hidden="true" />
              <input id="login-user" name="username" type="text" autoComplete="username" autoCapitalize="none"
                spellCheck={false} value={login} onChange={event => { setLogin(event.target.value); editCredentials(); }}
                required />
            </div>

            <label htmlFor="login-password">Contraseña</label>
            <div className="login-field">
              <LockKeyhole size={17} aria-hidden="true" />
              <input id="login-password" name="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password"
                value={password} onChange={event => { setPassword(event.target.value); editCredentials(); }} required />
              <button type="button" className="login-reveal" onClick={() => setShowPassword(previous => !previous)}
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {error && <p className="login-error" role="alert"><AlertCircle size={17} aria-hidden="true" /> {error}</p>}

            <button type="submit" className="login-submit" disabled={!login.trim() || !password}>
              {loading ? 'Ingresando…' : 'Entrar al Playout'} <ArrowRight size={18} aria-hidden="true" />
            </button>
          </fieldset>
        </form>
      </section>
    </div>
  );
}
