import { useId, useState, type CSSProperties } from 'react';
import type { GeneralReport } from '../../services/bmsApi';

type ChartMode = 'bars' | 'donut' | 'pie';
type Metric = keyof GeneralReport['metricas'];

const metrics: { key: Metric; title: string; labels: Record<string, string>; initial: ChartMode }[] = [
  { key: 'parrillas', title: 'Parrillas por estado', initial: 'bars', labels: {
    BORRADOR: 'Borrador', APROBADA: 'Aprobadas', PUBLICADA: 'Publicadas', CERRADA: 'Cerradas',
  } },
  { key: 'emisiones', title: 'Emisiones por resultado', initial: 'donut', labels: {
    EMITIDO_CORRECTO: 'Emitidas correctamente', DESPLAZADO: 'Desplazadas', FALLA_TECNICA: 'Falla técnica',
    CORTE_ENERGIA: 'Corte de energía', INTERRUPCION_NOTICIOSA: 'Interrupción noticiosa', NO_EMITIDO: 'No emitidas',
  } },
  { key: 'archivos', title: 'Archivos por control técnico', initial: 'bars', labels: {
    APROBADO_TECNICO: 'Aprobados', OBSERVADO: 'Observados', PENDIENTE: 'Pendientes',
  } },
  { key: 'cobros', title: 'Cobros reales por estado', initial: 'donut', labels: {
    PAGADO: 'Pagados', PENDIENTE: 'Pendientes', FALLIDO: 'Fallidos', EXPIRADO: 'Expirados',
  } },
];
const modes: Record<ChartMode, string> = { bars: 'Barras', donut: 'Dona', pie: 'Torta' };
const colors = Array.from({ length: 6 }, (_, index) => `var(--metric-series-${index + 1})`);
const number = new Intl.NumberFormat('es-BO');
const percent = new Intl.NumberFormat('es-BO', { style: 'percent', maximumFractionDigits: 1 });

function MetricChart({ metric, counts }: { metric: typeof metrics[number]; counts: Record<string, number> }) {
  const heading = useId();
  const storageKey = `canal11_metric_chart:${metric.key}`;
  const [mode, setMode] = useState<ChartMode>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved === 'bars' || saved === 'donut' || saved === 'pie') return saved;
    } catch { /* Chart selection can still be changed for the current view. */ }
    return metric.initial;
  });
  const series = Object.entries(counts).map(([status, count]) => {
    const order = Object.keys(metric.labels).indexOf(status);
    return { status, value: Number(count), label: metric.labels[status] ?? status, order: order < 0 ? colors.length - 1 : order };
  }).filter(item => item.value > 0).sort((a, b) => a.order - b.order);
  const total = series.reduce((sum, item) => sum + item.value, 0);
  const max = Math.max(1, ...series.map(item => item.value));
  let position = 0;
  const stops = series.map(item => {
    const start = position;
    position += item.value;
    return `${colors[item.order % colors.length]} ${start / total * 100}% ${position / total * 100}%`;
  });

  return <section className="bms-card metrics-chart" aria-labelledby={heading}>
    <header className="metrics-chart-header">
      <div><h3 id={heading}>{metric.title}</h3><small>{number.format(total)} registros</small></div>
      <select aria-label={`Tipo de gráfico: ${metric.title}`} value={mode} onChange={event => {
        const next = event.target.value as ChartMode;
        setMode(next);
        try { localStorage.setItem(storageKey, next); } catch { /* Browser storage is optional. */ }
      }}>
        {Object.entries(modes).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
      </select>
    </header>
    {total === 0 ? <p className="metrics-chart-empty">Sin registros para mostrar.</p> : (
      <div className="metrics-chart-body" data-mode={mode}>
        {mode !== 'bars' && <div className="metrics-chart-round" aria-hidden="true"
          style={{ background: `conic-gradient(${stops.join(', ')})` }}>
          {mode === 'donut' && <strong>{number.format(total)}</strong>}
        </div>}
        <ul className="metrics-chart-values">
          {series.map(({ status, order, label, value }) => <li key={status}
            style={{ '--metric-color': colors[order % colors.length] } as CSSProperties}>
            <div><span className="metrics-chart-swatch" aria-hidden="true" /><span>{label}</span>
              <strong>{number.format(value)}{mode !== 'bars' && <small> · {percent.format(value / total)}</small>}</strong>
            </div>
            {mode === 'bars' && <div className="metrics-chart-track" aria-hidden="true">
              <span style={{ width: `${value / max * 100}%` }} />
            </div>}
          </li>)}
        </ul>
      </div>
    )}
  </section>;
}

export function ManagementMetrics({ data }: { data: GeneralReport['metricas'] }) {
  return <div className="management-metrics">
    {metrics.map(metric => <MetricChart key={metric.key} metric={metric} counts={data[metric.key]} />)}
  </div>;
}
