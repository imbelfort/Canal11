import { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';

const boliviaTime = new Intl.DateTimeFormat('es-BO', {
  timeZone: 'America/La_Paz', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
});

export function BoliviaClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  return <span className="operations-clock" aria-label="Hora actual de Bolivia">
    <Clock size={15} aria-hidden="true" />
    <time dateTime={now.toISOString()}>{boliviaTime.format(now)}</time>
    <small>BOT</small>
  </span>;
}
