import React, { useState } from 'react';
import { usePreferences } from '../context/PreferencesContext';
import { AdminView } from './BmsViews/AdminView';
import { ProgramadorView } from './BmsViews/ProgramadorView';
import { ContenidosQCView } from './BmsViews/ContenidosQCView';

interface RoleBasedPlayoutViewProps {
  onOpenParrilla: () => void;
}

export const RoleBasedPlayoutView: React.FC<RoleBasedPlayoutViewProps> = ({ onOpenParrilla }) => {
  const { user } = usePreferences();
  const userRoles: string[] = user?.roles || [];
  const isAdmin = userRoles.some(r => r.includes('ADMIN'));
  const isProg = userRoles.some(r => r.includes('PROG'));
  const isQC = userRoles.some(r => r.includes('CONT') || r.includes('QC'));

  const [area, setArea] = useState<'admin' | 'programacion' | 'qc'>('admin');

  return (
    <div className="bms-role-workspace" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="operations-actions bms-subnav">
        <button onClick={onOpenParrilla}>Abrir Parrilla</button>
        {(isAdmin || (isProg && isQC)) && <>
          {isAdmin && <button className="bms-area-button" aria-pressed={area === 'admin'} onClick={() => setArea('admin')}>Administración</button>}
          <button className="bms-area-button" aria-pressed={area === 'programacion'} onClick={() => setArea('programacion')}>Programación y avisos</button>
          <button className="bms-area-button" aria-pressed={area === 'qc'} onClick={() => setArea('qc')}>Archivos y QC</button>
        </>}
      </div>
      {/* VISTA DIRECTA SEGUN ROL - SIN PESTAÑAS DUPLICADAS NI CONFUSAS */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {isAdmin && area === 'admin' && <AdminView />}
        {((isAdmin && area === 'programacion') || (!isAdmin && isProg && (!isQC || area !== 'qc'))) && <ProgramadorView />}
        {((isAdmin && area === 'qc') || (!isAdmin && isQC && (!isProg || area === 'qc'))) && <ContenidosQCView />}
        {!isAdmin && !isProg && !isQC && <ProgramadorView />}
      </div>
    </div>
  );
};
