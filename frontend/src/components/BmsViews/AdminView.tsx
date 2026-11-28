import { useToast } from '../../context/ToastContext';
import { AccessLogView } from './AccessLogView';
import { OperatorRegistration } from './RegistrationDialogs';
import { ManagementMetrics } from './ManagementMetrics';
import React, { useState, useEffect } from 'react';
import { bmsApi, type GeneralReport } from '../../services/bmsApi';
import { usePreferences } from '../../context/PreferencesContext';
import type { AdminSection } from '../../navigation';
import { Users, Shield, BarChart3, Plus, Edit2, Trash2, X, Check } from 'lucide-react';

const currency = new Intl.NumberFormat('es-BO', { style: 'currency', currency: 'BOB' });

export function AdminView({ section, onSectionChange }: {
  section: AdminSection;
  onSectionChange: (section: AdminSection) => void;
}) {
  const notify = useToast();
  const { user: currentUser } = usePreferences();
  const activeSubTab = section === 'accesos' || section === 'operaciones' ? 'auditoria' : section;
  const [stats, setStats] = useState<GeneralReport | null>(null);
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [auditoria, setAuditoria] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Modal para Editar Usuario
  const [registrationOpen, setRegistrationOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any | null>(null);

  useEffect(() => {
    if (section !== 'accesos') loadData();
  }, [section]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeSubTab === 'overview') {
        const s = await bmsApi.getReporteGeneral();
        setStats(s);
      } else if (activeSubTab === 'usuarios') {
        const u = await bmsApi.getUsuarios();
        setUsuarios(u);
      } else if (activeSubTab === 'auditoria') {
        const a = await bmsApi.getAuditoria();
        setAuditoria(a);
      }
    } catch (e) {
      notify((e as Error).message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (u: any) => {
    if (u.id_usuario === currentUser?.id_usuario) {
      notify('No puedes dar de baja tu propia cuenta.', 'error');
      return;
    }
    if (confirm(`¿Confirma dar de baja al operador ${u.nombre} ${u.apellidos} (#${u.id_usuario})?`)) {
      try {
        const res = await bmsApi.deleteUsuario(u.id_usuario);
        if (res.success) {
          notify('Operador dado de baja.');
          loadData();
        } else notify(res.message || 'No se pudo dar de baja al operador.', 'error');
      } catch (err: any) {
        notify('No se pudo dar de baja al operador. ' + err.message, 'error');
      }
    }
  };

  return (
    <div className="bms-container">
      {/* Sub-navegacion estilizada */}
      <div className="bms-subnav">
        <button
          className={`bms-tab-btn ${activeSubTab === 'overview' ? 'active' : ''}`}
          onClick={() => onSectionChange('overview')}
        >
          <BarChart3 size={15} />
          <span>Panel gerencial y métricas</span>
        </button>
        <button
          className={`bms-tab-btn ${activeSubTab === 'usuarios' ? 'active' : ''}`}
          onClick={() => onSectionChange('usuarios')}
        >
          <Users size={15} />
          <span>Personal y roles</span>
        </button>
        <button
          className={`bms-tab-btn ${activeSubTab === 'auditoria' ? 'active' : ''}`}
          aria-pressed={activeSubTab === 'auditoria'}
          onClick={() => onSectionChange('accesos')}
        >
          <Shield size={15} />
          <span>Bitácora</span>
        </button>
      </div>

      <div className="bms-content-area">
        {/* SUBTAB 1: PANEL GERENCIAL */}
        {activeSubTab === 'overview' && (
          <div className="fade-in" aria-busy={loading}>
            <div className="bms-grid-stats">
              <div className="bms-stat-card">
                <span className="stat-label">Personal activo</span>
                <span className="stat-val">{stats?.total_usuarios ?? '—'}</span>
                <span className="stat-sub">Operadores con acceso</span>
              </div>
              <div className="bms-stat-card">
                <span className="stat-label">Programas activos</span>
                <span className="stat-val">{stats?.total_programas ?? '—'}</span>
                <span className="stat-sub">Formatos registrados</span>
              </div>
              <div className="bms-stat-card">
                <span className="stat-label">Bloques registrados</span>
                <span className="stat-val">{stats?.total_bloques ?? '—'}</span>
                <span className="stat-sub">Programados en parrilla</span>
              </div>
              <div className="bms-stat-card">
                <span className="stat-label">Pautas comerciales</span>
                <span className="stat-val">{stats?.total_pautas ?? '—'}</span>
                <span className="stat-sub">Pases registrados</span>
              </div>
              <div className="bms-stat-card primary-border">
                <span className="stat-label">Recaudación en bolivianos</span>
                <span className="stat-val accent-green">{stats ? currency.format(stats.monto_recaudado_bob) : '—'}</span>
                <span className="stat-sub">Pagos reales confirmados</span>
              </div>
            </div>

            {stats?.metricas ? <ManagementMetrics data={stats.metricas} /> : (
              <div className="bms-card">
                {loading ? <p role="status">Cargando métricas…</p> : <button type="button" className="bms-btn-secondary" onClick={() => void loadData()}>Cargar métricas</button>}
              </div>
            )}
          </div>
        )}

        {/* SUBTAB 2: USUARIOS Y ROLES (CU1) */}
        {activeSubTab === 'usuarios' && (
          <div className="fade-in">
            <div className="bms-card">
              <header className="program-catalog-header">
                <h2>Usuarios del sistema</h2>
                <button type="button" className="bms-btn-primary" aria-haspopup="dialog" onClick={() => setRegistrationOpen(true)}><Plus size={15} /> Nuevo operador</button>
              </header>
              {!usuarios.length && <p role="status">{loading ? 'Cargando usuarios…' : 'No hay usuarios registrados.'}</p>}
              <div className="bms-table-container">
                <table className="bms-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Operador</th>
                      <th>CI</th>
                      <th>Correo</th>
                      <th>Roles Asignados</th>
                      <th>Estado</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usuarios.map((u) => {
                      const isSelf = u.id_usuario === currentUser?.id_usuario;
                      return (
                        <tr key={u.id_usuario}>
                          <td><strong>#{u.id_usuario}</strong></td>
                          <td>
                            <strong>{u.nombre} {u.apellidos}</strong>
                            {isSelf && <span style={{ marginLeft: 6, fontSize: '0.6897rem', color: 'var(--color-accent)' }}>(Tu cuenta)</span>}
                          </td>
                          <td>{u.ci}</td>
                          <td>{u.email}</td>
                          <td>
                            {(u.roles || []).map((r: any) => (
                              <span key={r.id} className="bms-pill-badge bms-badge-blue">
                                {r.nombre}
                              </span>
                            ))}
                          </td>
                          <td>
                            <span className={`bms-status-indicator ${u.estado === 'ACTIVO' ? 'status-ok' : 'status-err'}`}>
                              {u.estado}
                            </span>
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: 6 }}>
                              <button
                                className="bms-btn-secondary"
                                onClick={() => setEditingUser(u)}
                                title="Editar datos del operador"
                              >
                                <Edit2 size={12} />
                                <span>Editar</span>
                              </button>
                              <button
                                className="bms-btn-danger"
                                onClick={() => handleDeleteUser(u)}
                                disabled={isSelf}
                                style={{ opacity: isSelf ? 0.4 : 1, cursor: isSelf ? 'not-allowed' : 'pointer' }}
                                title={isSelf ? 'No puede eliminar su propia cuenta' : 'Dar de baja al usuario'}
                              >
                                <Trash2 size={12} />
                                <span>Eliminar</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeSubTab === 'auditoria' && (
          <div className="fade-in">
            <div className="audit-chart-switch admin-audit-switch" role="group" aria-label="Tipo de registro">
              <button type="button" aria-pressed={section === 'accesos'} onClick={() => onSectionChange('accesos')}>Accesos</button>
              <button type="button" aria-pressed={section === 'operaciones'} onClick={() => onSectionChange('operaciones')}>Operaciones</button>
            </div>
            {section === 'accesos' ? <AccessLogView /> : <section className="bms-card">
              <h3 className="bms-card-title">Auditoría de operaciones</h3>
              <div className="bms-table-container">
                <table className="bms-table">
                  <thead>
                    <tr>
                      <th>Fecha de Registro</th>
                      <th>Operador Responsable</th>
                      <th>Modulo / Tabla</th>
                      <th>Operacion</th>
                      <th>Detalle Tecnico</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditoria.map((a) => (
                      <tr key={a.id}>
                        <td><small>{a.fecha_evento}</small></td>
                        <td><strong>{a.usuario?.nombre || 'Sistema Automatico'}</strong></td>
                        <td><code>{a.tabla_afectada}</code></td>
                        <td>
                          <span className="bms-pill-badge bms-badge-cyan">{a.accion}</span>
                        </td>
                        <td>{a.detalle}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>}
          </div>
        )}
      </div>

      {/* MODAL DE EDICIÓN DE USUARIO */}
      {activeSubTab === 'usuarios' && registrationOpen && <OperatorRegistration
        onClose={() => setRegistrationOpen(false)}
        onCreated={() => { setRegistrationOpen(false); void loadData(); }}
      />}
      {editingUser && (
        <div className="config-modal-backdrop" onClick={() => setEditingUser(null)}>
          <div className="config-modal-card" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h3 style={{ margin: 0, fontSize: '1.103rem' }}>Modificar Operador #{editingUser.id_usuario}</h3>
              <button onClick={() => setEditingUser(null)} style={{ background: 'transparent', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const form = e.target as HTMLFormElement;
                const body: any = {
                  nombre: (form.elements.namedItem('edit_nombre') as HTMLInputElement).value,
                  apellidos: (form.elements.namedItem('edit_apellidos') as HTMLInputElement).value,
                  ci: (form.elements.namedItem('edit_ci') as HTMLInputElement).value,
                  email: (form.elements.namedItem('edit_email') as HTMLInputElement).value,
                  rol_id: Number((form.elements.namedItem('edit_rol') as HTMLSelectElement).value),
                  estado: (form.elements.namedItem('edit_estado') as HTMLSelectElement).value
                };
                const newPass = (form.elements.namedItem('edit_pass') as HTMLInputElement).value;
                if (newPass) body.password = newPass;

                try {
                  const res = await bmsApi.updateUsuario(editingUser.id_usuario, body);
                  if (res.success || res.usuario) {
                    notify('Datos del operador actualizados.');
                    setEditingUser(null);
                    loadData();
                  } else notify(res.message || 'No se pudo actualizar el operador.', 'error');
                } catch (err: any) {
                  notify(err.message, 'error');
                }
              }}
            >
              <div className="bms-form-grid">
                <div className="bms-form-group">
                  <label>Nombres</label>
                  <input name="edit_nombre" defaultValue={editingUser.nombre} required />
                </div>
                <div className="bms-form-group">
                  <label>Apellidos</label>
                  <input name="edit_apellidos" defaultValue={editingUser.apellidos} required />
                </div>
                <div className="bms-form-group">
                  <label>CI</label>
                  <input name="edit_ci" defaultValue={editingUser.ci} required />
                </div>
                <div className="bms-form-group">
                  <label>Correo</label>
                  <input name="edit_email" type="email" defaultValue={editingUser.email} required />
                </div>
                <div className="bms-form-group">
                  <label>Rol</label>
                  <select name="edit_rol" defaultValue={editingUser.roles?.[0]?.id || 1}>
                    <option value="1">ADMINISTRADOR</option>
                    <option value="2">PROGRAMADOR</option>
                    <option value="3">ENCARGADO_CONTENIDOS</option>
                  </select>
                </div>
                <div className="bms-form-group">
                  <label>Estado</label>
                  <select name="edit_estado" defaultValue={editingUser.estado || 'ACTIVO'}>
                    <option value="ACTIVO">ACTIVO</option>
                    <option value="INACTIVO">INACTIVO</option>
                  </select>
                </div>
                <div className="bms-form-group" style={{ gridColumn: 'span 2' }}>
                  <label>Nueva Contraseña (dejar en blanco para conservar)</label>
                  <input name="edit_pass" type="password" placeholder="Opcional..." />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 14 }}>
                <button type="button" className="bms-btn-secondary" onClick={() => setEditingUser(null)}>
                  Cancelar
                </button>
                <button type="submit" className="bms-btn-primary">
                  <Check size={14} />
                  <span>Guardar Cambios</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
