import { NdiSource, NdiRuntimeStatus } from '../../types/playout';
import { BASE_URL, requestJson } from './client';

export const ndiApi = {
  async getNdiSources(): Promise<{ sources: NdiSource[]; selected: NdiSource | null }> {
    const data = await requestJson<{ sources: NdiSource[]; selected: NdiSource | null }>(`${BASE_URL}/ndi/sources`);
    return { sources: data.sources || [], selected: data.selected || null };
  },

  async scanNdiSources(): Promise<{ sources: NdiSource[]; selected: NdiSource | null }> {
    const data = await requestJson<{ sources: NdiSource[]; selected: NdiSource | null }>(`${BASE_URL}/ndi/scan`, { method: 'POST' });
    return { sources: data.sources || [], selected: data.selected || null };
  },

  async selectNdiSource(id: string): Promise<{ sources: NdiSource[]; selected: NdiSource | null }> {
    const data = await requestJson<{ sources: NdiSource[]; selected: NdiSource | null }>(`${BASE_URL}/ndi/select`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    });
    return { sources: data.sources || [], selected: data.selected || null };
  },

  async saveNdiSource(source: Partial<NdiSource>): Promise<NdiSource[]> {
    const data = await requestJson<{ sources: NdiSource[] }>(`${BASE_URL}/ndi/sources`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(source)
    });
    return data.sources || [];
  },

  async deleteNdiSource(id: string): Promise<NdiSource[]> {
    const data = await requestJson<{ sources: NdiSource[] }>(`${BASE_URL}/ndi/sources/${id}`, {
      method: 'DELETE'
    });
    return data.sources || [];
  },

  async clearOfflineSources(): Promise<{ sources: NdiSource[]; removedCount: number }> {
    const data = await requestJson<{ sources: NdiSource[]; removedCount: number }>(`${BASE_URL}/ndi/sources/clear-offline`, {
      method: 'POST'
    });
    return { sources: data.sources || [], removedCount: data.removedCount || 0 };
  },

  async testNdiConnection(ip: string, port: number = 5961): Promise<{ reachable: boolean; latencyMs?: number; error?: string }> {
    return requestJson<{ reachable: boolean; latencyMs?: number; error?: string }>(`${BASE_URL}/ndi/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ip, port })
    });
  },

  async getNdiStatus(): Promise<NdiRuntimeStatus> {
    const data = await requestJson<{ success: boolean; status: NdiRuntimeStatus }>(`${BASE_URL}/ndi/status`);
    return data.status;
  },

  async installNdiRuntime(): Promise<any> {
    return requestJson<any>(`${BASE_URL}/ndi/install-runtime`, {
      method: 'POST'
    });
  },

  getNdiPreviewStreamUrl(source?: string): string {
    const q = source ? `?source=${encodeURIComponent(source)}` : '';
    return `${BASE_URL}/ndi/preview-stream${q}`;
  },

  getNdiPreviewFrameUrl(source?: string): string {
    const q = source ? `?source=${encodeURIComponent(source)}` : '';
    return `${BASE_URL}/ndi/preview-frame${q}`;
  }
};
