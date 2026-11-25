import { useEffect, useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { bmsApi } from '../../services/bmsApi';

interface Category {
  id: number;
  nombre: string;
}

interface Program {
  id: number;
  titulo: string;
  codigo: string;
  id_categoria: number;
  categoria?: Category;
  descripcion?: string;
  duracion_estandar_minutos: number;
  estado: string;
}

export function ProgramCatalog() {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('');
  const [editing, setEditing] = useState(false);
  const [categoryId, setCategoryId] = useState('');
  const [categoryName, setCategoryName] = useState('');
  const [addingCategory, setAddingCategory] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
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

  const startProgram = () => {
    setCategoryId(filter);
    setAddingCategory(!categories.length);
    setError('');
    setNotice('');
    setEditing(true);
  };

  const saveCategory = async () => {
    if (!categoryName.trim()) return;
    setSaving(true);
    setError('');
    try {
      const { categoria } = await bmsApi.createCategoria({ nombre: categoryName.trim() });
      setCategories(previous => [...previous, categoria]);
      setCategoryId(String(categoria.id));
      setCategoryName('');
      setAddingCategory(false);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const saveProgram = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (addingCategory || !categoryId || saving) return;
    const fields = new FormData(event.currentTarget);
    setSaving(true);
    setError('');
    try {
      const { programa } = await bmsApi.createPrograma({
        titulo: String(fields.get('title')).trim(),
        id_categoria: Number(categoryId),
        duracion_estandar_minutos: Number(fields.get('duration')),
        descripcion: String(fields.get('description')).trim(),
      });
      setPrograms(previous => [programa, ...previous]);
      setEditing(false);
      setQuery('');
      setFilter('');
      setNotice(`«${programa.titulo}» ya está disponible al armar un bloque en Parrilla.`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
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
        {!editing && <button type="button" className="bms-btn-primary" onClick={startProgram} disabled={loading || Boolean(loadError)}><Plus size={16} /> Nuevo programa</button>}
      </header>
      {notice && <p role="status" className="program-catalog-notice">{notice}</p>}
      {loadError && <div role="alert" className="program-catalog-toolbar">
        <span>{loadError}</span>
        <button type="button" className="bms-btn-secondary" onClick={() => { setLoadError(''); setLoading(true); setRevision(value => value + 1); }}>Reintentar</button>
      </div>}
      {editing && (
        <form className="program-editor" onSubmit={saveProgram}>
          <h3>Nuevo programa</h3>
          <fieldset className="program-editor-fields" disabled={saving}>
            <label className="bms-form-group">Título<input name="title" placeholder="Ej. Noticiero central" maxLength={150} required autoFocus /></label>
            <label className="bms-form-group">Duración habitual (minutos)<input name="duration" type="number" min={1} defaultValue={60} required /></label>
            <div className="program-category-field">
              <label className="bms-form-group">Categoría
                <select value={categoryId} onChange={event => setCategoryId(event.target.value)} required={!addingCategory} disabled={addingCategory}>
                  <option value="">Elige una categoría</option>
                  {categories.map(category => <option key={category.id} value={category.id}>{category.nombre}</option>)}
                </select>
              </label>
              {!addingCategory && <button type="button" className="bms-btn-secondary" onClick={() => setAddingCategory(true)}><Plus size={14} /> Nueva categoría</button>}
            </div>
            {addingCategory && <div className="program-category-field">
              <label className="bms-form-group">Nombre de la nueva categoría
                <input value={categoryName} maxLength={100} placeholder="Ej. Noticias"
                  onChange={event => setCategoryName(event.target.value)}
                  onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); void saveCategory(); } }} />
              </label>
              <button type="button" className="bms-btn-secondary" onClick={() => void saveCategory()} disabled={!categoryName.trim()}>Crear y usar</button>
              {categories.length > 0 && <button type="button" className="bms-btn-secondary" onClick={() => { setAddingCategory(false); setCategoryName(''); setError(''); }}>Cancelar categoría</button>}
            </div>}
            <label className="bms-form-group">Descripción (opcional)<input name="description" /></label>
          </fieldset>
          {error && <p className="operations-error" role="alert">{error}</p>}
          <div className="program-catalog-toolbar">
            <button type="submit" className="bms-btn-primary" disabled={saving || addingCategory || !categoryId}>Guardar programa</button>
            <button type="button" className="bms-btn-secondary" disabled={saving} onClick={() => { setEditing(false); setCategoryName(''); }}>Cancelar</button>
          </div>
        </form>
      )}
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
            <thead><tr><th>Programa</th><th>Categoría</th><th>Duración habitual</th><th>Estado</th></tr></thead>
            <tbody>{visible.map(program => (
              <tr key={program.id}>
                <td><strong>{program.titulo}</strong><small>{program.codigo}{program.descripcion ? ` · ${program.descripcion}` : ''}</small></td>
                <td>{program.categoria?.nombre ?? categories.find(category => category.id === program.id_categoria)?.nombre ?? '—'}</td>
                <td>{program.duracion_estandar_minutos} min</td>
                <td>{program.estado}</td>
              </tr>
            ))}</tbody>
          </table>
        </div> : <p>{programs.length ? 'No hay programas que coincidan con la búsqueda.' : 'Aún no hay programas. Usa Nuevo programa para registrar el primero.'}</p>
      )}
    </section>
  );
}
