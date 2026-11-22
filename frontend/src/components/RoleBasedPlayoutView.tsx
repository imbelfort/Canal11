import React, { useState } from 'react';
import { usePreferences } from '../context/PreferencesContext';
import { AdminView } from './BmsViews/AdminView';
import { ProgramadorView } from './BmsViews/ProgramadorView';
import { ContenidosQCView } from './BmsViews/ContenidosQCView';
import { Shield, Tv, Video } from 'lucide-react';

export const RoleBasedPlayoutView: React.FC = () => {
  const { user } = usePreferences();
  const userRoles: string[] = user?.roles || [];
  const isAdmin = userRoles.some(r => r.includes('ADMIN'));
  const isProg = userRoles.some(r => r.includes('PROG'));
  const isQC = userRoles.some(r => r.includes('CONT') || r.includes('QC'));

  // Pestaña principal de rol
  const [activeRoleTab, setActiveRoleTab] = useState<'admin' | 'prog' | 'qc'>(() => {
    if (isAdmin) return 'admin';
    if (isProg) return 'prog';
    return 'qc';
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--color-canvas, #0f172a)' }}>
      {/* NAVEGACIÓN PRINCIPAL DE ROLES DEL BMS */}
      <nav style={{
        display: 'flex',
        gap: 6,
        padding: '10px 20px',
        background: 'var(--color-canvas, #0f172a)',
        borderBottom: '1px solid var(--color-hairline, #334155)',
        overflowX: 'auto',
        flexShrink: 0
      }}>
        {isAdmin && (
          <button
            className={`bms-tab-btn ${activeRoleTab === 'admin' ? 'active' : ''}`}
            onClick={() => setActiveRoleTab('admin')}
          >
            <Shield size={16} />
            <span>Administración & Gobernanza (Super Admin)</span>
          </button>
        )}

        {(isProg || isAdmin) && (
          <button
            className={`bms-tab-btn ${activeRoleTab === 'prog' ? 'active' : ''}`}
            onClick={() => setActiveRoleTab('prog')}
          >
            <Tv size={16} />
            <span>Programación & Comercial (Programador de Contenidos)</span>
          </button>
        )}

        {(isQC || isAdmin) && (
          <button
            className={`bms-tab-btn ${activeRoleTab === 'qc' ? 'active' : ''}`}
            onClick={() => setActiveRoleTab('qc')}
          >
            <Video size={16} />
            <span>Ingesta MAM & Control de Calidad (Encargado de Contenidos)</span>
          </button>
        )}
      </nav>

      {/* RENDERIZADO DEL COMPONENTE VERTICAL CORRESPONDIENTE */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {activeRoleTab === 'admin' && <AdminView />}
        {activeRoleTab === 'prog' && <ProgramadorView />}
        {activeRoleTab === 'qc' && <ContenidosQCView />}
      </div>
    </div>
  );
};
