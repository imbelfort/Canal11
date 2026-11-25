import { ScreenVisitCount } from '../Common/ScreenVisitCount';
import React, { useState, useEffect } from 'react';
import type { CatalogFile } from '../../services/parrillaMedia';
import { SpotFilePicker } from './SpotFilePicker';
import { ProgramCatalog } from './ProgramCatalog';
import { bmsApi } from '../../services/bmsApi';
import { Layers, Tv, CreditCard, Plus, CheckCircle, QrCode, FileText, UserPlus, Film } from 'lucide-react';

export const ProgramadorView: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'catalogo' | 'clientes' | 'spots' | 'pautas' | 'pagos'>('catalogo');
  const [parrillaHoy, setParrillaHoy] = useState<any>(null);
  const [clientes, setClientes] = useState<any[]>([]);
  const [spots, setSpots] = useState<any[]>([]);
  const [pautas, setPautas] = useState<any[]>([]);
  const [pagos, setPagos] = useState<any[]>([]);

  const [spotAsset, setSpotAsset] = useState<CatalogFile | null>(null);
  const [spotTitle, setSpotTitle] = useState('');
  const [spotId, setSpotId] = useState('');
  const [spotPicker, setSpotPicker] = useState<{ existingId?: number } | null>(null);
  const [spotBusy, setSpotBusy] = useState(false);
  const [spotFeedback, setSpotFeedback] = useState<{ error: boolean; text: string } | null>(null);
  const selectedSpot = spots.find(spot => String(spot.id) === spotId);
  const eligibleSegments = (parrillaHoy?.items ?? []).filter((item: any) =>
    !['EMITIDO', 'CANCELADO'].includes(item.estado) && item.media_playout?.event_type !== 'COMMERCIAL');

  const selectSpotFile = async (asset: CatalogFile) => {
    if (spotPicker?.existingId) {
      await bmsApi.linkSpotFile(spotPicker.existingId, Number(asset.id.split(':')[1]));
      await loadData();
      setSpotFeedback({ error: false, text: 'Video aprobado vinculado al spot.' });
      return;
    }

    setSpotAsset(asset);
    setSpotTitle(previous => previous || asset.titulo.slice(0, 150));
  };

  // Modal QR PagoFacil
  const [qrModal, setQrModal] = useState<{ open: boolean; txId: string; qrImg: string; monto: number; concepto: string } | null>(null);

  useEffect(() => {
    setSpotFeedback(null);
    loadData();
  }, [activeSubTab]);

  const loadData = async () => {
    try {
      if (activeSubTab === 'clientes') {
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
      if (activeSubTab === 'spots' || activeSubTab === 'pautas') {
        setSpotFeedback({ error: true, text: (e as Error).message });
      } else {
        console.error(e);
      }
    }
  };

  return (
    <div className="bms-container">
      {/* Subnavegacion estilizada */}
      <div className="bms-subnav">
        <button
          className={`bms-tab-btn ${activeSubTab === 'catalogo' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('catalogo')}
        >
          <Tv size={15} />
          <span>Programas (CU2)</span>
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
        <div className="bms-visit-row"><ScreenVisitCount screen={`programacion:${activeSubTab}`} /></div>
        {activeSubTab !== 'catalogo' && <p className="screen-count">{{
          clientes: `${clientes.length} clientes`,
          spots: `${spots.length} spots`,
          pautas: `${pautas.length} pautas`,
          pagos: `${pagos.length} pagos`,
        }[activeSubTab]}</p>}
        {activeSubTab === 'catalogo' && <ProgramCatalog />}

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
              <h3 className="bms-card-title">Registrar spot publicitario (CU6)</h3>
              <p className="bms-text-muted">
                Vincula un video aprobado del catálogo y elige el cliente.
              </p>

              {spotFeedback && <p role={spotFeedback.error ? 'alert' : 'status'} className={spotFeedback.error ? 'operations-error' : undefined}>{spotFeedback.text}</p>}
              <div className="operations-actions">
                <button type="button" onClick={() => setSpotPicker({})} disabled={spotBusy}>Elegir video del catálogo</button>
                {spotAsset && <span>{spotAsset.titulo} · {(spotAsset.duracion_ms / 1000).toFixed(1)} s</span>}
              </div>

              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const form = e.target as HTMLFormElement;
                  const body = {
                    id_cliente: Number((form.elements.namedItem('cliente') as HTMLSelectElement).value),
                    titulo_spot: (form.elements.namedItem('titulo') as HTMLInputElement).value,
                    duracion_segundos: Number((form.elements.namedItem('duracion') as HTMLInputElement).value)
                  };
                  setSpotBusy(true);
                  setSpotFeedback(null);
                  try {
                    await bmsApi.createSpot({
                      ...body,
                      duracion_segundos: spotAsset ? Math.max(1, Math.round(spotAsset.duracion_ms / 1000)) : body.duracion_segundos,
                      id_archivo_parrilla: spotAsset ? Number(spotAsset.id.split(':')[1]) : null,
                    });
                    form.reset();
                    setSpotAsset(null);
                    setSpotTitle('');
                    await loadData();
                    setSpotFeedback({ error: false, text: 'Spot guardado.' });
                  } catch (err) {
                    setSpotFeedback({ error: true, text: (err as Error).message });
                  } finally {
                    setSpotBusy(false);
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
                    <input id="spot-titulo-input" name="titulo" required maxLength={150} value={spotTitle} onChange={event => setSpotTitle(event.target.value)} placeholder="Promocion Fin de Año 2026" />
                  </div>
                  <div className="bms-form-group">
                    <label>Duracion en Segundos (Auto-detectada)</label>
                    <input id="spot-duracion-input" name="duracion" type="number" min={1} required defaultValue={spotAsset ? Math.max(1, Math.round(spotAsset.duracion_ms / 1000)) : 30} key={spotAsset?.id ?? 'manual'} readOnly={Boolean(spotAsset)} />
                  </div>
                </div>
                <button type="submit" className="bms-btn-primary" disabled={spotBusy}>
                  <Plus size={14} />
                  <span>Guardar Spot Comercial en BD</span>
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
              <h3 className="bms-card-title">Pautar spot</h3>
              <p className="bms-text-muted">Elige el segmento y en qu? momento debe reproducirse el spot.</p>
              {spotFeedback && <p role={spotFeedback.error ? 'alert' : 'status'} className={spotFeedback.error ? 'operations-error' : undefined}>{spotFeedback.text}</p>}
              {!eligibleSegments.length && <p>Agrega un segmento en la Parrilla de hoy para poder pautar un spot.</p>}
              <form onSubmit={async event => {
                event.preventDefault();
                const form = new FormData(event.currentTarget);
                setSpotBusy(true);
                setSpotFeedback(null);
                try {
                  await bmsApi.createPauta({
                    id_item_parrilla: Number(form.get('bloque')),
                    id_spot: Number(spotId),
                    tanda_bloque: String(form.get('tanda')),
                  });
                  await loadData();
                  setSpotFeedback({ error: false, text: 'Spot agregado a la secuencia de la Parrilla.' });
                } catch (err) {
                  setSpotFeedback({ error: true, text: (err as Error).message });
                } finally {
                  setSpotBusy(false);
                }
              }}>
                <div className="bms-form-grid">
                  <label className="bms-form-group">Segmento del programa
                    <select name="bloque" required defaultValue="">
                      <option value="">Selecciona un segmento</option>
                      {eligibleSegments.map((item: any) => (
                        <option key={item.id} value={item.id}>
                          {item.hora_inicio?.slice(0, 5)} ? {item.media_playout?.program_title ? `${item.media_playout.program_title} / ` : ''}{item.media_playout?.title ?? item.programa?.titulo ?? `Bloque ${item.id}`}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="bms-form-group">Spot
                    <select required value={spotId} onChange={event => { setSpotId(event.target.value); setSpotFeedback(null); }} disabled={spotBusy}>
                      <option value="">Selecciona un spot</option>
                      {spots.filter(spot => spot.estado === 'ACTIVO').map(spot => (
                        <option key={spot.id} value={spot.id}>{spot.titulo_spot}{!spot.archivo ? ' (sin video)' : spot.archivo.qc?.status !== 'APROBADO_TECNICO' ? ' (revisar QC)' : ''}</option>
                      ))}
                    </select>
                  </label>
                  <label className="bms-form-group">Momento de salida
                    <select name="tanda" defaultValue="CORTE_1">
                      <option value="INICIO_PROGRAMA">Antes del segmento</option>
                      <option value="CORTE_1">Despu?s del segmento</option>
                    </select>
                  </label>
                </div>
                {selectedSpot && selectedSpot.archivo?.qc?.status !== 'APROBADO_TECNICO' && (
                  <div className="operations-actions">
                    <button type="button" disabled={spotBusy} onClick={() => setSpotPicker({ existingId: selectedSpot.id })}>Vincular video aprobado</button>
                  </div>
                )}
                <button type="submit" className="bms-btn-primary" disabled={spotBusy || !eligibleSegments.length || selectedSpot?.archivo?.qc?.status !== 'APROBADO_TECNICO'}>
                  <Layers size={14} /> {spotBusy ? 'Procesando?' : 'Agregar a la Parrilla'}
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
                        <td><strong>{pt.item_parrilla?.hora_inicio} - {pt.item_parrilla?.media_playout?.title ?? pt.item_parrilla?.programa?.titulo}</strong></td>
                        <td>{pt.spot?.titulo_spot}</td>
                        <td>{pt.spot?.cliente?.razon_social}</td>
                        <td><span className="bms-pill-badge bms-badge-blue">{pt.tanda_bloque === 'INICIO_PROGRAMA' ? 'Antes del segmento' : 'Despu?s del segmento'}</span></td>
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
            <p className="bms-text-muted" style={{ fontSize: '0.8276rem' }}>{qrModal.concepto}</p>
            <div style={{ background: '#fff', padding: 12, borderRadius: 12, display: 'inline-block', margin: '14px 0' }}>
              <img src={qrModal.qrImg} alt="QR" style={{ width: 180, height: 180 }} />
            </div>
            <div style={{ fontSize: '1.241rem', fontWeight: 800, color: 'var(--color-success)', marginBottom: 12 }}>
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
      {spotPicker && <SpotFilePicker onSelect={selectSpotFile} onClose={() => setSpotPicker(null)} />}
    </div>
  );
};
