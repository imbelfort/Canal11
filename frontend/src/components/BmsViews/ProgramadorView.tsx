import React, { useState, useEffect } from 'react';
import { bmsApi } from '../../services/bmsApi';
import { Calendar, Layers, Tv, CreditCard, Plus, CheckCircle, QrCode, FileText, UserPlus, Film } from 'lucide-react';

export const ProgramadorView: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'parrilla' | 'catalogo' | 'clientes' | 'spots' | 'pautas' | 'pagos'>('parrilla');
  const [parrillaHoy, setParrillaHoy] = useState<any>(null);
  const [programas, setProgramas] = useState<any[]>([]);
  const [categorias, setCategorias] = useState<any[]>([]);
  const [clientes, setClientes] = useState<any[]>([]);
  const [spots, setSpots] = useState<any[]>([]);
  const [pautas, setPautas] = useState<any[]>([]);
  const [pagos, setPagos] = useState<any[]>([]);

  // Modal QR PagoFacil
  const [qrModal, setQrModal] = useState<{ open: boolean; txId: string; qrImg: string; monto: number; concepto: string } | null>(null);

  useEffect(() => {
    loadData();
  }, [activeSubTab]);

  const loadData = async () => {
    try {
      if (activeSubTab === 'parrilla') {
        const ph = await bmsApi.getParrillaHoy();
        const pr = await bmsApi.getProgramas();
        setParrillaHoy(ph);
        setProgramas(pr);
      } else if (activeSubTab === 'catalogo') {
        const pr = await bmsApi.getProgramas();
        const cat = await bmsApi.getCategorias();
        setProgramas(pr);
        setCategorias(cat);
      } else if (activeSubTab === 'clientes') {
        const cl = await bmsApi.getClientes();
        setClientes(cl);
      } else if (activeSubTab === 'spots') {
        const sp = await bmsApi.getSpots();
        const cl = await bmsApi.getClientes();
        setSpots(sp);
        setClientes(cl);
      } else if (activeSubTab === 'pautas') {
        const pt = await bmsApi.getPautas();
        const ph = await bmsApi.getParrillaHoy();
        const sp = await bmsApi.getSpots();
        setPautas(pt);
        setParrillaHoy(ph);
        setSpots(sp);
      } else if (activeSubTab === 'pagos') {
        const pg = await bmsApi.getPagos();
        setPagos(pg);
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="bms-container">
      {/* Subnavegacion estilizada */}
      <div className="bms-subnav">
        <button
          className={`bms-tab-btn ${activeSubTab === 'parrilla' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('parrilla')}
        >
          <Calendar size={15} />
          <span>Parrilla y Escaleta Diaria (CU3)</span>
        </button>
        <button
          className={`bms-tab-btn ${activeSubTab === 'catalogo' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('catalogo')}
        >
          <Tv size={15} />
          <span>Catalogo de Programas (CU2)</span>
        </button>
        <button
          className={`bms-tab-btn ${activeSubTab === 'clientes' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('clientes')}
        >
          <UserPlus size={15} />
          <span>Clientes Publicitarios (CU6)</span>
        </button>
        <button
          className={`bms-tab-btn ${activeSubTab === 'spots' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('spots')}
        >
          <Film size={15} />
          <span>Spots Publicitarios (CU6)</span>
        </button>
        <button
          className={`bms-tab-btn ${activeSubTab === 'pautas' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('pautas')}
        >
          <Layers size={15} />
          <span>Pauta y Tandas Comerciales (CU6)</span>
        </button>
        <button
          className={`bms-tab-btn ${activeSubTab === 'pagos' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('pagos')}
        >
          <CreditCard size={15} />
          <span>Cobros y QR PagoFacil</span>
        </button>
      </div>

      <div className="bms-content-area">
        {/* PARRILLA (CU3) */}
        {activeSubTab === 'parrilla' && (
          <div className="fade-in">
            <div className="bms-card">
              <h3 className="bms-card-title">Asignar Bloque Horario a la Parrilla (CU3 Escaleta)</h3>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const form = e.target as HTMLFormElement;
                  const body = {
                    id_parrilla: parrillaHoy?.id_parrilla || 1,
                    id_programa: Number((form.elements.namedItem('id_prog') as HTMLSelectElement).value),
                    hora_inicio: (form.elements.namedItem('inicio') as HTMLInputElement).value,
                    hora_fin: (form.elements.namedItem('fin') as HTMLInputElement).value,
                    tipo_emision: (form.elements.namedItem('tipo') as HTMLSelectElement).value,
                    observaciones: (form.elements.namedItem('obs') as HTMLInputElement).value
                  };
                  const res = await bmsApi.addItemParrilla(body);
                  if (res.success || res.item) {
                    alert('Bloque horario agregado a la parrilla exitosamente.');
                    form.reset();
                    loadData();
                  }
                }}
              >
                <div className="bms-form-grid">
                  <div className="bms-form-group">
                    <label>Programa a Emitir</label>
                    <select name="id_prog" required>
                      {programas.map((p) => (
                        <option key={p.id_programa} value={p.id_programa}>
                          {p.codigo} - {p.titulo} ({p.duracion_estandar_minutos} min)
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="bms-form-group">
                    <label>Hora Inicio (HH:MM)</label>
                    <input name="inicio" type="time" required defaultValue="12:00" />
                  </div>
                  <div className="bms-form-group">
                    <label>Hora Fin (HH:MM)</label>
                    <input name="fin" type="time" required defaultValue="13:00" />
                  </div>
                  <div className="bms-form-group">
                    <label>Tipo de Emision</label>
                    <select name="tipo">
                      <option value="GRABADO">GRABADO (Archivo Digital)</option>
                      <option value="VIVO">VIVO (Estudio Central)</option>
                      <option value="RETRANSMISION">RETRANSMISION</option>
                    </select>
                  </div>
                  <div className="bms-form-group" style={{ gridColumn: 'span 2' }}>
                    <label>Observaciones de Continuidad</label>
                    <input name="obs" placeholder="Emision especial con tanda publicitaria central" />
                  </div>
                </div>
                <button type="submit" className="bms-btn-primary">
                  <Plus size={14} />
                  <span>Insertar Bloque en Parrilla</span>
                </button>
              </form>
            </div>

            <div className="bms-card">
              <h3 className="bms-card-title">
                Escaleta Programada: {parrillaHoy?.fecha || 'Hoy'} ({parrillaHoy?.canal_senial || 'Canal 11'})
              </h3>
              <div className="bms-table-container">
                <table className="bms-table">
                  <thead>
                    <tr>
                      <th>Horario</th>
                      <th>Programa</th>
                      <th>Categoria</th>
                      <th>Modalidad</th>
                      <th>Estado</th>
                      <th>Accion</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(parrillaHoy?.items || []).map((it: any) => (
                      <tr key={it.id_item_parrilla}>
                        <td><strong>{it.hora_inicio} - {it.hora_fin}</strong></td>
                        <td>{it.programa?.titulo || 'Bloque Especial'}</td>
                        <td>{it.programa?.categoria?.nombre || 'General'}</td>
                        <td><span className="bms-pill-badge bms-badge-cyan">{it.tipo_emision}</span></td>
                        <td>
                          <span className={`bms-status-indicator ${it.estado === 'EMITIDO' ? 'status-ok' : 'status-ready'}`}>
                            {it.estado}
                          </span>
                        </td>
                        <td>
                          <button
                            className="bms-btn-danger"
                            onClick={async () => {
                              if (confirm('Eliminar bloque de la parrilla?')) {
                                await bmsApi.deleteItemParrilla(it.id_item_parrilla);
                                loadData();
                              }
                            }}
                          >
                            Eliminar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* CATALOGO (CU2) */}
        {activeSubTab === 'catalogo' && (
          <div className="fade-in">
            {/* Crear Categoría (CU2) */}
            <div className="bms-card" style={{ marginBottom: 16 }}>
              <h3 className="bms-card-title">Crear Nueva Categoría de Programas (CU2)</h3>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const form = e.target as HTMLFormElement;
                  const body = {
                    nombre: (form.elements.namedItem('cat_nombre') as HTMLInputElement).value,
                    descripcion: (form.elements.namedItem('cat_desc') as HTMLInputElement).value
                  };
                  const res = await bmsApi.createCategoria(body);
                  if (res.success || res.categoria) {
                    alert('Categoría de programas creada exitosamente.');
                    form.reset();
                    loadData();
                  }
                }}
              >
                <div className="bms-form-grid">
                  <div className="bms-form-group">
                    <label>Nombre de Categoría</label>
                    <input name="cat_nombre" required placeholder="Noticias, Deportes, Entretenimiento..." />
                  </div>
                  <div className="bms-form-group">
                    <label>Descripción</label>
                    <input name="cat_desc" placeholder="Programas informativos y de coyuntura" />
                  </div>
                </div>
                <button type="submit" className="bms-btn-secondary" style={{ marginTop: 8 }}>
                  <Plus size={14} />
                  <span>Crear Categoría</span>
                </button>
              </form>
            </div>

            <div className="bms-card">
              <h3 className="bms-card-title">Registrar Nuevo Formato en Catalogo (CU2)</h3>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const form = e.target as HTMLFormElement;
                  const body = {
                    id_categoria: Number((form.elements.namedItem('id_cat') as HTMLSelectElement).value) || 1,
                    titulo: (form.elements.namedItem('titulo') as HTMLInputElement).value,
                    duracion_estandar_minutos: Number((form.elements.namedItem('dur') as HTMLInputElement).value),
                    descripcion: (form.elements.namedItem('desc') as HTMLInputElement).value
                  };
                  const res = await bmsApi.createPrograma(body);
                  if (res.success || res.programa) {
                    alert('Programa registrado exitosamente en el catalogo.');
                    form.reset();
                    loadData();
                  }
                }}
              >
                <div className="bms-form-grid">
                  <div className="bms-form-group">
                    <label>Titulo del Programa</label>
                    <input name="titulo" required placeholder="Telepaís Meridiano" />
                  </div>
                  <div className="bms-form-group">
                    <label>Categoría</label>
                    <select name="id_cat" required>
                      {categorias.map((c) => (
                        <option key={c.id_categoria} value={c.id_categoria}>
                          {c.nombre}
                        </option>
                      ))}
                      {categorias.length === 0 && <option value="1">General / Noticias</option>}
                    </select>
                  </div>
                  <div className="bms-form-group">
                    <label>Duracion Estandar (Minutos)</label>
                    <input name="dur" type="number" required defaultValue="60" />
                  </div>
                  <div className="bms-form-group">
                    <label>Sinopsis o Descripcion</label>
                    <input name="desc" placeholder="Noticiero central informativo en vivo" />
                  </div>
                </div>
                <button type="submit" className="bms-btn-primary">
                  <Plus size={14} />
                  <span>Guardar en Catalogo</span>
                </button>
              </form>
            </div>

            <div className="bms-card">
              <h3 className="bms-card-title">Formatos y Programas Activos</h3>
              <div className="bms-table-container">
                <table className="bms-table">
                  <thead>
                    <tr>
                      <th>Codigo</th>
                      <th>Titulo</th>
                      <th>Categoria</th>
                      <th>Duracion Estandar</th>
                      <th>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {programas.map((p) => (
                      <tr key={p.id_programa}>
                        <td><strong>{p.codigo}</strong></td>
                        <td>{p.titulo}</td>
                        <td>{p.categoria?.nombre || 'General'}</td>
                        <td>{p.duracion_estandar_minutos} minutos</td>
                        <td><span className="bms-status-indicator status-ok">{p.estado}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* CLIENTES (CU6) */}
        {activeSubTab === 'clientes' && (
          <div className="fade-in">
            <div className="bms-card">
              <h3 className="bms-card-title">Registrar Nuevo Cliente Publicitario (CU6)</h3>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const form = e.target as HTMLFormElement;
                  const body = {
                    razon_social: (form.elements.namedItem('razon') as HTMLInputElement).value,
                    nit: (form.elements.namedItem('nit') as HTMLInputElement).value,
                    contacto: (form.elements.namedItem('contacto') as HTMLInputElement).value,
                    email: (form.elements.namedItem('email') as HTMLInputElement).value,
                    telefono: (form.elements.namedItem('tel') as HTMLInputElement).value
                  };
                  const res = await bmsApi.createCliente(body);
                  if (res.success || res.cliente) {
                    alert('Cliente publicitario registrado exitosamente.');
                    form.reset();
                    loadData();
                  }
                }}
              >
                <div className="bms-form-grid">
                  <div className="bms-form-group">
                    <label>Razon Social / Empresa</label>
                    <input name="razon" required placeholder="Cerveceria Boliviana Nacional" />
                  </div>
                  <div className="bms-form-group">
                    <label>NIT / Identificacion Tributaria</label>
                    <input name="nit" required placeholder="1020304050" />
                  </div>
                  <div className="bms-form-group">
                    <label>Persona de Contacto</label>
                    <input name="contacto" placeholder="Lic. Andrea Morales" />
                  </div>
                  <div className="bms-form-group">
                    <label>Correo Electronico</label>
                    <input name="email" type="email" placeholder="publicidad@empresa.bo" />
                  </div>
                  <div className="bms-form-group">
                    <label>Telefono / Celular</label>
                    <input name="tel" placeholder="+591 70012345" />
                  </div>
                </div>
                <button type="submit" className="bms-btn-primary">
                  <UserPlus size={14} />
                  <span>Registrar Cliente</span>
                </button>
              </form>
            </div>

            <div className="bms-card">
              <h3 className="bms-card-title">Cartera de Clientes Publicitarios</h3>
              <div className="bms-table-container">
                <table className="bms-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Razon Social</th>
                      <th>NIT</th>
                      <th>Contacto</th>
                      <th>Spots Registrados</th>
                      <th>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clientes.map((c) => (
                      <tr key={c.id}>
                        <td><strong>#{c.id}</strong></td>
                        <td><strong>{c.razon_social}</strong></td>
                        <td>{c.nit}</td>
                        <td>{c.contacto} ({c.telefono || c.email || 'N/A'})</td>
                        <td>{c.spots?.length || 0} comerciales</td>
                        <td><span className="bms-status-indicator status-ok">{c.estado}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* SPOTS (CU6) */}
        {activeSubTab === 'spots' && (
          <div className="fade-in">
            <div className="bms-card">
              <h3 className="bms-card-title">Alta de Spot Publicitario y Vinculacion (CU6)</h3>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const form = e.target as HTMLFormElement;
                  const body = {
                    id_cliente: Number((form.elements.namedItem('cliente') as HTMLSelectElement).value),
                    titulo_spot: (form.elements.namedItem('titulo') as HTMLInputElement).value,
                    duracion_segundos: Number((form.elements.namedItem('duracion') as HTMLInputElement).value)
                  };
                  const res = await bmsApi.createSpot(body);
                  if (res.success || res.spot) {
                    alert('Spot publicitario registrado y vinculado al cliente.');
                    form.reset();
                    loadData();
                  }
                }}
              >
                <div className="bms-form-grid">
                  <div className="bms-form-group">
                    <label>Cliente Publicitario</label>
                    <select name="cliente" required>
                      {clientes.map((c) => (
                        <option key={c.id} value={c.id}>{c.razon_social} (NIT: {c.nit})</option>
                      ))}
                    </select>
                  </div>
                  <div className="bms-form-group">
                    <label>Titulo del Comercial / Campaña</label>
                    <input name="titulo" required placeholder="Promocion Fin de Año 2026" />
                  </div>
                  <div className="bms-form-group">
                    <label>Duracion en Segundos</label>
                    <input name="duracion" type="number" required defaultValue="30" />
                  </div>
                </div>
                <button type="submit" className="bms-btn-primary">
                  <Plus size={14} />
                  <span>Guardar Spot Comercial</span>
                </button>
              </form>
            </div>

            <div className="bms-card">
              <h3 className="bms-card-title">Spots Registrados en el Sistema</h3>
              <div className="bms-table-container">
                <table className="bms-table">
                  <thead>
                    <tr>
                      <th>Codigo</th>
                      <th>Comercial</th>
                      <th>Cliente</th>
                      <th>Duracion</th>
                      <th>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {spots.map((s) => (
                      <tr key={s.id}>
                        <td><strong>{s.codigo_spot}</strong></td>
                        <td>{s.titulo_spot}</td>
                        <td><strong>{s.cliente?.razon_social || 'N/A'}</strong></td>
                        <td>{s.duracion_segundos} seg</td>
                        <td><span className="bms-status-indicator status-ok">{s.estado}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* PAUTAS (CU6) */}
        {activeSubTab === 'pautas' && (
          <div className="fade-in">
            <div className="bms-card">
              <h3 className="bms-card-title">Pautar Spot en Bloque Horario (CU6)</h3>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const form = e.target as HTMLFormElement;
                  const body = {
                    id_item_parrilla: Number((form.elements.namedItem('bloque') as HTMLSelectElement).value),
                    id_spot: Number((form.elements.namedItem('spot') as HTMLSelectElement).value),
                    tanda_bloque: (form.elements.namedItem('tanda') as HTMLSelectElement).value,
                    orden: Number((form.elements.namedItem('orden') as HTMLInputElement).value)
                  };
                  const res = await bmsApi.createPauta(body);
                  if (res.success || res.pauta) {
                    alert('Spot pautado exitosamente.');
                    form.reset();
                    loadData();
                  }
                }}
              >
                <div className="bms-form-grid">
                  <div className="bms-form-group">
                    <label>Bloque / Programa Destino</label>
                    <select name="bloque" required>
                      {(parrillaHoy?.items || []).map((it: any) => (
                        <option key={it.id_item_parrilla} value={it.id_item_parrilla}>
                          {it.hora_inicio} - {it.programa?.titulo}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="bms-form-group">
                    <label>Spot Comercial</label>
                    <select name="spot" required>
                      {spots.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.codigo_spot} - {s.titulo_spot} ({s.cliente?.razon_social})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="bms-form-group">
                    <label>Tanda Publicitaria</label>
                    <select name="tanda">
                      <option value="TANDA_1">Tanda 1 (Apertura)</option>
                      <option value="TANDA_2">Tanda 2 (Intermedio)</option>
                      <option value="TANDA_3">Tanda 3 (Cierre)</option>
                    </select>
                  </div>
                  <div className="bms-form-group">
                    <label>Posicion / Orden</label>
                    <input name="orden" type="number" required defaultValue="1" />
                  </div>
                </div>
                <button type="submit" className="bms-btn-primary">
                  <Layers size={14} />
                  <span>Insertar Pauta Comercial</span>
                </button>
              </form>
            </div>

            <div className="bms-card">
              <h3 className="bms-card-title">Pautas Comerciales Activas</h3>
              <div className="bms-table-container">
                <table className="bms-table">
                  <thead>
                    <tr>
                      <th>Bloque Destino</th>
                      <th>Spot</th>
                      <th>Cliente</th>
                      <th>Tanda</th>
                      <th>Orden</th>
                      <th>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pautas.map((pt) => (
                      <tr key={pt.id}>
                        <td><strong>{pt.item_parrilla?.hora_inicio} - {pt.item_parrilla?.programa?.titulo}</strong></td>
                        <td>{pt.spot?.titulo_spot}</td>
                        <td>{pt.spot?.cliente?.razon_social}</td>
                        <td><span className="bms-pill-badge bms-badge-blue">{pt.tanda_bloque}</span></td>
                        <td>#{pt.orden}</td>
                        <td><span className="bms-status-indicator status-ok">{pt.estado}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* PAGOS PAGOFACIL */}
        {activeSubTab === 'pagos' && (
          <div className="fade-in">
            <div className="bms-card">
              <h3 className="bms-card-title">Generar Cobro QR PagoFacil (Comercial / Spot)</h3>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const form = e.target as HTMLFormElement;
                  const body = {
                    id_cliente: Number((form.elements.namedItem('cliente') as HTMLSelectElement).value),
                    monto: Number((form.elements.namedItem('monto') as HTMLInputElement).value),
                    concepto: (form.elements.namedItem('concepto') as HTMLInputElement).value
                  };
                  try {
                    const res = await bmsApi.generarPagoQr(body);
                    if (res.success) {
                      setQrModal({
                        open: true,
                        txId: res.transaccionId,
                        qrImg: res.qrBase64,
                        monto: body.monto,
                        concepto: body.concepto
                      });
                      loadData();
                    }
                  } catch (err: any) {
                    alert('Error al generar QR: ' + err.message);
                  }
                }}
              >
                <div className="bms-form-grid">
                  <div className="bms-form-group">
                    <label>Cliente Publicitario</label>
                    <select name="cliente" required>
                      {clientes.map((c) => (
                        <option key={c.id} value={c.id}>{c.razon_social}</option>
                      ))}
                    </select>
                  </div>
                  <div className="bms-form-group">
                    <label>Monto a Cobrar (BOB)</label>
                    <input name="monto" type="number" step="0.5" required defaultValue="500" />
                  </div>
                  <div className="bms-form-group" style={{ gridColumn: 'span 2' }}>
                    <label>Concepto del Pago</label>
                    <input name="concepto" required placeholder="Pauta publicitaria paquete 30 pases" />
                  </div>
                </div>
                <button type="submit" className="bms-btn-primary">
                  <QrCode size={14} />
                  <span>Generar Codigo QR de Pago</span>
                </button>
              </form>
            </div>

            <div className="bms-card">
              <h3 className="bms-card-title">Historial de Cobros y Conciliaciones PagoFacil</h3>
              <div className="bms-table-container">
                <table className="bms-table">
                  <thead>
                    <tr>
                      <th>Transaccion ID</th>
                      <th>Cliente</th>
                      <th>Concepto</th>
                      <th>Monto</th>
                      <th>Estado</th>
                      <th>Accion</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagos.map((p) => (
                      <tr key={p.id}>
                        <td><code>{p.transaccion_id}</code></td>
                        <td><strong>{p.cliente?.razon_social || 'N/A'}</strong></td>
                        <td>{p.concepto}</td>
                        <td><strong className="accent-green">Bs. {p.monto}</strong></td>
                        <td>
                          <span className={`bms-status-indicator ${p.estado === 'PAGADO' ? 'status-ok' : 'status-ready'}`}>
                            {p.estado}
                          </span>
                        </td>
                        <td>
                          {p.estado === 'PENDIENTE' && (
                            <button
                              className="bms-btn-secondary"
                              onClick={async () => {
                                await bmsApi.confirmarPago(p.transaccion_id);
                                alert('Pago confirmado con exito.');
                                loadData();
                              }}
                            >
                              Simular Confirmacion
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal QR PagoFacil */}
      {qrModal && qrModal.open && (
        <div className="config-modal-backdrop" onClick={() => setQrModal(null)}>
          <div className="config-modal-card" style={{ maxWidth: 360, textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 8px' }}>Escanear QR de PagoFacil</h3>
            <p className="bms-text-muted" style={{ fontSize: 12 }}>{qrModal.concepto}</p>
            <div style={{ background: '#fff', padding: 12, borderRadius: 12, display: 'inline-block', margin: '14px 0' }}>
              <img src={qrModal.qrImg} alt="QR" style={{ width: 180, height: 180 }} />
            </div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#4ade80', marginBottom: 12 }}>
              Bs. {qrModal.monto}
            </div>
            <button
              className="bms-btn-primary"
              style={{ width: '100%', justifyContent: 'center' }}
              onClick={async () => {
                await bmsApi.confirmarPago(qrModal.txId);
                alert('Pago confirmado exitosamente via Webhook PagoFacil.');
                setQrModal(null);
                loadData();
              }}
            >
              Simular Pago Exitoso
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
