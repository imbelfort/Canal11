import { AsRunLog, AuditStats, SystemIncident } from '../../types/playout';
import { BASE_URL, requestJson } from './client';

export type AuditLogQueryParams = {
  startDate?: string;
  endDate?: string;
  status?: string;
  search?: string;
  limit?: number;
  offset?: number;
};

export const auditApi = {
  async getAuditLogs(
    paramsOrStatus?: AuditLogQueryParams | string,
    search?: string
  ): Promise<{ logs: AsRunLog[]; total: number }> {
    const q = new URLSearchParams();

    if (typeof paramsOrStatus === 'string') {
      if (paramsOrStatus && paramsOrStatus !== 'ALL') q.append('status', paramsOrStatus);
      if (search) q.append('search', search);
    } else if (paramsOrStatus && typeof paramsOrStatus === 'object') {
      if (paramsOrStatus.startDate) q.append('startDate', paramsOrStatus.startDate);
      if (paramsOrStatus.endDate) q.append('endDate', paramsOrStatus.endDate);
      if (paramsOrStatus.status && paramsOrStatus.status !== 'ALL') q.append('status', paramsOrStatus.status);
      if (paramsOrStatus.search) q.append('search', paramsOrStatus.search);
      if (paramsOrStatus.limit) q.append('limit', String(paramsOrStatus.limit));
      if (paramsOrStatus.offset) q.append('offset', String(paramsOrStatus.offset));
    }

    const res = await requestJson<{ logs?: AsRunLog[]; total?: number } | AsRunLog[]>(`${BASE_URL}/audit/logs?${q.toString()}`);
    if (Array.isArray(res)) {
      return { logs: res, total: res.length };
    }
    return {
      logs: Array.isArray(res?.logs) ? res.logs : [],
      total: typeof res?.total === 'number' ? res.total : (res?.logs?.length || 0)
    };
  },

  async getAuditStats(): Promise<AuditStats> {
    const data = await requestJson<{ stats: AuditStats }>(`${BASE_URL}/audit/stats`);
    return data.stats;
  },

  getExportCsvUrl(
    paramsOrStatus?: { startDate?: string; endDate?: string; status?: string; search?: string } | string,
    search?: string
  ): string {
    const q = new URLSearchParams();

    if (typeof paramsOrStatus === 'string') {
      if (paramsOrStatus && paramsOrStatus !== 'ALL') q.append('status', paramsOrStatus);
      if (search) q.append('search', search);
    } else if (paramsOrStatus && typeof paramsOrStatus === 'object') {
      if (paramsOrStatus.startDate) q.append('startDate', paramsOrStatus.startDate);
      if (paramsOrStatus.endDate) q.append('endDate', paramsOrStatus.endDate);
      if (paramsOrStatus.status && paramsOrStatus.status !== 'ALL') q.append('status', paramsOrStatus.status);
      if (paramsOrStatus.search) q.append('search', paramsOrStatus.search);
    }

    return `${BASE_URL}/audit/export/csv?${q.toString()}`;
  },

  async getIncidents(): Promise<SystemIncident[]> {
    const data = await requestJson<{ incidents: SystemIncident[] }>(`${BASE_URL}/audit/incidents`);
    return data.incidents || [];
  },

  getDailyReportTxtUrl(date?: string): string {
    const q = new URLSearchParams();
    if (date) q.append('date', date);
    return `${BASE_URL}/audit/daily-report?${q.toString()}`;
  },

  async triggerCleanup(retentionDays = 30): Promise<{ success: boolean; deletedEmissions: number; deletedIncidents: number }> {
    return await requestJson<{ success: boolean; deletedEmissions: number; deletedIncidents: number }>(`${BASE_URL}/audit/cleanup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ retentionDays })
    });
  }
};
