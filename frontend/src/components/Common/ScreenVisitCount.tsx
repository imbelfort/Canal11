import { useEffect, useRef, useState } from 'react';
import { Eye } from 'lucide-react';

const prefix = 'canal11_screen_visits:';
const sessionCounts = new Map<string, number>();
const numberFormat = new Intl.NumberFormat('es-BO');

function readCount(key: string) {
  try {
    const value = Number(localStorage.getItem(key));
    return Number.isSafeInteger(value) && value >= 0 ? value : 0;
  } catch {
    return sessionCounts.get(key) ?? 0;
  }
}

export function ScreenVisitCount({ screen }: { screen: string }) {
  const key = prefix + screen;
  const lastScreen = useRef<string | null>(null);
  const [display, setDisplay] = useState<{ key: string; count: number }>();

  useEffect(() => {
    if (lastScreen.current !== key) {
      lastScreen.current = key;
      const count = readCount(key) + 1;
      sessionCounts.set(key, count);
      try {
        localStorage.setItem(key, String(count));
      } catch {
        // Keep counting in memory when browser storage is unavailable.
      }
    }

    const sync = () => setDisplay({ key, count: Math.max(readCount(key), sessionCounts.get(key) ?? 0) });
    const onStorage = (event: StorageEvent) => {
      if (event.key !== key && event.key !== null) return;
      sessionCounts.delete(key);
      sync();
    };
    sync();
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [key]);

  const count = display?.key === key ? display.count : null;
  return (
    <span className="screen-visit-count" title="Visitas a esta pantalla en este navegador">
      <Eye size={15} aria-hidden="true" />
      {count === null ? 'Visitas: —' : count === 1 ? '1 visita' : `${numberFormat.format(count)} visitas`}
    </span>
  );
}
