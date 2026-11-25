import React from 'react';
import { usePreferences } from '../context/PreferencesContext';
import { AdminView } from './BmsViews/AdminView';
import { ProgramadorView } from './BmsViews/ProgramadorView';
import { ContenidosQCView } from './BmsViews/ContenidosQCView';

interface RoleBasedPlayoutViewProps {
  onOpenPreferences?: () => void;
}

export const RoleBasedPlayoutView: React.FC<RoleBasedPlayoutViewProps> = () => {
  const { user } = usePreferences();
  const userRoles: string[] = user?.roles || [];
  const isAdmin = userRoles.some(r => r.includes('ADMIN'));
  const isProg = userRoles.some(r => r.includes('PROG'));
  const isQC = userRoles.some(r => r.includes('CONT') || r.includes('QC'));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--color-canvas, #0f172a)' }}>
      {/* VISTA DIRECTA SEGUN ROL - SIN PESTAÑAS DUPLICADAS NI CONFUSAS */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {isAdmin && <AdminView />}
        {!isAdmin && isProg && <ProgramadorView />}
        {!isAdmin && !isProg && isQC && <ContenidosQCView />}
        {!isAdmin && !isProg && !isQC && <ProgramadorView />}
      </div>
    </div>
  );
};
