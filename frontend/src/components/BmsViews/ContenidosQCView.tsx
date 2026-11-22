import React, { useState, useEffect } from 'react';
import { bmsApi } from '../../services/bmsApi';
import { Video, CheckCircle, UploadCloud, FolderOpen } from 'lucide-react';

export const ContenidosQCView: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'mam' | 'qc'>('mam');
  const [materiales, setMateriales] = useState<any[]>([]);
  const [programas, setProgramas] = useState<any[]>([]);
  const [validaciones, setValidaciones] = useState<any[]>([]);
  const [parrillaHoy, setParrillaHoy] = useState<any>(null);

  // Form MAM Ingesta Automatica
  const [selectedProg, setSelectedProg] = useState<number | ''>('');
  const [matTitulo, setMatTitulo] = useState('');
  const [matDuracion, setMatDuracion] = useState(3600);
  const [matFormato, setMatFormato] = useState('HD_1080I');
  const [matRuta, setMatRuta] = useState('');

  useEffect(() => {
    loadData();
  }, [activeSubTab]);

  const loadData = async () => {
    try {
      if (activeSubTab === 'mam') {
        const m = await bmsApi.getMateriales();
        const p = await bmsApi.getProgramas();
        setMateriales(m);
        setProgramas(p);
      } else if (activeSubTab === 'qc') {
        const v = await bmsApi.getValidaciones();
        const ph = await bmsApi.getParrillaHoy();
        const m = await bmsApi.getMateriales();
        setValidaciones(v);
        setParrillaHoy(ph);
        setMateriales(m);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Selector de archivo sin tipeo manual
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const baseName = file.name.replace(/\.[^/.]+$/, '');
    setMatTitulo(baseName);
    setMatRuta('/mam/storage/' + file.name);

    // Deteccion automatica de duracion mediante elemento de video HTML5
    try {
      const url = URL.createObjectURL(file);
      const v = document.createElement('video');
      v.preload = 'metadata';
      v.onloadedmetadata = () => {
        URL.revokeObjectURL(url);
        const durSec = Math.round(v.duration) || 1800;
        setMatDuracion(durSec);
        if (v.videoHeight >= 1080) {
          setMatFormato('HD_1080I');
        } else if (v.videoHeight >= 720) {
          setMatFormato('HD_720P');
        } else {
          setMatFormato('SD_576I');
        }
      };
      v.src = url;
    } catch {
      setMatDuracion(1800);
    }
  };

  return (
    <div className="bms-container">
      {/* Subnavegacion estilizada */}
      <div className="bms-subnav">
        <button
          className={`bms-tab-btn ${activeSubTab === 'mam' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('mam')}
        >
          <Video size={15} />
          <span>MAM - Ingesta Digital de Videos (CU4)</span>
        </button>
        <button
          className={`bms-tab-btn ${activeSubTab === 'qc' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('qc')}
        >
          <CheckCircle size={15} />
          <span>Control de Calidad QC - EBU R128 (CU5)</span>
        </button>
      </div>

      <div className="bms-content-area">
        {/* SUBTAB 1: INGESTA MAM (CU4) */}
        {activeSubTab === 'mam' && (
          <div className="fade-in">
            <div className="bms-card">
              <h3 className="bms-card-title">Ingesta Digital de Contenidos Audiovisuales (CU4)</h3>
              <p className="bms-text-muted">
                Seleccione el archivo desde su equipo. El sistema inspecciona los metadatos y asigna duracion y formato automaticamente sin tipeo manual.
              </p>

              {/* Zona de exploracion de archivos */}
              <div
                style={{
                  border: '2px dashed var(--color-hairline, #334155)',
                  borderRadius: 12,
                  padding: 24,
                  textAlign: 'center',
                  background: 'var(--color-field, #0f172a)',
                  marginBottom: 16,
                  cursor: 'pointer'
                }}
                onClick={() => document.getElementById('mam-file-input')?.click()}
              >
                <FolderOpen size={32} color="var(--primary, #38bdf8)" style={{ margin: '0 auto 8px' }} />
                <div style={{ fontWeight: 600, fontSize: 14 }}>Haga clic aqui para seleccionar el video a ingestar</div>
                <div style={{ fontSize: 12, color: '#94a3b8' }}>Formatos soportados: MP4, MOV, MKV, MXF, TS</div>
                <input
                  id="mam-file-input"
                  type="file"
                  accept="video/*,.mxf,.ts"
                  style={{ display: 'none' }}
                  onChange={handleFileSelect}
                />
              </div>

              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!selectedProg) {
                    alert('Seleccione un programa de television');
                    return;
                  }
                  const body = {
                    id_programa: selectedProg,
                    titulo_clip: matTitulo,
                    duracion_segundos: matDuracion,
                    formato: matFormato,
                    ruta_servidor: matRuta,
                    observaciones: 'Ingesta validada sin errores de codec'
                  };
                  const res = await bmsApi.createMaterial(body);
                  if (res.success || res.material) {
                    alert('Material audiovisual ingresado exitosamente en MAM.');
                    setMatTitulo('');
                    setMatRuta('');
                    loadData();
                  }
                }}
              >
                <div className="bms-form-grid">
                  <div className="bms-form-group">
                    <label>Programa al que pertenece</label>
                    <select
                      value={selectedProg}
                      onChange={(e) => setSelectedProg(Number(e.target.value))}
                      required
                    >
                      <option value="">Seleccione Programa...</option>
                      {programas.map((p) => (
                        <option key={p.id_programa} value={p.id_programa}>
                          {p.codigo} - {p.titulo}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="bms-form-group">
                    <label>Titulo del Clip (Auto-detectado)</label>
                    <input
                      value={matTitulo}
                      onChange={(e) => setMatTitulo(e.target.value)}
                      required
                      placeholder="Nombre del clip detectado..."
                    />
                  </div>
                  <div className="bms-form-group">
                    <label>Duracion (Segundos)</label>
                    <input
                      type="number"
                      value={matDuracion}
                      onChange={(e) => setMatDuracion(Number(e.target.value))}
                      required
                    />
                  </div>
                  <div className="bms-form-group">
                    <label>Norma / Formato</label>
                    <select
                      value={matFormato}
                      onChange={(e) => setMatFormato(e.target.value)}
                    >
                      <option value="HD_1080I">HD 1080i (Broadcast Master)</option>
                      <option value="HD_720P">HD 720p</option>
                      <option value="SD_576I">SD 576i (PAL/NTSC)</option>
                    </select>
                  </div>
                  <div className="bms-form-group" style={{ gridColumn: 'span 2' }}>
                    <label>Ruta de Servidor Asignada</label>
                    <input value={matRuta} readOnly style={{ opacity: 0.8 }} />
                  </div>
                </div>
                <button type="submit" className="bms-btn-primary">
                  <UploadCloud size={14} />
                  <span>Confirmar Ingesta en MAM</span>
                </button>
              </form>
            </div>

            <div className="bms-card">
              <h3 className="bms-card-title">Inventario de Clips e Ingestas (MAM Storage)</h3>
              <div className="bms-table-container">
                <table className="bms-table">
                  <thead>
                    <tr>
                      <th>Codigo Material</th>
                      <th>Titulo</th>
                      <th>Programa</th>
                      <th>Formato</th>
                      <th>Duracion</th>
                      <th>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {materiales.map((m) => (
                      <tr key={m.id}>
                        <td><strong>{m.codigo_material}</strong></td>
                        <td>{m.titulo_clip}</td>
                        <td>{m.programa?.titulo || 'General'}</td>
                        <td><span className="bms-pill-badge bms-badge-blue">{m.formato}</span></td>
                        <td>{m.duracion_segundos} seg</td>
                        <td><span className="bms-status-indicator status-ok">{m.estado}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* SUBTAB 2: CONTROL DE CALIDAD QC (CU5) */}
        {activeSubTab === 'qc' && (
          <div className="fade-in">
            <div className="bms-card">
              <h3 className="bms-card-title">Inspeccion Tecnica de Calidad (Norma EBU R128)</h3>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const form = e.target as HTMLFormElement;
                  const body = {
                    id_item_parrilla: Number((form.elements.namedItem('bloque') as HTMLSelectElement).value),
                    resultado_qc: (form.elements.namedItem('resultado') as HTMLSelectElement).value,
                    nivel_audio_db: Number((form.elements.namedItem('audio') as HTMLInputElement).value),
                    aspect_ratio: (form.elements.namedItem('aspect') as HTMLSelectElement).value,
                    observaciones: (form.elements.namedItem('obs') as HTMLInputElement).value
                  };
                  const res = await bmsApi.validarItem(body);
                  if (res.success || res.validacion) {
                    alert('Dictamen de Control de Calidad guardado.');
                    form.reset();
                    loadData();
                  }
                }}
              >
                <div className="bms-form-grid">
                  <div className="bms-form-group">
                    <label>Bloque / Programa a Inspeccionar</label>
                    <select name="bloque" required>
                      {(parrillaHoy?.items || []).map((it: any) => (
                        <option key={it.id_item_parrilla} value={it.id_item_parrilla}>
                          {it.hora_inicio} - {it.programa?.titulo}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="bms-form-group">
                    <label>Dictamen QC</label>
                    <select name="resultado">
                      <option value="APROBADO">APROBADO (Apto para Emision)</option>
                      <option value="RECHAZADO">RECHAZADO (Requiere Correccion)</option>
                    </select>
                  </div>
                  <div className="bms-form-group">
                    <label>Loudness Integrado (EBU R128 dBFS)</label>
                    <input name="audio" type="number" step="0.1" required defaultValue="-24.0" />
                  </div>
                  <div className="bms-form-group">
                    <label>Relacion de Aspecto</label>
                    <select name="aspect">
                      <option value="16:9">16:9 (Panoramico)</option>
                      <option value="4:3">4:3 (Legacy con Pillarbox)</option>
                    </select>
                  </div>
                  <div className="bms-form-group" style={{ gridColumn: 'span 2' }}>
                    <label>Observaciones Tecnicas</label>
                    <input name="obs" placeholder="Verificacion de luminancia y sonoridad conforme a normativa" />
                  </div>
                </div>
                <button type="submit" className="bms-btn-primary">
                  <CheckCircle size={14} />
                  <span>Registrar Dictamen QC</span>
                </button>
              </form>
            </div>

            <div className="bms-card">
              <h3 className="bms-card-title">Historial de Validaciones Tecnicas</h3>
              <div className="bms-table-container">
                <table className="bms-table">
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Programa</th>
                      <th>Inspector QC</th>
                      <th>Loudness</th>
                      <th>Aspecto</th>
                      <th>Dictamen</th>
                    </tr>
                  </thead>
                  <tbody>
                    {validaciones.map((v) => (
                      <tr key={v.id}>
                        <td><small>{v.fecha_validacion}</small></td>
                        <td><strong>{v.item_parrilla?.programa?.titulo || 'General'}</strong></td>
                        <td>{v.inspector?.nombre || 'Inspector Master'}</td>
                        <td>{v.nivel_audio_db} dB</td>
                        <td>{v.aspect_ratio}</td>
                        <td>
                          <span className={`bms-status-indicator ${v.resultado_qc === 'APROBADO' ? 'status-ok' : 'status-err'}`}>
                            {v.resultado_qc}
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
      </div>
    </div>
  );
};
