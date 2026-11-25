import { BarChart2, Calendar, CheckCircle2, AlertOctagon } from 'lucide-react';
import type { AuditStats as AuditStatsData } from '../../types/playout';

export function AuditStats({ stats }: { stats: AuditStatsData | null }) {
  const entries = [
    { label: 'Histórico', value: stats?.total_broadcasts, icon: BarChart2 },
    { label: 'Hoy', value: stats?.today_broadcasts, icon: Calendar },
    { label: 'Emitidos correctamente', value: stats?.successful_broadcasts, icon: CheckCircle2 },
    { label: 'Fallidos o no emitidos', value: stats?.failed_broadcasts, icon: AlertOctagon },
  ];
  return (
    <div className="stats-bar" aria-label="Resumen histórico de emisiones">
      {entries.map(({ label, value, icon: Icon }) => (
        <div className="stat-metric" key={label}>
          <span className="num">{value ?? '—'}</span>
          <span className="lbl"><Icon size={14} aria-hidden="true" /> {label}</span>
        </div>
      ))}
    </div>
  );
}
