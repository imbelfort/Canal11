import { NdiSource, NdiRuntimeStatus } from '../../types/playout';

// Modo Web Puro: Retornos seguros sin requerir red local propietaria NDI
export const ndiApi = {
  async getNdiSources(): Promise<{ sources: NdiSource[]; selected: NdiSource | null }> {
    return { sources: [], selected: null };
  },

  async scanNdiSources(): Promise<{ sources: NdiSource[]; selected: NdiSource | null }> {
    return { sources: [], selected: null };
  },

  async selectNdiSource(_id: string): Promise<{ sources: NdiSource[]; selected: NdiSource | null }> {
    return { sources: [], selected: null };
  },

  async saveNdiSource(_source: Partial<NdiSource>): Promise<NdiSource[]> {
    return [];
  },

  async deleteNdiSource(_id: string): Promise<NdiSource[]> {
    return [];
  },

  async clearOfflineSources(): Promise<{ sources: NdiSource[]; removedCount: number }> {
    return { sources: [], removedCount: 0 };
  },

  async testNdiConnection(_ip: string, _port: number = 5961): Promise<{ reachable: boolean; latencyMs?: number; error?: string }> {
    return { reachable: false, error: 'NDI no aplicable en entorno Web Puro' };
  },

  async getNdiRuntimeStatus(): Promise<NdiRuntimeStatus> {
    return {
      isInstalled: false,
      activeSourcesCount: 0,
      activeSendersCount: 0,
      isBroadcasting: false,
      version: 'Web Pure Mode'
    } as any;
  }
};
