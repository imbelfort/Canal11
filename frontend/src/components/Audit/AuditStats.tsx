import React from 'react';
import { AuditStats as AuditStatsType } from '../../types/playout';
import { BarChart2, CheckCircle2, Calendar, AlertOctagon } from 'lucide-react';

interface AuditStatsProps {
  stats: AuditStatsType | null;
}

export const AuditStats: React.FC<AuditStatsProps> = ({ stats }) => {
  return (
    <div className="stats-bar">
      <div className="stat-metric">
        <span className="num">{stats?.totalEmissions || 0}</span>
        <span className="lbl">
          <BarChart2 size={11} />
          Total Emisiones
        </span>
      </div>
      <div className="stat-metric">
        <span className="num">{stats?.todayEmissions || 0}</span>
        <span className="lbl">
          <Calendar size={11} />
          Emitidos Hoy
        </span>
      </div>
      <div className="stat-metric">
        <span className="num" style={{ color: 'var(--apple-green)' }}>{stats?.successRate || '100%'}</span>
        <span className="lbl">
          <CheckCircle2 size={11} />
          Cumplimiento
        </span>
      </div>
      <div className="stat-metric">
        <span className="num" style={{ color: 'var(--apple-red)' }}>{stats?.activeIncidents || 0}</span>
        <span className="lbl">
          <AlertOctagon size={11} />
          Incidentes
        </span>
      </div>
    </div>
  );
};
