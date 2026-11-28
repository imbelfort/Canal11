export type BmsArea = 'admin' | 'programacion' | 'qc';
export type AdminSection = 'overview' | 'usuarios' | 'accesos' | 'operaciones';
export type ProgrammingSection = 'catalogo' | 'clientes' | 'spots' | 'pautas' | 'pagos';
export type BmsDestination =
  | { area: 'admin'; section: AdminSection }
  | { area: 'programacion'; section: ProgrammingSection }
  | { area: 'qc' };

export const bmsHome: Record<BmsArea, BmsDestination> = {
  admin: { area: 'admin', section: 'overview' },
  programacion: { area: 'programacion', section: 'catalogo' },
  qc: { area: 'qc' },
};

export function availableBmsAreas(roles: string[]): BmsArea[] {
  if (roles.includes('ADMINISTRADOR')) return ['admin', 'programacion', 'qc'];
  const areas: BmsArea[] = [];
  if (roles.includes('PROGRAMADOR')) areas.push('programacion');
  if (roles.includes('ENCARGADO_CONTENIDOS')) areas.push('qc');
  return areas;
}

export type SearchTarget =
  | { screen: 'parrilla' | 'audit' | 'preferences' }
  | { screen: 'theme'; mode: 'light' | 'dark' | 'auto' }
  | { screen: 'bms'; destination: BmsDestination };

interface SearchOption {
  label: string;
  group: string;
  keywords?: string;
  target: SearchTarget;
}

const admin = (section: AdminSection): SearchTarget => ({ screen: 'bms', destination: { area: 'admin', section } });
const programming = (section: ProgrammingSection): SearchTarget => ({ screen: 'bms', destination: { area: 'programacion', section } });

export const searchOptions: SearchOption[] = [
  { label: 'Parrilla', group: 'Pantallas', keywords: 'continuidad playout programación hoy', target: { screen: 'parrilla' } },
  { label: 'As a Run', group: 'Pantallas', keywords: 'emisiones bitácora reporte cu7 csv gráficos', target: { screen: 'audit' } },
  { label: 'Apariencia', group: 'Preferencias', keywords: 'cambiar tema perfil tamaño letra fuente contraste configuración', target: { screen: 'preferences' } },
  { label: 'Tema claro', group: 'Preferencias', keywords: 'cambiar modo pantalla luz', target: { screen: 'theme', mode: 'light' } },
  { label: 'Tema oscuro', group: 'Preferencias', keywords: 'cambiar modo pantalla noche', target: { screen: 'theme', mode: 'dark' } },
  { label: 'Tema por horario', group: 'Preferencias', keywords: 'cambiar modo pantalla automático', target: { screen: 'theme', mode: 'auto' } },
  { label: 'Panel gerencial', group: 'Administración', keywords: 'bms métricas reportes cu8', target: admin('overview') },
  { label: 'Usuarios y roles', group: 'Administración', keywords: 'bms personal operadores permisos cu1', target: admin('usuarios') },
  { label: 'Bitácora de accesos', group: 'Administración', keywords: 'bms login fallido ip rutas', target: admin('accesos') },
  { label: 'Auditoría de operaciones', group: 'Administración', keywords: 'bms bitácora actividad acciones', target: admin('operaciones') },
  { label: 'Catálogo de programas', group: 'Programación', keywords: 'bms categorías cu2', target: programming('catalogo') },
  { label: 'Clientes publicitarios', group: 'Programación', keywords: 'bms comercial publicidad cu6', target: programming('clientes') },
  { label: 'Spots publicitarios', group: 'Programación', keywords: 'bms anuncios avisos publicidad cu6', target: programming('spots') },
  { label: 'Pauta y tandas comerciales', group: 'Programación', keywords: 'bms publicidad bloques cu6', target: programming('pautas') },
  { label: 'Cobros publicitarios', group: 'Programación', keywords: 'bms pagos transacciones stripe qr pagofacil', target: programming('pagos') },
  { label: 'Archivos y control de calidad', group: 'Contenidos', keywords: 'bms qc mam subir video ingesta validar cu4 cu5', target: { screen: 'bms', destination: { area: 'qc' } } },
];

const normalizeSearchText = (text: string) => text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

export function findSearchOptions(query: string, areas: BmsArea[]) {
  const words = normalizeSearchText(query.trim()).split(/\s+/).filter(Boolean);
  return searchOptions.filter(({ label, group, keywords, target }) => {
    if (target.screen === 'bms' && !areas.includes(target.destination.area)) return false;
    const text = normalizeSearchText(`${label} ${group} ${keywords ?? ''}`);
    return words.every(word => text.includes(word));
  });
}
