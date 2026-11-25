import { AdminView } from './BmsViews/AdminView';
import { ProgramadorView } from './BmsViews/ProgramadorView';
import { ContenidosQCView } from './BmsViews/ContenidosQCView';
import { bmsHome, type BmsArea, type BmsDestination } from '../navigation';

const areaLabels: Record<BmsArea, string> = {
  admin: 'Administración', programacion: 'Programación y avisos', qc: 'Archivos y QC',
};

export function RoleBasedPlayoutView({ areas, destination, onNavigate, onOpenParrilla }: {
  areas: BmsArea[];
  destination: BmsDestination;
  onNavigate: (destination: BmsDestination) => void;
  onOpenParrilla: () => void;
}) {
  if (!areas.includes(destination.area)) return null;

  return (
    <div className="bms-role-workspace" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="operations-actions bms-subnav">
        <button onClick={onOpenParrilla}>{areas.length === 1 && areas[0] === 'qc' ? 'Ver Parrilla de hoy' : 'Abrir Parrilla'}</button>
        {areas.length > 1 && areas.map(area => (
          <button key={area} className="bms-area-button" aria-pressed={destination.area === area}
            onClick={() => onNavigate(bmsHome[area])}>{areaLabels[area]}</button>
        ))}
      </div>
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {destination.area === 'admin' && <AdminView section={destination.section}
          onSectionChange={section => onNavigate({ area: 'admin', section })} />}
        {destination.area === 'programacion' && <ProgramadorView section={destination.section}
          onSectionChange={section => onNavigate({ area: 'programacion', section })} />}
        {destination.area === 'qc' && <ContenidosQCView />}
      </div>
    </div>
  );
}
