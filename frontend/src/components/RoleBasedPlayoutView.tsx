import React, { useState, useEffect } from 'react';
import { bmsApi } from '../services/bmsApi';
import { usePreferences } from '../context/PreferencesContext';
import {
  Users,
  Shield,
  FileText,
  Calendar,
  Layers,
  Video,
  CheckCircle,
  Tv,
  CreditCard,
  Search,
  Sliders,
  LogOut,
  Plus,
  RefreshCw,
  FolderOpen
} from 'lucide-react';

interface Props {
  onOpenPreferences: () => void;
}

export const RoleBasedPlayoutView: React.FC<Props> = ({ onOpenPreferences }) => {
  const { user, logout } = usePreferences();
  const userRoles: string[] = user?.roles || [];
  const isAdmin = userRoles.some(r => r.includes('ADMIN'));
  const isProg = userRoles.some(r => r.includes('PROG'));
  const isQC = userRoles.some(r => r.includes('CONT') || r.includes('QC'));

  // Vistas por rol
  // Super Admin: Panel de Control, Usuarios & Roles (CU1), Bitácora Auditoría (CU7), Reportes (CU8)
  // Programador: Catálogo Programas (CU2), Confección Parrilla (CU3), Clientes & Spots (CU6), Pauta (CU6), Pagos
  // Encargado Contenidos: MAM Ingesta (CU4), Control Calidad QC (CU5), As-Run Log / Emisión Real (CU7)
  const [activeTab, setActiveTab] = useState<string>(() => {
    if (isAdmin) return 'admin-overview';
    if (isProg) return 'prog-parrilla';
    return 'qc-mam';
  });

  const [stats, setStats] = useState<any>({});
  const [parrillaHoy, setParrillaHoy] = useState<any>(null);
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [programas, setProgramas] = useState<any[]>([]);
  const [clientes, setClientes] = useState<any[]>([]);
  const [spots, setSpots] = useState<any[]>([]);
  const [pautas, setPautas] = useState<any[]>([]);
  const [materiales, setMateriales] = useState<any[]>([]);
  const [validaciones, setValidaciones] = useState<any[]>([]);
  const [emisiones, setEmisiones] = useState<any[]>([]);
  const [auditoria, setAuditoria] = useState<any[]>([]);
  const [pagos, setPagos] = useState<any[]>([]);

  // Buscador Universal tipo Gmail
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);

  // Modal QR
  const [qrModal, setQrModal] = useState<{ open: boolean; txId: string; qrImg: string; monto: number; concepto: string } | null>(null);

  // Form states
  const [selectedClienteForSpot, setSelectedClienteForSpot] = useState<number | ''>('');
  const [spotTitulo, setSpotTitulo] = useState('');
  const [spotDuracion, setSpotDuracion] = useState(30);

  const [selectedProgForMat, setSelectedProgForMat] = useState<number | ''>('');
  const [matTitulo, setMatTitulo] = useState('');
  const [matDuracion, setMatDuracion] = useState(3600);
  const [matFormato, setMatFormato] = useState('HD_1080I');
  const [matRuta, setMatRuta] = useState('');

  useEffect(() => {
    loadBaseData();
  }, [user]);

  const loadBaseData = async () => {
    try {
      const [st, ph, pr, cl, sp] = await Promise.all([
        bmsApi.getReporteGeneral(),
        bmsApi.getParrillaHoy(),
        bmsApi.getProgramas(),
        bmsApi.getClientes(),
        bmsApi.getSpots()
      ]);
      setStats(st);
      setParrillaHoy(ph);
      setProgramas(pr);
      setClientes(cl);
      setSpots(sp);
    } catch (e) {
      console.error(e);
    }
  };

  // Buscador
  const handleSearch = async (val: string) => {
    setSearchQuery(val);
    if (!val || val.trim().length < 2) {
      setSearchResults([]);
      setShowSearchDropdown(false);
      return;
    }
    try {
      const res = await bmsApi.search(val);
      setSearchResults(res.results || []);
      setShowSearchDropdown(true);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSpotFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setSpotTitulo(f.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' '));
    try {
      const v = document.createElement('video');
      v.preload = 'metadata';
      v.onloadedmetadata = () => {
        window.URL.revokeObjectURL(v.src);
        if (v.duration && !isNaN(v.duration)) setSpotDuracion(Math.round(v.duration));
      };
      v.src = URL.createObjectURL(f);
    } catch {
      setSpotDuracion(30);
    }
  };

  const handleMatFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setMatTitulo(f.name);
    setMatRuta((f as any).path || `/mam/storage/${f.name}`);
    try {
      const v = document.createElement('video');
      v.preload = 'metadata';
      v.onloadedmetadata = () => {
        window.URL.revokeObjectURL(v.src);
        if (v.duration && !isNaN(v.duration)) setMatDuracion(Math.round(v.duration));
      };
      v.src = URL.createObjectURL(f);
    } catch {
      setMatDuracion(3600);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--color-canvas, #0f172a)' }}>
      {/* BARRA SUPERIOR PERSONALIZADA DEL BMS */}
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 16px', background: 'var(--color-canvas-soft, #1e293b)', borderBottom: '1px solid var(--color-hairline, #334155)', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="brand-logo-badge" style={{ background: 'var(--primary, #2563eb)', color: '#fff', padding: '3px 8px', borderRadius: 6, fontWeight: 800, fontSize: 12 }}>
            GRUPO 12 SC
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--color-ink, #f8fafc)' }}>Canal 11 Playout BMS</div>
            <div style={{ fontSize: 11, color: '#94a3b8' }}>
              Rol Activo: <strong style={{ color: 'var(--primary, #38bdf8)' }}>{user?.rol_principal || 'OPERADOR'}</strong>
            </div>
          </div>
        </div>

        {/* Buscador tipo Gmail */}
        <div style={{ flex: 1, maxWidth: 550, position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', background: 'var(--color-field, #0f172a)', border: '1px solid var(--color-hairline, #334155)', borderRadius: 24, padding: '4px 14px' }}>
            <Search size={15} color="#94a3b8" />
            <input
              type="text"
              placeholder="Buscar programas, clientes, spots, materiales MAM o personal..."
              value={searchQuery}
              onChange={e => handleSearch(e.target.value)}
              style={{ flex: 1, background: 'transparent', border: 'none', padding: '6px 10px', color: 'inherit', outline: 'none', fontSize: 13 }}
            />
          </div>

          {showSearchDropdown && (
            <div style={{ position: 'absolute', top: '105%', left: 0, right: 0, background: 'var(--color-canvas-soft, #1e293b)', border: '1px solid var(--color-hairline, #334155)', borderRadius: 12, boxShadow: '0 10px 25px rgba(0,0,0,0.5)', zIndex: 1000, maxHeight: 350, overflowY: 'auto' }}>
              {searchResults.length === 0 ? (
                <div style={{ padding: 12, fontSize: 12, color: '#94a3b8', textAlign: 'center' }}>Sin resultados.</div>
              ) : (
                searchResults.map((r, i) => (
                  <div
                    key={i}
                    onClick={() => {
                      setShowSearchDropdown(false);
                      if (r.type === 'PROGRAMA') setActiveTab(isProg ? 'prog-catalogo' : activeTab);
                      if (r.type === 'CLIENTE' || r.type === 'SPOT') setActiveTab(isProg ? 'prog-clientes' : activeTab);
                      if (r.type === 'MATERIAL_MAM') setActiveTab(isQC ? 'qc-mam' : activeTab);
                    }}
                    style={{ padding: '8px 14px', borderBottom: '1px solid rgba(255,255,255,0.05)', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                  >
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{r.title}</div>
                      <div style={{ fontSize: 11, color: '#94a3b8' }}>{r.subtitle}</div>
                    </div>
                    <span style={{ fontSize: 10, padding: '2px 6px', background: '#334155', borderRadius: 4, color: '#38bdf8' }}>{r.category}</span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Acciones de Preferencias y Usuario */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={onOpenPreferences}
            className="theme-toggle-btn"
            title="Ajustar color, tamaño de letra y tema visual"
          >
            <Sliders size={13} />
            <span>Apariencia</span>
          </button>

          <button
            onClick={logout}
            title="Cerrar Sesión"
            style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'transparent', border: '1px solid #ef4444', color: '#ef4444', borderRadius: 6, padding: '4px 10px', fontSize: 11, cursor: 'pointer', fontWeight: 600 }}
          >
            <LogOut size={13} />
            <span>Salir</span>
          </button>
        </div>
      </header>

      {/* PESTAÑAS SEGUN EL ROL ESPECIFICO (VISTAS COMPLETAMENTE DIFERENCIADAS) */}
      <nav style={{ display: 'flex', gap: 4, padding: '0 16px', background: 'var(--color-canvas-soft, #1e293b)', borderBottom: '1px solid var(--color-hairline, #334155)', overflowX: 'auto' }}>
        {/* VISTAS EXCLUSIVAS SUPER ADMIN */}
        {isAdmin && (
          <>
            <button className={`tab-btn ${activeTab === 'admin-overview' ? 'active' : ''}`} onClick={() => setActiveTab('admin-overview')}>
              Panel Gerencial (CU8)
            </button>
            <button className={`tab-btn ${activeTab === 'admin-usuarios' ? 'active' : ''}`} onClick={async () => { setActiveTab('admin-usuarios'); setUsuarios(await bmsApi.getUsuarios()); }}>
              Gestion Personal y Roles (CU1)
            </button>
            <button className={`tab-btn ${activeTab === 'admin-auditoria' ? 'active' : ''}`} onClick={async () => { setActiveTab('admin-auditoria'); setAuditoria(await bmsApi.getAuditoria()); }}>
              Bitacora Auditoria (CU7)
            </button>
          </>
        )}

        {/* VISTAS EXCLUSIVAS PROGRAMADOR */}
        {isProg && (
          <>
            <button className={`tab-btn ${activeTab === 'prog-parrilla' ? 'active' : ''}`} onClick={async () => { setActiveTab('prog-parrilla'); setParrillaHoy(await bmsApi.getParrillaHoy()); }}>
              Parrilla y Escaleta (CU3)
            </button>
            <button className={`tab-btn ${activeTab === 'prog-catalogo' ? 'active' : ''}`} onClick={async () => { setActiveTab('prog-catalogo'); setProgramas(await bmsApi.getProgramas()); }}>
              Catalogo de Programas (CU2)
            </button>
            <button className={`tab-btn ${activeTab === 'prog-clientes' ? 'active' : ''}`} onClick={async () => { setActiveTab('prog-clientes'); setClientes(await bmsApi.getClientes()); }}>
              Clientes y Spots (CU6)
            </button>
            <button className={`tab-btn ${activeTab === 'prog-pautas' ? 'active' : ''}`} onClick={async () => { setActiveTab('prog-pautas'); setPautas(await bmsApi.getPautas()); }}>
              Pauta de Emision (CU6)
            </button>
            <button className={`tab-btn ${activeTab === 'prog-pagos' ? 'active' : ''}`} onClick={async () => { setActiveTab('prog-pagos'); setPagos(await bmsApi.getPagos()); }}>
              Cobros PagoFacil QR
            </button>
          </>
        )}

        {/* VISTAS EXCLUSIVAS ENCARGADO DE CONTENIDOS / QC */}
        {isQC && (
          <>
            <button className={`tab-btn ${activeTab === 'qc-mam' ? 'active' : ''}`} onClick={async () => { setActiveTab('qc-mam'); setMateriales(await bmsApi.getMateriales()); }}>
              MAM - Ingesta Video (CU4)
            </button>
            <button className={`tab-btn ${activeTab === 'qc-calidad' ? 'active' : ''}`} onClick={async () => { setActiveTab('qc-calidad'); setValidaciones(await bmsApi.getValidaciones()); }}>
              Control Calidad QC (CU5)
            </button>
            <button className={`tab-btn ${activeTab === 'qc-asrun' ? 'active' : ''}`} onClick={async () => { setActiveTab('qc-asrun'); setEmisiones(await bmsApi.getEmisiones()); }}>
              As-Run Log / Emision Real (CU7)
            </button>
          </>
        )}
      </nav>

      {/* CONTENIDO MODULAR POR VISTA */}
      <main style={{ flex: 1, padding: 16, overflowY: 'auto' }}>
        {/* ==========================================
            1. VISTA SUPER ADMIN: PANEL GERENCIAL Y PERSONAL
           ========================================== */}
        {isAdmin && activeTab === 'admin-overview' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 16 }}>
              <div className="stat-card">
                <span className="stat-label">Personal Activo</span>
                <span className="stat-val">{stats.total_usuarios || 0}</span>
              </div>
              <div className="stat-card">
                <span className="stat-label">Programas Registrados</span>
                <span className="stat-val">{stats.total_programas || 0}</span>
              </div>
              <div className="stat-card">
                <span className="stat-label">Bloques al Aire</span>
                <span className="stat-val">{stats.total_bloques || 0}</span>
              </div>
              <div className="stat-card">
                <span className="stat-label">Comerciales Pautados</span>
                <span className="stat-val">{stats.total_pautas || 0}</span>
              </div>
              <div className="stat-card">
                <span className="stat-label">Recaudacion PagoFacil</span>
                <span className="stat-val" style={{ color: '#4ade80' }}>Bs. {stats.monto_recaudado_bob || 0}</span>
              </div>
            </div>

            <div className="view-card">
              <h3 style={{ margin: '0 0 12px', fontSize: 15 }}>Estado General de Operatividad del Canal</h3>
              <p style={{ fontSize: 13, color: '#94a3b8' }}>
                Monitoreo consolidado del Playout BMS. Acceda a la pestana "Gestion Personal y Roles" para dar de alta operadores o fiscalice las operaciones en "Bitacora Auditoria".
              </p>
            </div>
          </div>
        )}

        {isAdmin && activeTab === 'admin-usuarios' && (
          <div>
            <div className="view-card">
              <div className="card-header">
                <span className="card-title">Alta de Nuevo Operador del Canal (CU1)</span>
              </div>
              <form onSubmit={async (e) => {
                e.preventDefault();
                const form = e.target as HTMLFormElement;
                const body = {
                  nombre: (form.elements.namedItem('nombre') as HTMLInputElement).value,
                  apellidos: (form.elements.namedItem('apellidos') as HTMLInputElement).value,
                  ci: (form.elements.namedItem('ci') as HTMLInputElement).value,
                  email: (form.elements.namedItem('email') as HTMLInputElement).value,
                  password: (form.elements.namedItem('pass') as HTMLInputElement).value,
                  rol_id: Number((form.elements.namedItem('rol') as HTMLSelectElement).value)
                };
                const res = await bmsApi.createUsuario(body);
                if (res.success) {
                  alert('Usuario creado con exito.');
                  form.reset();
                  setUsuarios(await bmsApi.getUsuarios());
                }
              }}>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Nombres</label>
                    <input name="nombre" required placeholder="Carlos" />
                  </div>
                  <div className="form-group">
                    <label>Apellidos</label>
                    <input name="apellidos" required placeholder="Roca" />
                  </div>
                  <div className="form-group">
                    <label>Cédula de Identidad</label>
                    <input name="ci" required placeholder="4587123" />
                  </div>
                  <div className="form-group">
                    <label>Correo Institucional</label>
                    <input name="email" type="email" required placeholder="operador@canal11.bo" />
                  </div>
                  <div className="form-group">
                    <label>Contraseña</label>
                    <input name="pass" type="password" required placeholder="••••••••" />
                  </div>
                  <div className="form-group">
                    <label>Rol Funcional</label>
                    <select name="rol">
                      <option value="1">ADMINISTRADOR</option>
                      <option value="2">PROGRAMADOR</option>
                      <option value="3">ENCARGADO_CONTENIDOS</option>
                    </select>
                  </div>
                </div>
                <button type="submit" className="btn-action">Registrar Operador</button>
              </form>
            </div>

            <div className="view-card">
              <h3 style={{ margin: '0 0 12px', fontSize: 14 }}>Plantel Activo de Usuarios</h3>
              <table className="bms-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Operador</th>
                    <th>CI</th>
                    <th>Correo</th>
                    <th>Roles</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {usuarios.map(u => (
                    <tr key={u.id_usuario}>
                      <td>#{u.id_usuario}</td>
                      <td><strong>{u.nombre} {u.apellidos}</strong></td>
                      <td>{u.ci}</td>
                      <td>{u.email}</td>
                      <td>{(u.roles || []).map((r: any) => <span key={r.id} className="role-badge role-admin" style={{ marginRight: 4 }}>{r.nombre}</span>)}</td>
                      <td><span style={{ color: u.estado === 'ACTIVO' ? '#4ade80' : '#f87171' }}>{u.estado}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {isAdmin && activeTab === 'admin-auditoria' && (
          <div className="view-card">
            <h3 style={{ margin: '0 0 12px', fontSize: 14 }}>Bitacora Notariada de Auditoria (CU7)</h3>
            <table className="bms-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Operador</th>
                  <th>Tabla</th>
                  <th>Operacion</th>
                  <th>Detalle</th>
                </tr>
              </thead>
              <tbody>
                {auditoria.map(a => (
                  <tr key={a.id}>
                    <td><small>{a.fecha_evento}</small></td>
                    <td><strong>{a.usuario?.nombre || 'Sistema'}</strong></td>
                    <td><code>{a.tabla_afectada}</code></td>
                    <td><span className="role-badge role-prog">{a.accion}</span></td>
                    <td>{a.detalle}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ==========================================
            2. VISTA PROGRAMADOR: PARRILLA, CLIENTES & SPOTS
           ========================================== */}
        {isProg && activeTab === 'prog-parrilla' && (
          <div>
            <div className="view-card">
              <div className="card-header">
                <span className="card-title">Asignar Bloque Horario a la Parrilla (CU3 Escaleta)</span>
              </div>
              <form onSubmit={async (e) => {
                e.preventDefault();
                const form = e.target as HTMLFormElement;
                const body = {
                  id_parrilla: 1,
                  id_programa: Number((form.elements.namedItem('programa') as HTMLSelectElement).value),
                  hora_inicio: (form.elements.namedItem('inicio') as HTMLInputElement).value,
                  hora_fin: (form.elements.namedItem('fin') as HTMLInputElement).value,
                  tipo_emision: (form.elements.namedItem('tipo') as HTMLSelectElement).value
                };
                const res = await bmsApi.addItemParrilla(body);
                if (res.success) {
                  alert('Bloque agregado exitosamente.');
                  setParrillaHoy(await bmsApi.getParrillaHoy());
                }
              }}>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Programa a Emitir</label>
                    <select name="programa" required>
                      {programas.map(p => <option key={p.id} value={p.id}>{p.codigo} - {p.titulo}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Hora Inicio</label>
                    <input name="inicio" type="time" defaultValue="14:00" required />
                  </div>
                  <div className="form-group">
                    <label>Hora Fin</label>
                    <input name="fin" type="time" defaultValue="15:00" required />
                  </div>
                  <div className="form-group">
                    <label>Tipo de Emisión</label>
                    <select name="tipo">
                      <option value="GRABADO">GRABADO (Archivo MAM)</option>
                      <option value="VIVO">VIVO (Directo)</option>
                      <option value="REPETICION">REPETICIÓN</option>
                    </select>
                  </div>
                </div>
                <button type="submit" className="btn-action">Insertar Bloque en Parrilla</button>
              </form>
            </div>

            <div className="view-card">
              <div className="card-header">
                <span className="card-title">Rundown Oficial de la Jornada</span>
                <button className="btn-action btn-secondary" onClick={async () => { await bmsApi.aprobarParrilla(1); alert('Parrilla APROBADA'); setParrillaHoy(await bmsApi.getParrillaHoy()); }}>
                  Aprobar Parrilla Oficialmente
                </button>
              </div>
              <table className="bms-table">
                <thead>
                  <tr>
                    <th>Horario</th>
                    <th>Programa</th>
                    <th>Tipo</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {(parrillaHoy?.items || []).map((it: any) => (
                    <tr key={it.id}>
                      <td><strong style={{ color: 'var(--primary, #38bdf8)' }}>{it.hora_inicio} - {it.hora_fin}</strong></td>
                      <td><strong>{it.programa?.codigo}</strong> - {it.programa?.titulo}</td>
                      <td>{it.tipo_emision}</td>
                      <td><span className="role-badge role-prog">{it.estado}</span></td>
                      <td>
                        <button className="btn-action btn-secondary" style={{ padding: '3px 8px', fontSize: 11 }} onClick={async () => { await bmsApi.deleteItemParrilla(it.id); setParrillaHoy(await bmsApi.getParrillaHoy()); }}>
                          Quitar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {isProg && activeTab === 'prog-clientes' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              {/* Cliente */}
              <div className="view-card">
                <div className="card-header">
                  <span className="card-title">Nuevo Anunciante Publicitario</span>
                </div>
                <form onSubmit={async (e) => {
                  e.preventDefault();
                  const form = e.target as HTMLFormElement;
                  const res = await bmsApi.createCliente({
                    razon_social: (form.elements.namedItem('razon') as HTMLInputElement).value,
                    nit: (form.elements.namedItem('nit') as HTMLInputElement).value,
                    contacto: (form.elements.namedItem('contacto') as HTMLInputElement).value
                  });
                  if (res.success) {
                    alert('Cliente registrado.');
                    form.reset();
                    setClientes(await bmsApi.getClientes());
                  }
                }}>
                  <div className="form-group" style={{ marginBottom: 8 }}>
                    <label>Razón Social</label>
                    <input name="razon" required placeholder="Cervecería Boliviana Nacional S.A." />
                  </div>
                  <div className="form-group" style={{ marginBottom: 8 }}>
                    <label>NIT</label>
                    <input name="nit" required placeholder="1020304050" />
                  </div>
                  <div className="form-group" style={{ marginBottom: 12 }}>
                    <label>Contacto</label>
                    <input name="contacto" placeholder="Lic. Rodrigo Banegas - 70012345" />
                  </div>
                  <button type="submit" className="btn-action">Guardar Anunciante</button>
                </form>
              </div>

              {/* Spot con selector de archivo */}
              <div className="view-card">
                <div className="card-header">
                  <span className="card-title">Vincular Spot Comercial (Seleccionar Video)</span>
                </div>
                <form onSubmit={async (e) => {
                  e.preventDefault();
                  if (!selectedClienteForSpot) {
                    alert('Seleccione un cliente.');
                    return;
                  }
                  const res = await bmsApi.createSpot({
                    id_cliente: Number(selectedClienteForSpot),
                    titulo_spot: spotTitulo,
                    duracion_segundos: spotDuracion
                  });
                  if (res.success) {
                    alert(`Spot vinculado con código: ${res.spot.codigo_spot}`);
                    setSpotTitulo('');
                    setClientes(await bmsApi.getClientes());
                    setSpots(await bmsApi.getSpots());
                  }
                }}>
                  <div className="form-group" style={{ marginBottom: 8 }}>
                    <label>Cliente Titular</label>
                    <select value={selectedClienteForSpot} onChange={e => setSelectedClienteForSpot(Number(e.target.value))} required>
                      <option value="">(Seleccione Cliente)</option>
                      {clientes.map(c => <option key={c.id} value={c.id}>{c.razon_social} (NIT: {c.nit})</option>)}
                    </select>
                  </div>
                  <div className="form-group" style={{ marginBottom: 8 }}>
                    <label>Seleccionar Archivo de Video (*.mp4, *.mov, *.mxf)</label>
                    <input type="file" accept="video/*,.mp4,.mov,.mxf" onChange={handleSpotFile} />
                  </div>
                  <div className="form-group" style={{ marginBottom: 8 }}>
                    <label>Título Comercial Detectado</label>
                    <input value={spotTitulo} onChange={e => setSpotTitulo(e.target.value)} required placeholder="Nombre comercial" />
                  </div>
                  <div className="form-group" style={{ marginBottom: 12 }}>
                    <label>Duración Detectada (Segundos)</label>
                    <input type="number" value={spotDuracion} onChange={e => setSpotDuracion(Number(e.target.value))} required />
                  </div>
                  <button type="submit" className="btn-action">Vincular Spot al Cliente</button>
                </form>
              </div>
            </div>

            <div className="view-card">
              <h3 style={{ margin: '0 0 12px', fontSize: 14 }}>Cartera de Clientes Anunciantes y sus Spots</h3>
              <table className="bms-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Razón Social</th>
                    <th>NIT</th>
                    <th>Contacto</th>
                    <th>Spots Registrados</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {clientes.map(c => (
                    <tr key={c.id}>
                      <td>#{c.id}</td>
                      <td><strong>{c.razon_social}</strong></td>
                      <td>{c.nit}</td>
                      <td>{c.contacto || 'N/A'}</td>
                      <td>
                        {(c.spots || []).length > 0 ? (
                          (c.spots || []).map((s: any) => (
                            <span key={s.id} className="role-badge role-prog" style={{ marginRight: 4 }}>
                              {s.codigo_spot} ({s.duracion_segundos}s)
                            </span>
                          ))
                        ) : <span style={{ color: '#64748b', fontSize: 11 }}>Sin spots</span>}
                      </td>
                      <td>
                        <button className="btn-action btn-secondary" style={{ padding: '3px 8px', fontSize: 11, marginRight: 6 }} onClick={() => setSelectedClienteForSpot(c.id)}>
                          + Spot
                        </button>
                        <button className="btn-action" style={{ padding: '3px 8px', fontSize: 11 }} onClick={async () => {
                          const res = await bmsApi.generarPagoQr({ id_cliente: c.id, monto: 500, concepto: `Pauta Publicitaria ${c.razon_social}` });
                          if (res.success) {
                            setQrModal({ open: true, txId: res.transaccion_id, qrImg: res.qr_imagen, monto: res.monto, concepto: `Pauta Publicitaria ${c.razon_social}` });
                          }
                        }}>
                          Cobrar QR
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {isProg && activeTab === 'prog-pautas' && (
          <div>
            <div className="view-card">
              <div className="card-header">
                <span className="card-title">Insertar Spot en Tanda de Emisión (Pauta Comercial)</span>
              </div>
              <form onSubmit={async (e) => {
                e.preventDefault();
                const form = e.target as HTMLFormElement;
                const res = await bmsApi.createPauta({
                  id_item_parrilla: Number((form.elements.namedItem('item') as HTMLSelectElement).value),
                  id_spot: Number((form.elements.namedItem('spot') as HTMLSelectElement).value),
                  tanda_bloque: (form.elements.namedItem('tanda') as HTMLSelectElement).value,
                  orden: Number((form.elements.namedItem('orden') as HTMLInputElement).value)
                });
                if (res.success) {
                  alert('Spot pautado exitosamente.');
                  setPautas(await bmsApi.getPautas());
                }
              }}>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Bloque Horario de Parrilla</label>
                    <select name="item" required>
                      {(parrillaHoy?.items || []).map((it: any) => (
                        <option key={it.id} value={it.id}>{it.hora_inicio} - {it.programa?.titulo || 'Bloque ' + it.id}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Spot Comercial del Cliente</label>
                    <select name="spot" required>
                      {spots.map(s => <option key={s.id} value={s.id}>[{s.cliente?.razon_social || 'Cliente'}] {s.codigo_spot} - {s.titulo_spot} ({s.duracion_segundos}s)</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Tanda del Bloque</label>
                    <select name="tanda">
                      <option value="CORTE_1">CORTE_1</option>
                      <option value="CORTE_2">CORTE_2</option>
                      <option value="CORTE_3">CORTE_3</option>
                      <option value="INICIO_PROGRAMA">INICIO_PROGRAMA</option>
                      <option value="FIN_PROGRAMA">FIN_PROGRAMA</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Orden en la Tanda</label>
                    <input name="orden" type="number" defaultValue={1} min={1} max={10} />
                  </div>
                </div>
                <button type="submit" className="btn-action">Insertar en Pauta</button>
              </form>
            </div>

            <div className="view-card">
              <h3 style={{ margin: '0 0 12px', fontSize: 14 }}>Pautas Comerciales en la Parrilla</h3>
              <table className="bms-table">
                <thead>
                  <tr>
                    <th>Programa Emisor</th>
                    <th>Spot Comercial</th>
                    <th>Anunciante</th>
                    <th>Tanda</th>
                    <th>Orden</th>
                    <th>Duración</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {pautas.map(p => (
                    <tr key={p.id}>
                      <td>{p.item_parrilla?.programa?.titulo || 'N/A'}</td>
                      <td><strong>{p.spot?.codigo_spot}</strong> - {p.spot?.titulo_spot}</td>
                      <td>{p.spot?.cliente?.razon_social || 'N/A'}</td>
                      <td>{p.tanda_bloque}</td>
                      <td>#{p.orden}</td>
                      <td>{p.spot?.duracion_segundos}s</td>
                      <td><span style={{ color: '#4ade80' }}>{p.estado}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ==========================================
            3. VISTA ENCARGADO CONTENIDOS: MAM & QC
           ========================================== */}
        {isQC && activeTab === 'qc-mam' && (
          <div>
            <div className="view-card">
              <div className="card-header">
                <span className="card-title">Ingesta Automática de Video MAM (Cero Tipeo de Nombre/Ruta)</span>
              </div>
              <form onSubmit={async (e) => {
                e.preventDefault();
                if (!selectedProgForMat) {
                  alert('Seleccione un programa.');
                  return;
                }
                const res = await bmsApi.createMaterial({
                  id_programa: Number(selectedProgForMat),
                  titulo_clip: matTitulo,
                  duracion_segundos: matDuracion,
                  formato: matFormato,
                  ruta_servidor: matRuta
                });
                if (res.success) {
                  alert(`Clip ingestado con éxito en MAM: ${res.material.codigo_material}`);
                  setMatTitulo('');
                  setMatRuta('');
                  setMateriales(await bmsApi.getMateriales());
                }
              }}>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Seleccionar Archivo de Video</label>
                    <input type="file" accept="video/*,.mxf,.mov,.mp4,.ts" onChange={handleMatFile} />
                  </div>
                  <div className="form-group">
                    <label>Programa Asociado</label>
                    <select value={selectedProgForMat} onChange={e => setSelectedProgForMat(Number(e.target.value))} required>
                      <option value="">(Seleccione Programa)</option>
                      {programas.map(p => <option key={p.id} value={p.id}>{p.codigo} - {p.titulo}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Nombre Detectado</label>
                    <input value={matTitulo} readOnly placeholder="Se extrae al seleccionar archivo" />
                  </div>
                  <div className="form-group">
                    <label>Duración (Segundos)</label>
                    <input type="number" value={matDuracion} onChange={e => setMatDuracion(Number(e.target.value))} />
                  </div>
                  <div className="form-group">
                    <label>Formato Broadcast</label>
                    <select value={matFormato} onChange={e => setMatFormato(e.target.value)}>
                      <option value="HD_1080I">HD 1080i</option>
                      <option value="HD_720P">HD 720p</option>
                      <option value="4K_UHD">4K UHD</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Ruta Servidor Storage</label>
                    <input value={matRuta} readOnly />
                  </div>
                </div>
                <button type="submit" className="btn-action">Ingestar en MAM</button>
              </form>
            </div>

            <div className="view-card">
              <h3 style={{ margin: '0 0 12px', fontSize: 14 }}>Activos Digitales en Servidor MAM</h3>
              <table className="bms-table">
                <thead>
                  <tr>
                    <th>Código MAM</th>
                    <th>Clip</th>
                    <th>Programa</th>
                    <th>Duración</th>
                    <th>Formato</th>
                    <th>Estado</th>
                    <th>Storage</th>
                  </tr>
                </thead>
                <tbody>
                  {materiales.map(m => (
                    <tr key={m.id}>
                      <td><strong>{m.codigo_material}</strong></td>
                      <td>{m.titulo_clip}</td>
                      <td>{m.programa?.titulo || 'N/A'}</td>
                      <td>{m.duracion_segundos}s</td>
                      <td>{m.formato}</td>
                      <td><span className="role-badge role-qc">{m.estado}</span></td>
                      <td><code>{m.ruta_servidor}</code></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {isQC && activeTab === 'qc-calidad' && (
          <div>
            <div className="view-card">
              <div className="card-header">
                <span className="card-title">Inspección Técnica Previa a Emisión (CU5 Calidad QC)</span>
              </div>
              <form onSubmit={async (e) => {
                e.preventDefault();
                const form = e.target as HTMLFormElement;
                const res = await bmsApi.validarItem({
                  id_item_parrilla: Number((form.elements.namedItem('item') as HTMLSelectElement).value),
                  resultado_qc: (form.elements.namedItem('veredicto') as HTMLSelectElement).value,
                  nivel_audio_db: Number((form.elements.namedItem('audio') as HTMLInputElement).value),
                  observaciones: (form.elements.namedItem('obs') as HTMLInputElement).value
                });
                if (res.success) {
                  alert('Certificación QC registrada.');
                  setValidaciones(await bmsApi.getValidaciones());
                }
              }}>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Bloque Horario</label>
                    <select name="item" required>
                      {(parrillaHoy?.items || []).map((it: any) => (
                        <option key={it.id} value={it.id}>{it.hora_inicio} - {it.programa?.titulo || 'Bloque ' + it.id}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Veredicto QC</label>
                    <select name="veredicto">
                      <option value="APROBADO_AIRE">APROBADO_AIRE (Apto para Transmisión)</option>
                      <option value="RECHAZADO_FALLA_AUDIO">RECHAZADO_FALLA_AUDIO</option>
                      <option value="RECHAZADO_FALLA_VIDEO">RECHAZADO_FALLA_VIDEO</option>
                      <option value="OBSERVADO">OBSERVADO</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Nivel Sonoridad (dB)</label>
                    <input name="audio" type="number" step="0.1" defaultValue={-24.0} />
                  </div>
                  <div className="form-group">
                    <label>Observaciones</label>
                    <input name="obs" defaultValue="Inspección conforme norma EBU R128" />
                  </div>
                </div>
                <button type="submit" className="btn-action">Registrar Certificación QC</button>
              </form>
            </div>

            <div className="view-card">
              <h3 style={{ margin: '0 0 12px', fontSize: 14 }}>Historial de Certificaciones QC</h3>
              <table className="bms-table">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Veredicto</th>
                    <th>Audio dB</th>
                    <th>Inspector</th>
                    <th>Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  {validaciones.map(v => (
                    <tr key={v.id}>
                      <td>{v.item_parrilla?.programa?.titulo || 'Bloque #' + v.id_item_parrilla}</td>
                      <td><span className="role-badge" style={{ background: 'rgba(34,197,94,0.15)', color: '#4ade80' }}>{v.resultado_qc}</span></td>
                      <td>{v.nivel_audio_db} dB</td>
                      <td>{v.inspector?.nombre || 'Inspector QC'}</td>
                      <td>{v.fecha_validacion}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* Modal QR PagoFacil */}
      {qrModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 16, padding: 24, maxWidth: 380, width: '90%', textAlign: 'center' }}>
            <h3 style={{ margin: 0, color: '#38bdf8' }}>Código QR PagoFácil Bolivia</h3>
            <p style={{ fontSize: 12, color: '#94a3b8', margin: '8px 0' }}>{qrModal.concepto}</p>
            <img src={qrModal.qrImg} alt="QR" style={{ width: 220, height: 220, margin: '12px auto', background: '#fff', padding: 8, borderRadius: 8 }} />
            <div style={{ fontSize: 18, fontWeight: 700, color: '#4ade80', marginBottom: 16 }}>Total: Bs. {qrModal.monto}</div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
              <button className="btn-action" onClick={async () => {
                await bmsApi.confirmarPago(qrModal.txId);
                alert('Pago confirmado exitosamente.');
                setQrModal(null);
                setStats(await bmsApi.getReporteGeneral());
              }}>
                Confirmar Pago (Simulación)
              </button>
              <button className="btn-action btn-secondary" onClick={() => setQrModal(null)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
