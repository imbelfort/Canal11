import React, { useState, useEffect } from 'react';
import { bmsApi } from '../services/bmsApi';

interface BmsWorkspaceProps {
  currentUser: any;
  onLogout: () => void;
}

export const BmsWorkspace: React.FC<BmsWorkspaceProps> = ({ currentUser, onLogout }) => {
  const [activeView, setActiveView] = useState<'dashboard' | 'usuarios' | 'catalogo' | 'parrilla' | 'clientes' | 'pautas' | 'pagos' | 'mam' | 'qc' | 'emision' | 'auditoria'>('dashboard');
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

  // Modal QR
  const [qrModalData, setQrModalData] = useState<{ open: boolean; txId: string; qrImg: string; monto: number; concepto: string } | null>(null);

  // Form states
  const [selectedClienteForSpot, setSelectedClienteForSpot] = useState<number | ''>('');
  const [spotTitulo, setSpotTitulo] = useState('');
  const [spotDuracion, setSpotDuracion] = useState(30);

  // Material Ingest
  const [selectedProgramaForMat, setSelectedProgramaForMat] = useState<number | ''>('');
  const [matTitulo, setMatTitulo] = useState('');
  const [matDuracion, setMatDuracion] = useState(3600);
  const [matFormato, setMatFormato] = useState('HD_1080I');
  const [matRuta, setMatRuta] = useState('');

  // Roles checking
  const userRoles: string[] = currentUser?.roles || [];
  const isAdmin = userRoles.some(r => r.includes('ADMIN'));
  const isProg = userRoles.some(r => r.includes('PROG'));
  const isQC = userRoles.some(r => r.includes('CONT') || r.includes('QC'));

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
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

  const handleSpotFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const clean = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
    setSpotTitulo(clean);

    try {
      const v = document.createElement('video');
      v.preload = 'metadata';
      v.onloadedmetadata = () => {
        window.URL.revokeObjectURL(v.src);
        if (v.duration && !isNaN(v.duration)) setSpotDuracion(Math.round(v.duration));
      };
      v.src = URL.createObjectURL(file);
    } catch {
      setSpotDuracion(30);
    }
  };

  const handleCreateSpotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClienteForSpot) {
      alert('Seleccione un cliente anunciante.');
      return;
    }
    const res = await bmsApi.createSpot({
      id_cliente: Number(selectedClienteForSpot),
      titulo_spot: spotTitulo,
      duracion_segundos: spotDuracion
    });
    if (res.success) {
      alert(`Spot vinculado con exito al cliente con codigo: ${res.spot.codigo_spot}`);
      setSpotTitulo('');
      const sp = await bmsApi.getSpots();
      const cl = await bmsApi.getClientes();
      setSpots(sp);
      setClientes(cl);
    }
  };

  const handleMaterialFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setMatTitulo(file.name);
    setMatRuta((file as any).path || `/mam/storage/${file.name}`);

    try {
      const v = document.createElement('video');
      v.preload = 'metadata';
      v.onloadedmetadata = () => {
        window.URL.revokeObjectURL(v.src);
        if (v.duration && !isNaN(v.duration)) setMatDuracion(Math.round(v.duration));
      };
      v.src = URL.createObjectURL(file);
    } catch {
      setMatDuracion(3600);
    }
  };

  const handleCreateMaterialSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProgramaForMat) {
      alert('Seleccione un programa asociado.');
      return;
    }
    const res = await bmsApi.createMaterial({
      id_programa: Number(selectedProgramaForMat),
      titulo_clip: matTitulo,
      duracion_segundos: matDuracion,
      formato: matFormato,
      ruta_servidor: matRuta
    });
    if (res.success) {
      alert(`Clip ingestado con exito en MAM con codigo: ${res.material.codigo_material}`);
      setMatTitulo('');
      setMatRuta('');
      const m = await bmsApi.getMateriales();
      setMateriales(m);
    }
  };

  const handleGenerarCobroQr = async (clienteId: number, monto: number, concepto: string) => {
    const res = await bmsApi.generarPagoQr({
      id_cliente: clienteId,
      monto,
      concepto
    });
    if (res.success) {
      setQrModalData({
        open: true,
        txId: res.transaccion_id,
        qrImg: res.qr_imagen,
        monto: res.monto,
        concepto
      });
    }
  };

  const handleVerificarPago = async () => {
    if (!qrModalData) return;
    const res = await bmsApi.confirmarPago(qrModalData.txId);
    if (res.pago.estado === 'PAGADO') {
      alert('PagoFácil confirmó el pago.');
      setQrModalData(null);
      const st = await bmsApi.getReporteGeneral();
      setStats(st);
      if (activeView === 'pagos') {
        const pg = await bmsApi.getPagos();
        setPagos(pg);
      }
    } else alert(`Estado del cobro: ${res.pago.estado}.`);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Subnavegación de Vistas por Rol */}
      <nav style={{ display: 'flex', gap: 6, padding: '8px 16px', background: 'var(--color-canvas-soft, #1e293b)', borderBottom: '1px solid var(--color-hairline, #334155)', overflowX: 'auto' }}>
        <button className={`tab-btn ${activeView === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveView('dashboard')}>
          Panel General
        </button>

        {isAdmin && (
          <>
            <button className={`tab-btn ${activeView === 'usuarios' ? 'active' : ''}`} onClick={async () => { setActiveView('usuarios'); setUsuarios(await bmsApi.getUsuarios()); }}>
              Usuarios y Roles (CU1)
            </button>
            <button className={`tab-btn ${activeView === 'auditoria' ? 'active' : ''}`} onClick={async () => { setActiveView('auditoria'); setAuditoria(await bmsApi.getAuditoria()); }}>
              Bitacora Auditoria (CU7)
            </button>
          </>
        )}

        {(isAdmin || isProg) && (
          <>
            <button className={`tab-btn ${activeView === 'catalogo' ? 'active' : ''}`} onClick={async () => { setActiveView('catalogo'); setProgramas(await bmsApi.getProgramas()); }}>
              Catalogo Programas (CU2)
            </button>
            <button className={`tab-btn ${activeView === 'parrilla' ? 'active' : ''}`} onClick={async () => { setActiveView('parrilla'); setParrillaHoy(await bmsApi.getParrillaHoy()); }}>
              Parrilla y Rundown (CU3)
            </button>
            <button className={`tab-btn ${activeView === 'clientes' ? 'active' : ''}`} onClick={async () => { setActiveView('clientes'); setClientes(await bmsApi.getClientes()); }}>
              Clientes y Spots (CU6)
            </button>
            <button className={`tab-btn ${activeView === 'pautas' ? 'active' : ''}`} onClick={async () => { setActiveView('pautas'); setPautas(await bmsApi.getPautas()); }}>
              Pauta de Emision (CU6)
            </button>
            <button className={`tab-btn ${activeView === 'pagos' ? 'active' : ''}`} onClick={async () => { setActiveView('pagos'); setPagos(await bmsApi.getPagos()); }}>
              Modulo PagoFacil QR
            </button>
          </>
        )}

        {(isAdmin || isQC) && (
          <>
            <button className={`tab-btn ${activeView === 'mam' ? 'active' : ''}`} onClick={async () => { setActiveView('mam'); setMateriales(await bmsApi.getMateriales()); }}>
              MAM - Materiales Video (CU4)
            </button>
            <button className={`tab-btn ${activeView === 'qc' ? 'active' : ''}`} onClick={async () => { setActiveView('qc'); setValidaciones(await bmsApi.getValidaciones()); }}>
              Control Calidad QC (CU5)
            </button>
            <button className={`tab-btn ${activeView === 'emision' ? 'active' : ''}`} onClick={async () => { setActiveView('emision'); setEmisiones(await bmsApi.getEmisiones()); }}>
              As-Run Log / Emision Real (CU7)
            </button>
          </>
        )}
      </nav>

      {/* Área Principal de Trabajo */}
      <div style={{ flex: 1, padding: 16, overflowY: 'auto' }}>
        {/* DASHBOARD */}
        {activeView === 'dashboard' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 16 }}>
              <div style={{ background: 'var(--color-field, #0f172a)', padding: 14, borderRadius: 8, border: '1px solid var(--color-hairline, #334155)' }}>
                <div style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase' }}>Usuarios Activos</div>
                <div style={{ fontSize: 24, fontWeight: 700 }}>{stats.total_usuarios || 0}</div>
              </div>
              <div style={{ background: 'var(--color-field, #0f172a)', padding: 14, borderRadius: 8, border: '1px solid var(--color-hairline, #334155)' }}>
                <div style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase' }}>Programas Catálogo</div>
                <div style={{ fontSize: 24, fontWeight: 700 }}>{stats.total_programas || 0}</div>
              </div>
              <div style={{ background: 'var(--color-field, #0f172a)', padding: 14, borderRadius: 8, border: '1px solid var(--color-hairline, #334155)' }}>
                <div style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase' }}>Bloques Horarios</div>
                <div style={{ fontSize: 24, fontWeight: 700 }}>{stats.total_bloques || 0}</div>
              </div>
              <div style={{ background: 'var(--color-field, #0f172a)', padding: 14, borderRadius: 8, border: '1px solid var(--color-hairline, #334155)' }}>
                <div style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase' }}>Clips MAM Listos</div>
                <div style={{ fontSize: 24, fontWeight: 700 }}>{stats.materiales_listos || 0}</div>
              </div>
              <div style={{ background: 'var(--color-field, #0f172a)', padding: 14, borderRadius: 8, border: '1px solid var(--color-hairline, #334155)' }}>
                <div style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase' }}>Recaudado PagoFacil</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: '#4ade80' }}>Bs. {stats.monto_recaudado_bob || 0}</div>
              </div>
            </div>

            <div style={{ background: 'var(--color-canvas-soft, #1e293b)', padding: 16, borderRadius: 12, border: '1px solid var(--color-hairline, #334155)' }}>
              <h3 style={{ margin: '0 0 12px', fontSize: 15 }}>Programacion Oficial de Hoy (Rundown Activo)</h3>
              {parrillaHoy ? (
                <div>
                  <div style={{ display: 'flex', gap: 16, marginBottom: 12, fontSize: 13 }}>
                    <span><strong>Fecha:</strong> {parrillaHoy.fecha}</span>
                    <span><strong>Canal / Señal:</strong> {parrillaHoy.canal_senial}</span>
                    <span><strong>Estado:</strong> {parrillaHoy.estado}</span>
                  </div>
                  <table className="bms-table" style={{ width: '100%' }}>
                    <thead>
                      <tr>
                        <th>Horario</th>
                        <th>Programa</th>
                        <th>Tipo</th>
                        <th>Estado</th>
                        <th>Pautas</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(parrillaHoy.items || []).map((it: any) => (
                        <tr key={it.id}>
                          <td><strong>{it.hora_inicio} - {it.hora_fin}</strong></td>
                          <td>{it.programa?.titulo || 'N/A'}</td>
                          <td>{it.tipo_emision}</td>
                          <td>{it.estado}</td>
                          <td>{(it.pautas || []).length} comerciales</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : <div>Cargando programacion...</div>}
            </div>
          </div>
        )}

        {/* CLIENTES Y SPOTS (VENTANA SEPARADA) */}
        {activeView === 'clientes' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              {/* Nuevo Cliente */}
              <div style={{ background: 'var(--color-canvas-soft, #1e293b)', padding: 16, borderRadius: 12, border: '1px solid var(--color-hairline, #334155)' }}>
                <h3 style={{ margin: '0 0 12px', fontSize: 14 }}>Nuevo Anunciante Publicitario</h3>
                <form onSubmit={async (e) => {
                  e.preventDefault();
                  const form = e.target as HTMLFormElement;
                  const razon = (form.elements.namedItem('razon') as HTMLInputElement).value;
                  const nit = (form.elements.namedItem('nit') as HTMLInputElement).value;
                  const contacto = (form.elements.namedItem('contacto') as HTMLInputElement).value;
                  const res = await bmsApi.createCliente({ razon_social: razon, nit, contacto });
                  if (res.success) {
                    alert('Cliente guardado con exito.');
                    form.reset();
                    setClientes(await bmsApi.getClientes());
                  }
                }}>
                  <div style={{ marginBottom: 8 }}>
                    <label style={{ fontSize: 11, color: '#94a3b8' }}>Razon Social</label>
                    <input name="razon" required style={{ width: '100%', padding: 8, background: '#0f172a', border: '1px solid #334155', color: '#fff', borderRadius: 6 }} />
                  </div>
                  <div style={{ marginBottom: 8 }}>
                    <label style={{ fontSize: 11, color: '#94a3b8' }}>NIT</label>
                    <input name="nit" required style={{ width: '100%', padding: 8, background: '#0f172a', border: '1px solid #334155', color: '#fff', borderRadius: 6 }} />
                  </div>
                  <div style={{ marginBottom: 12 }}>
                    <label style={{ fontSize: 11, color: '#94a3b8' }}>Contacto</label>
                    <input name="contacto" style={{ width: '100%', padding: 8, background: '#0f172a', border: '1px solid #334155', color: '#fff', borderRadius: 6 }} />
                  </div>
                  <button type="submit" className="btn-action">Guardar Cliente</button>
                </form>
              </div>

              {/* Vincular Spot */}
              <div style={{ background: 'var(--color-canvas-soft, #1e293b)', padding: 16, borderRadius: 12, border: '1px solid var(--color-hairline, #334155)' }}>
                <h3 style={{ margin: '0 0 12px', fontSize: 14 }}>Vincular Spot Comercial (Seleccionar Video)</h3>
                <form onSubmit={handleCreateSpotSubmit}>
                  <div style={{ marginBottom: 8 }}>
                    <label style={{ fontSize: 11, color: '#94a3b8' }}>Cliente Titular</label>
                    <select
                      value={selectedClienteForSpot}
                      onChange={(e) => setSelectedClienteForSpot(Number(e.target.value))}
                      required
                      style={{ width: '100%', padding: 8, background: '#0f172a', border: '1px solid #334155', color: '#fff', borderRadius: 6 }}
                    >
                      <option value="">(Seleccione Cliente)</option>
                      {clientes.map(c => <option key={c.id} value={c.id}>{c.razon_social} (NIT: {c.nit})</option>)}
                    </select>
                  </div>
                  <div style={{ marginBottom: 8 }}>
                    <label style={{ fontSize: 11, color: '#94a3b8' }}>Seleccionar Archivo de Spot (*.mp4, *.mov, *.mxf)</label>
                    <input type="file" accept="video/*,.mp4,.mov,.mxf" onChange={handleSpotFileChange} style={{ width: '100%', padding: 4 }} />
                  </div>
                  <div style={{ marginBottom: 8 }}>
                    <label style={{ fontSize: 11, color: '#94a3b8' }}>Titulo Comercial</label>
                    <input value={spotTitulo} onChange={(e) => setSpotTitulo(e.target.value)} required style={{ width: '100%', padding: 8, background: '#0f172a', border: '1px solid #334155', color: '#fff', borderRadius: 6 }} />
                  </div>
                  <div style={{ marginBottom: 12 }}>
                    <label style={{ fontSize: 11, color: '#94a3b8' }}>Duracion Detectada (Segundos)</label>
                    <input type="number" value={spotDuracion} onChange={(e) => setSpotDuracion(Number(e.target.value))} required style={{ width: '100%', padding: 8, background: '#0f172a', border: '1px solid #334155', color: '#fff', borderRadius: 6 }} />
                  </div>
                  <button type="submit" className="btn-action">Vincular Spot al Cliente</button>
                </form>
              </div>
            </div>

            {/* Cartera de Clientes */}
            <div style={{ background: 'var(--color-canvas-soft, #1e293b)', padding: 16, borderRadius: 12, border: '1px solid var(--color-hairline, #334155)' }}>
              <h3 style={{ margin: '0 0 12px', fontSize: 14 }}>Cartera de Clientes Anunciantes y Spots Vinculados</h3>
              <table className="bms-table" style={{ width: '100%' }}>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Razon Social</th>
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
                            <span key={s.id} style={{ display: 'inline-block', margin: 2, padding: '2px 6px', background: '#334155', borderRadius: 4, fontSize: 11 }}>
                              {s.codigo_spot} ({s.duracion_segundos}s)
                            </span>
                          ))
                        ) : <span style={{ color: '#64748b', fontSize: 11 }}>Sin spots</span>}
                      </td>
                      <td>
                        <button className="btn-action btn-secondary" style={{ padding: '3px 8px', fontSize: 11, marginRight: 6 }} onClick={() => setSelectedClienteForSpot(c.id)}>
                          + Spot
                        </button>
                        <button className="btn-action" style={{ padding: '3px 8px', fontSize: 11 }} onClick={() => handleGenerarCobroQr(c.id, 500, `Pauta Publicitaria ${c.razon_social}`)}>
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

        {/* PAUTA DE EMISION (VENTANA SEPARADA) */}
        {activeView === 'pautas' && (
          <div>
            <div style={{ background: 'var(--color-canvas-soft, #1e293b)', padding: 16, borderRadius: 12, border: '1px solid var(--color-hairline, #334155)', marginBottom: 16 }}>
              <h3 style={{ margin: '0 0 12px', fontSize: 14 }}>Insertar Spot en Tanda de Transmision (Pauta Comercial)</h3>
              <form onSubmit={async (e) => {
                e.preventDefault();
                const form = e.target as HTMLFormElement;
                const idItem = (form.elements.namedItem('item') as HTMLSelectElement).value;
                const idSpot = (form.elements.namedItem('spot') as HTMLSelectElement).value;
                const tanda = (form.elements.namedItem('tanda') as HTMLSelectElement).value;
                const orden = (form.elements.namedItem('orden') as HTMLInputElement).value;
                const res = await bmsApi.createPauta({
                  id_item_parrilla: Number(idItem),
                  id_spot: Number(idSpot),
                  tanda_bloque: tanda,
                  orden: Number(orden)
                });
                if (res.success) {
                  alert('Spot pautado exitosamente.');
                  setPautas(await bmsApi.getPautas());
                }
              }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 12 }}>
                  <div>
                    <label style={{ fontSize: 11, color: '#94a3b8' }}>Bloque Horario de Parrilla</label>
                    <select name="item" required style={{ width: '100%', padding: 8, background: '#0f172a', border: '1px solid #334155', color: '#fff', borderRadius: 6 }}>
                      {(parrillaHoy?.items || []).map((it: any) => (
                        <option key={it.id} value={it.id}>{it.hora_inicio} - {it.programa?.titulo || 'Bloque ' + it.id}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: '#94a3b8' }}>Spot Comercial del Cliente</label>
                    <select name="spot" required style={{ width: '100%', padding: 8, background: '#0f172a', border: '1px solid #334155', color: '#fff', borderRadius: 6 }}>
                      {spots.map(s => <option key={s.id} value={s.id}>[{s.cliente?.razon_social || 'Cliente'}] {s.codigo_spot} - {s.titulo_spot} ({s.duracion_segundos}s)</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: '#94a3b8' }}>Tanda del Bloque</label>
                    <select name="tanda" style={{ width: '100%', padding: 8, background: '#0f172a', border: '1px solid #334155', color: '#fff', borderRadius: 6 }}>
                      <option value="CORTE_1">CORTE_1</option>
                      <option value="CORTE_2">CORTE_2</option>
                      <option value="CORTE_3">CORTE_3</option>
                      <option value="INICIO_PROGRAMA">INICIO_PROGRAMA</option>
                      <option value="FIN_PROGRAMA">FIN_PROGRAMA</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: '#94a3b8' }}>Orden en la Tanda</label>
                    <input name="orden" type="number" defaultValue={1} min={1} max={10} style={{ width: '100%', padding: 8, background: '#0f172a', border: '1px solid #334155', color: '#fff', borderRadius: 6 }} />
                  </div>
                </div>
                <button type="submit" className="btn-action">Insertar en Pauta</button>
              </form>
            </div>

            <div style={{ background: 'var(--color-canvas-soft, #1e293b)', padding: 16, borderRadius: 12, border: '1px solid var(--color-hairline, #334155)' }}>
              <h3 style={{ margin: '0 0 12px', fontSize: 14 }}>Pautas Comerciales en la Parrilla</h3>
              <table className="bms-table" style={{ width: '100%' }}>
                <thead>
                  <tr>
                    <th>Programa Emisor</th>
                    <th>Spot Comercial</th>
                    <th>Anunciante</th>
                    <th>Tanda</th>
                    <th>Orden</th>
                    <th>Duracion</th>
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

        {/* MAM - MATERIALES DE VIDEO (CU4) */}
        {activeView === 'mam' && (
          <div>
            <div style={{ background: 'var(--color-canvas-soft, #1e293b)', padding: 16, borderRadius: 12, border: '1px solid var(--color-hairline, #334155)', marginBottom: 16 }}>
              <h3 style={{ margin: '0 0 12px', fontSize: 14 }}>Ingesta Automatica de Video MAM (Cero Tipeo de Nombre/Ruta)</h3>
              <form onSubmit={handleCreateMaterialSubmit}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginBottom: 12 }}>
                  <div>
                    <label style={{ fontSize: 11, color: '#94a3b8' }}>Seleccionar Archivo de Video</label>
                    <input type="file" accept="video/*,.mxf,.mov,.mp4,.ts" onChange={handleMaterialFileChange} style={{ width: '100%', padding: 4 }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: '#94a3b8' }}>Programa Asociado</label>
                    <select value={selectedProgramaForMat} onChange={(e) => setSelectedProgramaForMat(Number(e.target.value))} required style={{ width: '100%', padding: 8, background: '#0f172a', border: '1px solid #334155', color: '#fff', borderRadius: 6 }}>
                      <option value="">(Seleccione Programa)</option>
                      {programas.map(p => <option key={p.id} value={p.id}>{p.codigo} - {p.titulo}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: '#94a3b8' }}>Nombre Detectado</label>
                    <input value={matTitulo} readOnly style={{ width: '100%', padding: 8, background: '#0f172a', border: '1px solid #334155', color: '#94a3b8', borderRadius: 6 }} placeholder="Se extrae al seleccionar archivo" />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: '#94a3b8' }}>Duracion (Segundos)</label>
                    <input type="number" value={matDuracion} onChange={(e) => setMatDuracion(Number(e.target.value))} style={{ width: '100%', padding: 8, background: '#0f172a', border: '1px solid #334155', color: '#fff', borderRadius: 6 }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: '#94a3b8' }}>Formato</label>
                    <select value={matFormato} onChange={(e) => setMatFormato(e.target.value)} style={{ width: '100%', padding: 8, background: '#0f172a', border: '1px solid #334155', color: '#fff', borderRadius: 6 }}>
                      <option value="HD_1080I">HD 1080i</option>
                      <option value="HD_720P">HD 720p</option>
                      <option value="4K_UHD">4K UHD</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: '#94a3b8' }}>Ruta Servidor Storage</label>
                    <input value={matRuta} readOnly style={{ width: '100%', padding: 8, background: '#0f172a', border: '1px solid #334155', color: '#94a3b8', borderRadius: 6 }} />
                  </div>
                </div>
                <button type="submit" className="btn-action">Ingestar en MAM</button>
              </form>
            </div>

            <div style={{ background: 'var(--color-canvas-soft, #1e293b)', padding: 16, borderRadius: 12, border: '1px solid var(--color-hairline, #334155)' }}>
              <h3 style={{ margin: '0 0 12px', fontSize: 14 }}>Activos Digitales en Servidor MAM</h3>
              <table className="bms-table" style={{ width: '100%' }}>
                <thead>
                  <tr>
                    <th>Codigo MAM</th>
                    <th>Clip</th>
                    <th>Programa</th>
                    <th>Duracion</th>
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
                      <td>{m.estado}</td>
                      <td><code>{m.ruta_servidor}</code></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* PAGOS PAGOFACIL */}
        {activeView === 'pagos' && (
          <div>
            <div style={{ background: 'var(--color-canvas-soft, #1e293b)', padding: 16, borderRadius: 12, border: '1px solid var(--color-hairline, #334155)', marginBottom: 16 }}>
              <h3 style={{ margin: '0 0 12px', fontSize: 14 }}>Generar Cobro QR PagoFacil Bolivia</h3>
              <form onSubmit={async (e) => {
                e.preventDefault();
                const form = e.target as HTMLFormElement;
                const cliId = Number((form.elements.namedItem('cliente') as HTMLSelectElement).value);
                const monto = Number((form.elements.namedItem('monto') as HTMLInputElement).value);
                const concepto = (form.elements.namedItem('concepto') as HTMLInputElement).value;
                handleGenerarCobroQr(cliId, monto, concepto);
              }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 12 }}>
                  <div>
                    <label style={{ fontSize: 11, color: '#94a3b8' }}>Cliente Anunciante</label>
                    <select name="cliente" required style={{ width: '100%', padding: 8, background: '#0f172a', border: '1px solid #334155', color: '#fff', borderRadius: 6 }}>
                      {clientes.map(c => <option key={c.id} value={c.id}>{c.razon_social} (NIT: {c.nit})</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: '#94a3b8' }}>Monto (BOB)</label>
                    <input name="monto" type="number" defaultValue={500} step="0.5" required style={{ width: '100%', padding: 8, background: '#0f172a', border: '1px solid #334155', color: '#fff', borderRadius: 6 }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: '#94a3b8' }}>Concepto</label>
                    <input name="concepto" defaultValue="Pauta Publicitaria Televisiva" required style={{ width: '100%', padding: 8, background: '#0f172a', border: '1px solid #334155', color: '#fff', borderRadius: 6 }} />
                  </div>
                </div>
                <button type="submit" className="btn-action">Generar Codigo QR PagoFacil</button>
              </form>
            </div>

            <div style={{ background: 'var(--color-canvas-soft, #1e293b)', padding: 16, borderRadius: 12, border: '1px solid var(--color-hairline, #334155)' }}>
              <h3 style={{ margin: '0 0 12px', fontSize: 14 }}>Transacciones PagoFacil Registradas</h3>
              <table className="bms-table" style={{ width: '100%' }}>
                <thead>
                  <tr>
                    <th>ID Transaccion</th>
                    <th>Cliente</th>
                    <th>Monto</th>
                    <th>Concepto</th>
                    <th>Estado</th>
                    <th>Accion</th>
                  </tr>
                </thead>
                <tbody>
                  {pagos.map(p => (
                    <tr key={p.id}>
                      <td><code>{p.transaccion_id}</code></td>
                      <td>{p.cliente?.razon_social || 'N/A'}</td>
                      <td><strong>{p.moneda} {p.monto}</strong></td>
                      <td>{p.concepto}</td>
                      <td><span style={{ color: p.estado === 'PAGADO' ? '#4ade80' : '#facc15' }}>{p.estado}</span></td>
                      <td>
                        {p.estado === 'PENDIENTE' && (
                          <button className="btn-action" style={{ padding: '3px 8px', fontSize: 11 }} onClick={() => setQrModalData({ open: true, txId: p.transaccion_id, qrImg: p.qr_imagen, monto: p.monto, concepto: p.concepto })}>
                            Ver QR
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Modal QR PagoFacil */}
      {qrModalData && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 16, padding: 24, maxWidth: 380, width: '90%', textAlign: 'center' }}>
            <h3 style={{ margin: 0, color: '#38bdf8' }}>Codigo QR PagoFacil Bolivia</h3>
            <p style={{ fontSize: 12, color: '#94a3b8', margin: '8px 0' }}>{qrModalData.concepto}</p>
            <img src={qrModalData.qrImg} alt="QR" style={{ width: 220, height: 220, margin: '12px auto', background: '#fff', padding: 8, borderRadius: 8 }} />
            <div style={{ fontSize: 18, fontWeight: 700, color: '#4ade80', marginBottom: 16 }}>Total: Bs. {qrModalData.monto}</div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
              <button className="btn-action" onClick={() => void handleVerificarPago().catch(error => alert(error.message))}>Verificar pago</button>
              <button className="btn-action btn-secondary" onClick={() => setQrModalData(null)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
