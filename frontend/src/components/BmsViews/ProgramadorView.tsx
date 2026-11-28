import { useToast } from '../../context/ToastContext';
import React, { useState, useEffect } from 'react';
import type { CatalogFile } from '../../services/parrillaMedia';
import { SpotFilePicker } from './SpotFilePicker';
import { ProgramCatalog } from './ProgramCatalog';
import { ClientRegistration } from './RegistrationDialogs';
import { CobrosPublicitarios } from './CobrosPublicitarios';
import { bmsApi } from '../../services/bmsApi';
import type { ProgrammingSection } from '../../navigation';
import { Layers, Tv, CreditCard, Plus, FileText, UserPlus, Film } from 'lucide-react';

export const ProgramadorView: React.FC<{ section: ProgrammingSection; onSectionChange: (section: ProgrammingSection) => void }> = ({
  section: activeSubTab, onSectionChange: setActiveSubTab,
}) => {
  const notify = useToast();
  const [parrillaHoy, setParrillaHoy] = useState<any>(null);
  const [clientRegistrationOpen, setClientRegistrationOpen] = useState(false);
  const [clientsLoading, setClientsLoading] = useState(true);
  const [clientes, setClientes] = useState<any[]>([]);
  const [spots, setSpots] = useState<any[]>([]);
  const [pautas, setPautas] = useState<any[]>([]);

  const [spotAsset, setSpotAsset] = useState<CatalogFile | null>(null);
  const [spotTitle, setSpotTitle] = useState('');
  const [spotId, setSpotId] = useState('');
  const [spotPicker, setSpotPicker] = useState<{ existingId?: number } | null>(null);
  const [spotBusy, setSpotBusy] = useState(false);
  const [spotFeedback, setSpotFeedback] = useState<{ error: boolean; text: string } | null>(null);
  const selectedSpot = spots.find(spot => String(spot.id) === spotId);
  const eligibleSegments = (parrillaHoy?.items ?? []).filter((item: any) =>
    ['PROGRAMADO', 'AJUSTADO'].includes(item.estado) && item.media_playout?.event_type !== 'COMMERCIAL');

  const selectSpotFile = async (asset: CatalogFile) => {
    if (spotPicker?.existingId) {
      await bmsApi.linkSpotFile(spotPicker.existingId, Number(asset.id.split(':')[1]));
      await loadData();
      notify('Video aprobado vinculado al spot.');
      return;
    }

    setSpotAsset(asset);
    setSpotTitle(previous => previous || asset.titulo.slice(0, 150));
  };

  useEffect(() => {
    setSpotFeedback(null);
    loadData();
  }, [activeSubTab]);

  const loadData = async () => {
    try {
      if (activeSubTab === 'clientes') {
        setClientsLoading(true);
        try { setClientes(await bmsApi.getClientes()); } finally { setClientsLoading(false); }
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
      }
    } catch (e) {
      notify((e as Error).message, 'error');
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
          <span>Programas</span>
        </button>
        <button
          className={`bms-tab-btn ${activeSubTab === 'clientes' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('clientes')}
        >
          <UserPlus size={15} />
          <span>Clientes publicitarios</span>
        </button>
        <button
          className={`bms-tab-btn ${activeSubTab === 'spots' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('spots')}
        >
          <Film size={15} />
          <span>Spots publicitarios</span>
        </button>
        <button
          className={`bms-tab-btn ${activeSubTab === 'pautas' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('pautas')}
        >
          <Layers size={15} />
          <span>Pautas y tandas comerciales</span>
        </button>
        <button
          className={`bms-tab-btn ${activeSubTab === 'pagos' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('pagos')}
        >
          <CreditCard size={15} />
          <span>Cobros publicitarios</span>
        </button>
      </div>

      <div className="bms-content-area">
        {activeSubTab !== 'catalogo' && activeSubTab !== 'pagos' && activeSubTab !== 'clientes' && <p className="screen-count">{{
          spots: `${spots.length} spots`,
          pautas: `${pautas.length} pautas`,
        }[activeSubTab]}</p>}
        {activeSubTab === 'catalogo' && <ProgramCatalog />}

        {/* CLIENTES (CU6) */}
        {activeSubTab === 'clientes' && (
          <div className="fade-in">
            <div className="bms-card">
              <header className="program-catalog-header">
                <h2>Clientes publicitarios</h2>
                <button type="button" className="bms-btn-primary" aria-haspopup="dialog" onClick={() => setClientRegistrationOpen(true)}><UserPlus size={15} /> Nuevo cliente</button>
              </header>
              {!clientes.length && <p role="status">{clientsLoading ? 'Cargando clientes…' : 'No hay clientes registrados.'}</p>}
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
              <h3 className="bms-card-title">Registrar spot publicitario</h3>
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
                      fecha_vigencia_inicio: String(new FormData(form).get('start') || '') || null,
                      fecha_vigencia_fin: String(new FormData(form).get('end') || '') || null,
                    });
                    form.reset();
                    setSpotAsset(null);
                    setSpotTitle('');
                    await loadData();
                    notify('Spot guardado.');
                  } catch (err) {
                    setSpotFeedback({ error: true, text: (err as Error).message });
                    notify((err as Error).message, 'error');
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
                  <label className="bms-form-group">Inicio de vigencia<input name="start" type="date" /><small>Por defecto, hoy en Bolivia.</small></label>
                  <label className="bms-form-group">Fin de vigencia<input name="end" type="date" /><small>Por defecto, seis meses desde el inicio.</small></label>
                </div>
                <button type="submit" className="bms-btn-primary" disabled={spotBusy}>
                  <Plus size={14} />
                  <span>Guardar spot</span>
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
              <p className="bms-text-muted">Cada pauta programa un pase del spot antes o después de un segmento. Para un corte intermedio, pauta el spot entre dos segmentos del programa.</p>
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
                  notify('Pase publicitario agregado a la Parrilla.');
                } catch (err) {
                  setSpotFeedback({ error: true, text: (err as Error).message });
                  notify((err as Error).message, 'error');
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
                    <select name="tanda" defaultValue="FIN_PROGRAMA">
                      <option value="INICIO_PROGRAMA">Antes del segmento</option>
                      <option value="FIN_PROGRAMA">Después del segmento</option>
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
                        <td><span className="bms-pill-badge bms-badge-blue">{pt.tanda_bloque === 'INICIO_PROGRAMA' ? 'Antes del segmento' : 'Después del segmento'}</span></td>
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

        {activeSubTab === 'pagos' && <CobrosPublicitarios />}
      </div>
      {activeSubTab === 'clientes' && clientRegistrationOpen && <ClientRegistration
        onClose={() => setClientRegistrationOpen(false)}
        onCreated={() => { setClientRegistrationOpen(false); void loadData(); }}
      />}
      {spotPicker && <SpotFilePicker onSelect={selectSpotFile} onClose={() => setSpotPicker(null)} />}
    </div>
  );
};
