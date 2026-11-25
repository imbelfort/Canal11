import { useState } from 'react';
import { Clock, Layers, ListVideo, LogOut, Sliders, FileSpreadsheet } from 'lucide-react';
import { AuditView } from './components/Audit/AuditView';
import { ParrillaView } from './components/Playlist/ParrillaView';
import { ScreenVisitCount } from './components/Common/ScreenVisitCount';
import { ErrorBoundary } from './components/Common/ErrorBoundary';
import { LoginModal } from './components/LoginModal';
import { PreferencesModal } from './components/PreferencesModal';
import { RoleBasedPlayoutView } from './components/RoleBasedPlayoutView';
import { usePreferences } from './context/PreferencesContext';
import './styles/parrilla.css';

export function App() {
  const { user, setUser, logout } = usePreferences();
  const [screen, setScreen] = useState<'parrilla' | 'bms' | 'audit'>('parrilla');
  const [preferences, setPreferences] = useState(false);

  return (
    <div className="operations-shell">
      <header className="operations-header">
        <div className="operations-brand"><strong>Canal 11</strong>{user && <small>{user.nombre} · {user.rol_principal}</small>}</div>
        {user && <nav aria-label="Pantallas principales">
          <button aria-pressed={screen === 'parrilla'} onClick={() => setScreen('parrilla')}><ListVideo size={16} /> Parrilla</button>
          <button aria-pressed={screen === 'bms'} onClick={() => setScreen('bms')}><Layers size={16} /> Gestión BMS</button>
          <button aria-pressed={screen === 'audit'} onClick={() => setScreen('audit')}><FileSpreadsheet size={16} /> Bitácora</button>
        </nav>}
        <div className="operations-actions">
          <ScreenVisitCount screen={user ? screen : 'login'} />
          <button onClick={() => setPreferences(true)}><Sliders size={16} /> Apariencia</button>
          {user && <button onClick={() => { setScreen('parrilla'); logout(); }}><LogOut size={16} /> Salir</button>}
        </div>
      </header>
      <main className="operations-main">
        {!user && <LoginModal onLoginSuccess={setUser} />}
        {user && <section hidden={screen !== 'parrilla'} className="operations-screen">
          <ErrorBoundary moduleName="Parrilla">
            <ParrillaView visible={screen === 'parrilla'} />
          </ErrorBoundary>
        </section>}
        {user && screen === 'bms' && (
          <section className="operations-screen">
            <ErrorBoundary moduleName="Gestión BMS">
              <RoleBasedPlayoutView onOpenParrilla={() => setScreen('parrilla')} />
            </ErrorBoundary>
          </section>
        )}
        {user && screen === 'audit' && (
          <section className="operations-screen">
            <ErrorBoundary moduleName="Bitácora"><AuditView /></ErrorBoundary>
          </section>
        )}
      </main>
      <footer className="operations-footer"><Clock size={13} /> Horarios de Bolivia (UTC-4)</footer>
      <PreferencesModal isOpen={preferences} onClose={() => setPreferences(false)} />
    </div>
  );
}
