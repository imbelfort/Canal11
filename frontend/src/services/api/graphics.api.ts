import { BASE_URL, requestJson } from './client';
import { GraphicsState, GraphicsLayers } from '../../types/graphics';

export const graphicsApi = {
  async getGraphicsState(): Promise<GraphicsState> {
    return requestJson<GraphicsState>(`${BASE_URL}/graphics/state`);
  },

  async saveGraphicsLayer(layerId: keyof GraphicsLayers | 'master_settings', config: any): Promise<GraphicsState> {
    return requestJson<GraphicsState>(`${BASE_URL}/graphics/layer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ layerId, config })
    });
  },

  async saveGraphicsPackage(packageData: { masterEnabled?: boolean; layers?: Partial<GraphicsLayers> }): Promise<GraphicsState> {
    return requestJson<GraphicsState>(`${BASE_URL}/graphics/package`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(packageData)
    });
  },

  async toggleMasterGraphics(enabled: boolean): Promise<GraphicsState> {
    return requestJson<GraphicsState>(`${BASE_URL}/graphics/master-toggle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled })
    });
  },

  async refreshWeather(): Promise<{ success: boolean; weather?: any; error?: string }> {
    return requestJson<{ success: boolean; weather?: any; error?: string }>(`${BASE_URL}/graphics/weather/refresh`, {
      method: 'POST'
    });
  },

  async updateWeatherLocation(latitude?: number | null, longitude?: number | null, city?: string): Promise<{ success: boolean; weather?: any; error?: string }> {
    return requestJson<{ success: boolean; weather?: any; error?: string }>(`${BASE_URL}/graphics/weather/location`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ latitude: latitude ?? null, longitude: longitude ?? null, city: city || '' })
    });
  },

  async scanPngSequence(dirPath: string): Promise<{
    success: boolean;
    dirPath?: string;
    framesCount?: number;
    width?: number;
    height?: number;
    hasAlpha?: boolean;
    memoryMb?: number;
    exceedsLimit?: boolean;
    firstFrame?: string;
    frames?: string[];
    error?: string;
  }> {
    return requestJson<{
      success: boolean;
      dirPath?: string;
      framesCount?: number;
      width?: number;
      height?: number;
      hasAlpha?: boolean;
      memoryMb?: number;
      exceedsLimit?: boolean;
      firstFrame?: string;
      frames?: string[];
      error?: string;
    }>(`${BASE_URL}/graphics/sequence/scan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dirPath })
    });
  },

  async toggleItemGraphics(itemId: number, showGraphics: boolean): Promise<{ success: boolean; itemId: number; showGraphics: boolean }> {
    try {
      return await requestJson<{ success: boolean; itemId: number; showGraphics: boolean }>(`${BASE_URL}/graphics/item-toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId, showGraphics })
      });
    } catch (primaryErr: any) {
      // Fallback a ruta de playlist redundante si /graphics devuelve 404
      return await requestJson<{ success: boolean; itemId: number; showGraphics: boolean }>(`${BASE_URL}/playlist/items/${itemId}/graphics`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ showGraphics })
      });
    }
  }
};
