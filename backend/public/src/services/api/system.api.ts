import { BASE_URL, requestJson } from './client';

export const systemApi = {
  async getAboutInfo(): Promise<any> {
    return requestJson<any>(`${BASE_URL}/system/about`);
  },

  async getFFmpegInfo(): Promise<{ success: boolean; info: any }> {
    return requestJson<any>(`${BASE_URL}/media/engine-info`);
  },

  async analyzeMediaHealth(filePath: string): Promise<any> {
    return requestJson<any>(`${BASE_URL}/media/health?path=${encodeURIComponent(filePath)}`);
  },

  async getNetworkInfo(): Promise<{
    success: boolean;
    port: number;
    primaryIp: string;
    builderUrl: string;
    fullUrl: string;
    addresses: Array<{ interface: string; ip: string; netmask: string; builderUrl: string; fullUrl: string }>;
  }> {
    return requestJson<any>(`${BASE_URL}/system/network`);
  }
};
