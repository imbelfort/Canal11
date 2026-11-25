import { useEffect, useId, useRef, useState } from 'react';
import { ArrowUpRight, Search } from 'lucide-react';
import { findSearchOptions, type BmsArea, type SearchTarget } from '../../navigation';

export function GlobalSearch({ areas, onSelect }: {
  areas: BmsArea[];
  onSelect: (target: SearchTarget) => void;
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const listId = useId();
  const results = findSearchOptions(query, areas);

  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k' && !document.querySelector('dialog[open]')) {
        event.preventDefault();
        input.current?.focus();
        setOpen(true);
      }
    };
    window.addEventListener('keydown', shortcut);
    return () => window.removeEventListener('keydown', shortcut);
  }, []);

  useEffect(() => {
    if (open) document.getElementById(`${listId}-${active}`)?.scrollIntoView({ block: 'nearest' });
  }, [open, active, listId]);

  const select = (target: SearchTarget) => {
    setOpen(false);
    setQuery('');
    setActive(0);
    onSelect(target);
  };

  return (
    <div className="global-search" onBlur={event => {
      if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
    }}>
      <Search size={16} aria-hidden="true" />
      <input ref={input} role="combobox" aria-label="Buscar pantallas y opciones" aria-autocomplete="list"
        aria-expanded={open} aria-controls={open ? listId : undefined}
        aria-activedescendant={open && results[active] ? `${listId}-${active}` : undefined}
        placeholder="Buscar en Canal 11" value={query} onFocus={() => setOpen(true)} onClick={() => setOpen(true)}
        onChange={event => { setQuery(event.target.value); setActive(0); setOpen(true); }}
        onKeyDown={event => {
          switch (event.key) {
            case 'ArrowDown':
            case 'ArrowUp':
              event.preventDefault();
              setOpen(true);
              if (results.length) setActive(open ? (active + (event.key === 'ArrowDown' ? 1 : -1) + results.length) % results.length : 0);
              break;
            case 'Enter':
              if (open && results[active]) { event.preventDefault(); select(results[active].target); }
              break;
            case 'Escape':
              setOpen(false);
              break;
          }
        }} />
      <kbd>Ctrl K</kbd>
      {open && <div className="global-search-menu">
        <ul id={listId} role="listbox" aria-label="Opciones disponibles">
          {results.map(({ label, group, target }, index) => (
            <li key={label} id={`${listId}-${index}`} role="option" aria-selected={index === active}
              onMouseDown={event => event.preventDefault()} onClick={() => select(target)}>
              <span>{label}<small>{group}</small></span><ArrowUpRight size={14} aria-hidden="true" />
            </li>
          ))}
        </ul>
        {!results.length && <p role="status">Sin opciones para esta búsqueda.</p>}
      </div>}
    </div>
  );
}
