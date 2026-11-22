import { BASE_URL, requestJson } from './client';

export const settingsApi = {
  async getEmergencySettings(): Promise<{ mode: string; filePath: string; title: string; isFileValid: boolean; probe: any }> {
    return requestJson<{ mode: string; filePath: string; title: string; isFileValid: boolean; probe: any }>(`${BASE_URL}/settings/emergency`);
  },

  async saveEmergencySettings(settings: { mode?: string; filePath?: string; title?: string }): Promise<boolean> {
    const data = await requestJson<{ success: boolean }>(`${BASE_URL}/settings/emergency`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings)
    });
    return data.success;
  },

  async getAudioSettings(): Promise<{
    normalization: 'EBU_R128' | 'ATSC_A85' | 'OFF';
    masterVolumeDb: number;
    limiterEnabled: boolean;
    loudnessStats?: { ok: number; silent: number; noAudio: number; pending: number; error: number; total: number };
    standards: Record<string, { name: string; targetLufs: number | null; maxTruePeakDb: number | null }>;
  }> {
    const res = await requestJson<{ success: boolean; data: any }>(`${BASE_URL}/settings/audio`);
    return res.data;
  },

  async saveAudioSettings(settings: {
    normalization?: 'EBU_R128' | 'ATSC_A85' | 'OFF' | 'CUSTOM';
    masterVolumeDb?: number;
    limiterEnabled?: boolean;
    customTargetLufs?: number;
    limiterCeilingDb?: number;
    seq?: number;
  }): Promise<{ success: boolean; seq?: number; data?: any }> {
    return requestJson<{ success: boolean; seq?: number; data?: any }>(`${BASE_URL}/settings/audio`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings)
    });
  }
};
