import { useState } from 'react';
import { ChartLine, ChartPie, Donut } from 'lucide-react';
import type { AuditStats } from '../../types/playout';

const modes = [
  { value: 'line', label: 'Líneas', icon: ChartLine },
  { value: 'pie', label: 'Torta', icon: ChartPie },
  { value: 'donut', label: 'Dona', icon: Donut },
] as const;
const colors = ['#68dba3', '#54bed5', '#b596e2', '#e9b367', '#df829c', '#899ec7'];
const number = new Intl.NumberFormat('es-BO');
const percent = new Intl.NumberFormat('es-BO', { style: 'percent', maximumFractionDigits: 1 });
const shortDate = (day: string) => day.slice(5).split('-').reverse().join('/');

export function AuditChart({ data, labels, loading }: {
  data?: AuditStats['chart'];
  labels: Record<string, string>;
  loading: boolean;
}) {
  const [mode, setMode] = useState<(typeof modes)[number]['value']>('line');
  const statuses = Object.entries(labels)
    .map(([status, label], index) => ({ label, count: data?.statuses[status] ?? 0, color: colors[index % colors.length] }));
  const unknown = Object.entries(data?.statuses ?? {})
    .filter(([status]) => !(status in labels))
    .reduce((sum, [, count]) => sum + count, 0);
  if (unknown) statuses.push({ label: 'Otros', count: unknown, color: '#a5abb6' });
  const slices = statuses.filter(item => item.count > 0);
  const total = slices.reduce((sum, item) => sum + item.count, 0);
  const daily = data?.daily ?? [];
  const hasDailyData = daily.some(item => item.count > 0);
  const peak = Math.max(1, ...daily.map(item => item.count));
  const points = daily.map(({ count }, index) => ({
    x: daily.length === 1 ? 326 : 48 + (index * 556) / (daily.length - 1),
    y: 88 - (count / peak) * 68,
  }));
  const donut = mode === 'donut';
  let offset = 0;

  return (
    <section className="audit-chart" aria-label="Gráfico de emisiones" aria-busy={loading}>
      <div className="access-log-heading">
        <div>
          <h2>{mode === 'line' ? 'Emisiones por día' : 'Emisiones por estado'}</h2>
          <small>{mode === 'line' && daily.length ? `${shortDate(daily[0].day)}–${shortDate(daily[daily.length - 1].day)} · Bolivia` : 'Según los filtros aplicados'}</small>
        </div>
        <div className="audit-chart-switch" role="group" aria-label="Tipo de gráfico">
          {modes.map(({ value, label, icon: Icon }) => (
            <button type="button" key={value} aria-pressed={mode === value} onClick={() => setMode(value)}>
              <Icon size={14} aria-hidden="true" />{label}
            </button>
          ))}
        </div>
      </div>
      {loading && !data ? <p>Cargando gráfico…</p> : mode === 'line' ? (
        hasDailyData ? <svg className="audit-line" viewBox="0 0 640 115" role="img"
          aria-label={daily.map(({ day, count }) => `${shortDate(day)}: ${count}`).join(', ')}>
          {[20, 88].map(y => <line key={y} x1="48" x2="604" y1={y} y2={y} className="audit-chart-grid" />)}
          <text x="36" y="24" textAnchor="end">{number.format(peak)}</text>
          <text x="36" y="92" textAnchor="end">0</text>
          <polyline points={points.map(({ x, y }) => `${x},${y}`).join(' ')} fill="none" stroke="currentColor" strokeWidth="2" />
          {points.map(({ x, y }, index) => (
            <g key={daily[index].day}>
              <circle cx={x} cy={y} r="3" fill="currentColor"><title>{shortDate(daily[index].day)} · {daily[index].count} emisiones</title></circle>
              {(index === 0 || index === daily.length - 1 || (index % 3 === 0 && index < daily.length - 1)) &&
                <text x={x} y="108" textAnchor="middle">{shortDate(daily[index].day)}</text>}
            </g>
          ))}
        </svg> : <p>No hay emisiones en el período del gráfico.</p>
      ) : total > 0 ? (
        <div className="audit-chart-distribution">
          <svg viewBox="0 0 100 100" className="audit-chart-circle" aria-hidden="true">
            {slices.map(({ label, count, color }) => {
              const fraction = (count / total) * 100;
              const start = offset;
              offset += fraction;
              return <circle key={label} cx="50" cy="50" r={donut ? 39 : 25} fill="none" stroke={color}
                strokeWidth={donut ? 22 : 50} pathLength={100} strokeDasharray={`${fraction} ${100 - fraction}`}
                strokeDashoffset={-start} transform="rotate(-90 50 50)" />;
            })}
            {donut && <text x="50" y="50" textAnchor="middle" dominantBaseline="central">{number.format(total)}</text>}
          </svg>
          <ul className="audit-chart-legend">
            {slices.map(({ label, count, color }) => <li key={label}>
              <span className="audit-chart-swatch" style={{ backgroundColor: color }} aria-hidden="true" />
              <span>{label}</span><strong>{number.format(count)} · {percent.format(count / total)}</strong>
            </li>)}
          </ul>
        </div>
      ) : <p>No hay emisiones que coincidan con los filtros.</p>}
    </section>
  );
}
