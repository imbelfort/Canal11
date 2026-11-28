import { useEffect, useState, type FormEvent } from 'react';
import { Plus } from 'lucide-react';
import { bmsApi, programOrigins, programRatings, type CatalogProgram, type ProgramCategory } from '../../services/bmsApi';
import { WorkspaceDialog } from '../Common/WorkspaceDialog';

export function ProgramEditor({ initialCategory = '', onSave, onClose }: {
  initialCategory?: string;
  onSave: (program: CatalogProgram) => void;
  onClose: () => void;
}) {
  const [categories, setCategories] = useState<ProgramCategory[]>([]);
  const [categoryId, setCategoryId] = useState(initialCategory);
  const [addingCategory, setAddingCategory] = useState(false);
  const [categoryName, setCategoryName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    bmsApi.getCategorias().then(groups => {
      if (!active) return;
      const available = groups.filter(group => group.estado === 'ACTIVO');
      setCategories(available);
      setCategoryId(previous => available.some(group => String(group.id) === previous) ? previous : '');
      setAddingCategory(available.length === 0);
    }).catch(err => { if (active) setError(err.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const saveCategory = async () => {
    if (!categoryName.trim() || saving) return;
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

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!categoryId || addingCategory || saving) return;
    const fields = new FormData(event.currentTarget);
    setSaving(true);
    setError('');
    try {
      const { programa } = await bmsApi.createPrograma({
        titulo: String(fields.get('title')).trim(),
        id_categoria: Number(categoryId),
        clasificacion_edad: fields.get('rating') as keyof typeof programRatings,
        origen: fields.get('origin') as keyof typeof programOrigins,
        duracion_estandar_minutos: Number(fields.get('duration')),
        descripcion: String(fields.get('description')).trim() || null,
      });
      onSave(programa);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <WorkspaceDialog title="Nuevo programa" description="Ficha editorial reutilizable en la parrilla." busy={saving} wide onClose={onClose}>
      <form className="workspace-dialog-body" onSubmit={save}>
        <fieldset className="program-editor-fields" disabled={saving || loading}>
          <label className="bms-form-group">Título<input name="title" placeholder="Ej. Noticiero central" maxLength={150} required autoFocus /></label>
          <label className="bms-form-group">Clasificación por edad
            <select name="rating" defaultValue="" required>
              <option value="" disabled>Selecciona una clasificación</option>
              {Object.entries(programRatings).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
            </select>
          </label>
          <div className="program-category-field">
            <label className="bms-form-group">Categoría
              <select value={categoryId} onChange={event => setCategoryId(event.target.value)} required={!addingCategory} disabled={addingCategory}>
                <option value="">Selecciona una categoría</option>
                {categories.map(category => <option key={category.id} value={category.id}>{category.nombre}</option>)}
              </select>
            </label>
            {!addingCategory && <button type="button" className="bms-btn-secondary" onClick={() => setAddingCategory(true)}><Plus size={14} /> Nueva categoría</button>}
          </div>
          {addingCategory && <div className="program-category-field">
            <label className="bms-form-group">Nombre de la nueva categoría
              <input value={categoryName} maxLength={100} onChange={event => setCategoryName(event.target.value)}
                onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); void saveCategory(); } }} />
            </label>
            <button type="button" className="bms-btn-secondary" onClick={() => void saveCategory()} disabled={!categoryName.trim()}>Crear y usar</button>
            {categories.length > 0 && <button type="button" className="bms-btn-secondary" onClick={() => { setAddingCategory(false); setCategoryName(''); }}>Cancelar categoría</button>}
          </div>}
          <label className="bms-form-group">Origen
            <select name="origin" defaultValue="" required>
              <option value="" disabled>Selecciona un origen</option>
              {Object.entries(programOrigins).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
            </select>
          </label>
          <label className="bms-form-group">Duración habitual (minutos)
            <input name="duration" type="number" min={1} max={1440} required />
            <small>Referencia editorial para el catálogo.</small>
          </label>
          <label className="bms-form-group">Descripción (opcional)<input name="description" /></label>
        </fieldset>
        {loading && <p role="status">Cargando categorías…</p>}
        {error && <p className="operations-error" role="alert">{error}</p>}
        <div className="program-catalog-toolbar">
          <button type="submit" className="bms-btn-primary" disabled={loading || saving || addingCategory || !categoryId}>{saving ? 'Guardando…' : 'Guardar programa'}</button>
        </div>
      </form>
    </WorkspaceDialog>
  );
}
