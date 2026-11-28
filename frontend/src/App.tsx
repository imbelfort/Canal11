import { useState } from 'react';
import { Clock, Layers, ListVideo, LogOut, Sliders, FileSpreadsheet } from 'lucide-react';
import { AuditView } from './components/Audit/AuditView';
import { ParrillaView } from './components/Playlist/ParrillaView';
import { BoliviaClock } from './components/Common/BoliviaClock';
import { ScreenVisitCount } from './components/Common/ScreenVisitCount';
import { GlobalSearch } from './components/Common/GlobalSearch';
import { ErrorBoundary } from './components/Common/ErrorBoundary';
import { LoginModal } from './components/LoginModal';
import { PreferencesModal } from './components/PreferencesModal';
import { RoleBasedPlayoutView } from './components/RoleBasedPlayoutView';
import { usePreferences } from './context/PreferencesContext';
import { availableBmsAreas, bmsHome, type BmsDestination, type SearchTarget } from './navigation';
import './styles/parrilla.css';

export function App() {
  const { user, setUser, logout, updatePreferences } = usePreferences();
  const [screen, setScreen] = useState<'parrilla' | 'bms' | 'audit'>('parrilla');
  const [preferences, setPreferences] = useState(false);
  const [destination, setDestination] = useState<BmsDestination | null>(null);
  const areas = availableBmsAreas(user?.roles ?? []);
  const defaultArea = areas[0];
  const currentDestination = destination && areas.includes(destination.area) ? destination : defaultArea && bmsHome[defaultArea];
  const stripeReturn = new URLSearchParams(window.location.search).get('stripe');

  const go = (target: SearchTarget) => {
    switch (target.screen) {
      case 'theme':
        updatePreferences({ themeMode: target.mode });
        break;
      case 'preferences':
        setPreferences(true);
        break;
      case 'bms':
        if (areas.includes(target.destination.area)) {
          setDestination(target.destination);
          setScreen('bms');
        }
        break;
      default:
        setScreen(target.screen);
    }
  };

  if (stripeReturn === 'return' || stripeReturn === 'cancel') {
    return <main className="operations-main">
      <section className="operations-panel">
        <h1>{stripeReturn === 'return' ? 'Gracias por completar el proceso en Stripe' : 'Volviste desde Stripe Checkout'}</h1>
        <p>Canal 11 comprobará el estado del cobro directamente con Stripe.</p>
        <a href={window.location.pathname}>Volver a Canal 11</a>
      </section>
    </main>;
  }

  return (
    <div className="operations-shell">
      <header className="operations-header">
        <div className="operations-brand"><strong>Canal 11</strong>{user && <small>{user.nombre} · {user.rol_principal}</small>}</div>
        {user && <nav aria-label="Pantallas principales">
          <button aria-pressed={screen === 'parrilla'} onClick={() => setScreen('parrilla')}><ListVideo size={16} /> Parrilla</button>
          {currentDestination && <button aria-pressed={screen === 'bms'} onClick={() => setScreen('bms')}><Layers size={16} /> Gestión BMS</button>}
          <button aria-pressed={screen === 'audit'} onClick={() => setScreen('audit')}><FileSpreadsheet size={16} /> As a Run</button>
        </nav>}
        {user && <GlobalSearch areas={areas} onSelect={go} />}
        <div className="operations-actions">
          <BoliviaClock />
          <button onClick={() => setPreferences(true)}><Sliders size={16} /> Apariencia</button>
          {user && <button onClick={() => { setScreen('parrilla'); setDestination(null); logout(); }}><LogOut size={16} /> Salir</button>}
        </div>
      </header>
      <main className="operations-main">
        {!user && <LoginModal onLoginSuccess={setUser} />}
        {user && <section hidden={screen !== 'parrilla'} className="operations-screen">
          <ErrorBoundary moduleName="Parrilla">
            <ParrillaView visible={screen === 'parrilla'} />
          </ErrorBoundary>
        </section>}
        {user && screen === 'bms' && currentDestination && (
          <section className="operations-screen">
            <ErrorBoundary moduleName="Gestión BMS">
              <RoleBasedPlayoutView areas={areas} destination={currentDestination} onNavigate={setDestination}
                onOpenParrilla={() => setScreen('parrilla')} />
            </ErrorBoundary>
          </section>
        )}
        {user && screen === 'audit' && (
          <section className="operations-screen">
            <ErrorBoundary moduleName="Bitácora"><AuditView /></ErrorBoundary>
          </section>
        )}
      </main>
      <footer className="operations-footer">
        <span><Clock size={13} /> Horarios de Bolivia (UTC-4)</span>
        <ScreenVisitCount screen={user ? screen : 'login'} />
      </footer>
      <PreferencesModal isOpen={preferences} onClose={() => setPreferences(false)} />
    </div>
  );
}
