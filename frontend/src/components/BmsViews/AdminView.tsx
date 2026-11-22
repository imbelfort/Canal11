import React, { useState, useEffect } from 'react';
import { bmsApi } from '../../services/bmsApi';
import { Users, Shield, FileText, CheckCircle, BarChart3, UserCheck } from 'lucide-react';

export const AdminView: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'usuarios' | 'auditoria'>('overview');
  const [stats, setStats] = useState<any>({});
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [auditoria, setAuditoria] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, [activeSubTab]);

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
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bms-container">
      {/* Sub-navegacion estilizada */}
      <div className="bms-subnav">
        <button
          className={`bms-tab-btn ${activeSubTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('overview')}
        >
          <BarChart3 size={15} />
          <span>Panel Gerencial y Metricas (CU8)</span>
        </button>
        <button
          className={`bms-tab-btn ${activeSubTab === 'usuarios' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('usuarios')}
        >
          <Users size={15} />
          <span>Gestion de Personal y Roles (CU1)</span>
        </button>
        <button
          className={`bms-tab-btn ${activeSubTab === 'auditoria' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('auditoria')}
        >
          <Shield size={15} />
          <span>Bitacora Oficial de Auditoria (CU7)</span>
        </button>
      </div>

      <div className="bms-content-area">
        {/* SUBTAB 1: PANEL GERENCIAL */}
        {activeSubTab === 'overview' && (
          <div className="fade-in">
            <div className="bms-grid-stats">
              <div className="bms-stat-card">
                <span className="stat-label">Personal Activo</span>
                <span className="stat-val">{stats.total_usuarios || 0}</span>
                <span className="stat-sub">Operadores con acceso</span>
              </div>
              <div className="bms-stat-card">
                <span className="stat-label">Programas en Catalogo</span>
                <span className="stat-val">{stats.total_programas || 0}</span>
                <span className="stat-sub">Formatos registrados</span>
              </div>
              <div className="bms-stat-card">
                <span className="stat-label">Bloques en Continuidad</span>
                <span className="stat-val">{stats.total_bloques || 0}</span>
                <span className="stat-sub">Programados en parrilla</span>
              </div>
              <div className="bms-stat-card">
                <span className="stat-label">Comerciales Pautados</span>
                <span className="stat-val">{stats.total_pautas || 0}</span>
                <span className="stat-sub">Spots vinculados</span>
              </div>
              <div className="bms-stat-card primary-border">
                <span className="stat-label">Recaudacion PagoFacil</span>
                <span className="stat-val accent-green">Bs. {stats.monto_recaudado_bob || 0}</span>
                <span className="stat-sub">{stats.total_pagos || 0} transacciones QR</span>
              </div>
            </div>

            <div className="bms-card">
              <h3 className="bms-card-title">Resumen de Control Maestro - Canal 11 (Grupo 12 SC)</h3>
              <p className="bms-text-muted">
                Este panel centraliza la toma de decisiones y gobernanza de la estacion de television.
                Desde aqui podra supervisar las emisiones legales, auditar cambios de operadores y fiscalizar la recaudacion de publicidad comercial.
              </p>
            </div>
          </div>
        )}

        {/* SUBTAB 2: USUARIOS Y ROLES (CU1) */}
        {activeSubTab === 'usuarios' && (
          <div className="fade-in">
            <div className="bms-card">
              <h3 className="bms-card-title">Alta de Nuevo Operador del Canal (CU1)</h3>
              <form
                onSubmit={async (e) => {
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
                  try {
                    const res = await bmsApi.createUsuario(body);
                    if (res.success || res.id_usuario) {
                      alert('Operador registrado satisfactoriamente');
                      form.reset();
                      loadData();
                    } else {
                      alert('Error al registrar operador: ' + (res.message || 'Verifique los datos'));
                    }
                  } catch (err: any) {
                    alert('Fallo de comunicacion: ' + err.message);
                  }
                }}
              >
                <div className="bms-form-grid">
                  <div className="bms-form-group">
                    <label>Nombres</label>
                    <input name="nombre" required placeholder="Carlos" />
                  </div>
                  <div className="bms-form-group">
                    <label>Apellidos</label>
                    <input name="apellidos" required placeholder="Roca" />
                  </div>
                  <div className="bms-form-group">
                    <label>Cedula de Identidad</label>
                    <input name="ci" required placeholder="4587123" />
                  </div>
                  <div className="bms-form-group">
                    <label>Correo Institucional</label>
                    <input name="email" type="email" required placeholder="operador@canal11.bo" />
                  </div>
                  <div className="bms-form-group">
                    <label>Contraseña Temporal</label>
                    <input name="pass" type="password" required placeholder="••••••••" />
                  </div>
                  <div className="bms-form-group">
                    <label>Rol Funcional</label>
                    <select name="rol">
                      <option value="1">ADMINISTRADOR</option>
                      <option value="2">PROGRAMADOR</option>
                      <option value="3">ENCARGADO_CONTENIDOS</option>
                    </select>
                  </div>
                </div>
                <button type="submit" className="bms-btn-primary">
                  <UserCheck size={14} />
                  <span>Registrar Operador</span>
                </button>
              </form>
            </div>

            <div className="bms-card">
              <h3 className="bms-card-title">Plantel Activo de Usuarios</h3>
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
                    </tr>
                  </thead>
                  <tbody>
                    {usuarios.map((u) => (
                      <tr key={u.id_usuario}>
                        <td><strong>#{u.id_usuario}</strong></td>
                        <td>{u.nombre} {u.apellidos}</td>
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
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* SUBTAB 3: AUDITORIA (CU7) */}
        {activeSubTab === 'auditoria' && (
          <div className="fade-in">
            <div className="bms-card">
              <h3 className="bms-card-title">Bitacora Notariada de Auditoria del Sistema (CU7)</h3>
              <p className="bms-text-muted">Registro inmutable de todas las acciones operativas realizadas en la plataforma.</p>
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
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
