import React, { useState } from 'react';
import { bmsApi } from '../services/bmsApi';
import { usePreferences } from '../context/PreferencesContext';
import { ShieldCheck, Lock, User, AlertCircle } from 'lucide-react';

interface LoginModalProps {
  onLoginSuccess: (user: any) => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ onLoginSuccess }) => {
  const { setUser } = usePreferences();
  const [login, setLogin] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await bmsApi.login(login, password);
      if (res.success) {
        localStorage.setItem('playout_token', res.token);
        localStorage.setItem('playout_user', JSON.stringify(res.usuario));
        setUser(res.usuario);
        onLoginSuccess(res.usuario);
      } else {
        setError(res.message || 'Credenciales invalidas.');
      }
    } catch (err: any) {
      setError('Error al conectar con la API de Laravel: ' + (err.message || err));
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFill = (u: string, p: string) => {
    setLogin(u);
    setPassword(p);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.95)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 16, padding: 32, width: '90%', maxWidth: 420, boxShadow: '0 25px 50px rgba(0,0,0,0.6)' }}>
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ display: 'inline-flex', padding: '6px 14px', background: '#dc2626', borderRadius: 6, fontWeight: 800, fontSize: 13, letterSpacing: 0.5, color: '#fff', marginBottom: 8 }}>
            CANAL 11 HD
          </div>
          <h2 style={{ margin: '6px 0 2px', fontSize: 18, color: '#f8fafc' }}>Control de Acceso por Roles</h2>
          <p style={{ margin: 0, fontSize: 12, color: '#94a3b8' }}>Playout Automation BMS - Grupo 12 SC</p>
        </div>

        {/* Roles Presets */}
        <div style={{ background: 'rgba(56, 189, 248, 0.08)', border: '1px solid rgba(56, 189, 248, 0.25)', borderRadius: 8, padding: 10, marginBottom: 16, fontSize: 11.5 }}>
          <div style={{ fontWeight: 600, color: '#38bdf8', marginBottom: 6 }}>Acceso Rapido por Rol:</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <button type="button" onClick={() => handleQuickFill('admin', 'admin123')} style={{ background: '#334155', border: 'none', color: '#f87171', padding: '3px 8px', borderRadius: 4, cursor: 'pointer', fontSize: 11, fontWeight: 700 }}>
              Super Admin
            </button>
            <button type="button" onClick={() => handleQuickFill('programador', 'prog123')} style={{ background: '#334155', border: 'none', color: '#60a5fa', padding: '3px 8px', borderRadius: 4, cursor: 'pointer', fontSize: 11, fontWeight: 700 }}>
              Programador
            </button>
            <button type="button" onClick={() => handleQuickFill('contenidos', 'cont123')} style={{ background: '#334155', border: 'none', color: '#34d399', padding: '3px 8px', borderRadius: 4, cursor: 'pointer', fontSize: 11, fontWeight: 700 }}>
              Encargado Contenidos
            </button>
          </div>
        </div>

        {error && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 6, color: '#f87171', fontSize: 12, marginBottom: 14 }}>
            <AlertCircle size={14} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 11, textTransform: 'uppercase', color: '#94a3b8', marginBottom: 4, fontWeight: 600 }}>
              Usuario o Correo
            </label>
            <div style={{ display: 'flex', alignItems: 'center', background: '#0f172a', border: '1px solid #334155', borderRadius: 6, padding: '0 10px' }}>
              <User size={14} color="#94a3b8" />
              <input
                type="text"
                value={login}
                onChange={e => setLogin(e.target.value)}
                required
                style={{ flex: 1, padding: 8, background: 'transparent', border: 'none', color: '#fff', outline: 'none', fontSize: 13 }}
              />
            </div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 11, textTransform: 'uppercase', color: '#94a3b8', marginBottom: 4, fontWeight: 600 }}>
              Contraseña
            </label>
            <div style={{ display: 'flex', alignItems: 'center', background: '#0f172a', border: '1px solid #334155', borderRadius: 6, padding: '0 10px' }}>
              <Lock size={14} color="#94a3b8" />
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                style={{ flex: 1, padding: 8, background: 'transparent', border: 'none', color: '#fff', outline: 'none', fontSize: 13 }}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-action"
            style={{ width: '100%', justifyContent: 'center', padding: 10, fontSize: 13 }}
          >
            {loading ? 'Verificando...' : 'Ingresar al Playout'}
          </button>
        </form>
      </div>
    </div>
  );
};
