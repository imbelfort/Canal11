import { ProgramMediaDialog } from './ProgramMediaDialog';
import { useEffect, useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { bmsApi, programOrigins, programRatings, type CatalogProgram, type ProgramCategory } from '../../services/bmsApi';
import { ProgramEditor } from './ProgramEditor';

export function ProgramCatalog() {
  const [mediaProgram, setMediaProgram] = useState<CatalogProgram | null>(null);
  const [programs, setPrograms] = useState<CatalogProgram[]>([]);
  const [categories, setCategories] = useState<ProgramCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('');
  const [editing, setEditing] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let active = true;
    Promise.all([bmsApi.getProgramas(), bmsApi.getCategorias()])
      .then(([items, groups]) => {
        if (!active) return;
        setPrograms(items);
        setCategories(groups);
      })
      .catch(err => { if (active) setLoadError(err.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [revision]);

  const addProgram = (program: CatalogProgram) => {
    setPrograms(previous => [program, ...previous]);
    const category = program.categoria;
    if (category && !categories.some(category => category.id === program.id_categoria)) {
      setCategories(previous => [...previous, category]);
    }
    setEditing(false);
    setQuery('');
    setFilter('');
    setNotice(`?${program.titulo}? ya est? disponible en Parrilla.`);
  };

  const search = query.trim().toLocaleLowerCase();
  const visible = programs.filter(program => (!filter || String(program.id_categoria) === filter)
    && (!search || `${program.titulo} ${program.codigo}`.toLocaleLowerCase().includes(search)));

  return (
    <section className="bms-card program-catalog">
      <header className="program-catalog-header">
        <div><h2>Catálogo de programas</h2>
          <p className="bms-text-muted">{visible.length === programs.length ? programs.length : `${visible.length} de ${programs.length}`} programas · {categories.length} categorías</p>
        </div>
        {!editing && <button type="button" className="bms-btn-primary" onClick={() => { setNotice(''); setEditing(true); }} disabled={loading || Boolean(loadError)}><Plus size={16} /> Nuevo programa</button>}
      </header>
      {notice && <p role="status" className="program-catalog-notice">{notice}</p>}
      {loadError && <div role="alert" className="program-catalog-toolbar">
        <span>{loadError}</span>
        <button type="button" className="bms-btn-secondary" onClick={() => { setLoadError(''); setLoading(true); setRevision(value => value + 1); }}>Reintentar</button>
      </div>}
      {editing && <ProgramEditor initialCategory={filter} onSave={addProgram} onClose={() => setEditing(false)} />}
      <div className="program-catalog-toolbar">
        <label className="bms-form-group"><span><Search size={14} aria-hidden="true" /> Buscar programa</span>
          <input type="search" value={query} placeholder="Título o código" onChange={event => setQuery(event.target.value)} />
        </label>
        <label className="bms-form-group">Filtrar por categoría
          <select value={filter} onChange={event => setFilter(event.target.value)}>
            <option value="">Todas las categorías</option>
            {categories.map(category => <option key={category.id} value={category.id}>{category.nombre}</option>)}
          </select>
        </label>
      </div>
      {loading ? <p role="status">Cargando programas…</p> : !loadError && (
        visible.length ? <div className="bms-table-container">
          <table className="bms-table">
            <thead><tr><th>Programa</th><th>Categoría</th><th>Duración habitual</th><th>Estado</th><th>Materiales</th></tr></thead>
            <tbody>{visible.map(program => (
              <tr key={program.id}>
                <td><strong>{program.titulo}</strong><small>{program.codigo}{program.descripcion ? ` · ${program.descripcion}` : ''}</small></td>
                <td>{program.categoria?.nombre ?? categories.find(category => category.id === program.id_categoria)?.nombre ?? '—'}</td>
                <td>{programRatings[program.clasificacion_edad]}</td>
                <td>{programOrigins[program.origen]}</td>
                <td>{program.duracion_estandar_minutos} min</td>
                <td>{program.estado}</td>
                <td><button type="button" className="bms-btn-secondary" aria-label={`Ver archivos de ${program.titulo}`} onClick={() => setMediaProgram(program)}>Ver archivos</button></td>
              </tr>
            ))}</tbody>
          </table>
        </div> : <p>{programs.length ? 'No hay programas que coincidan con la búsqueda.' : 'Aún no hay programas. Usa Nuevo programa para registrar el primero.'}</p>
      )}
      {mediaProgram && <ProgramMediaDialog program={mediaProgram} onClose={() => setMediaProgram(null)} />}
    </section>
  );
}
