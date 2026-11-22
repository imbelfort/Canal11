import { PlaylistItem, AddPlaylistItemDto } from '../../types/playout';
import { BASE_URL, requestJson, requestVoid } from './client';

export const playlistApi = {
  async getPlaylist(): Promise<{ playlist: any; items: PlaylistItem[] }> {
    const data = await requestJson<{ playlist: any; items: PlaylistItem[] }>(`${BASE_URL}/playlist`);
    return { playlist: data.playlist, items: data.items || [] };
  },

  async addItem(item: AddPlaylistItemDto): Promise<void> {
    await this.addItems([item]);
  },

  async addItems(items: AddPlaylistItemDto[], insertAtIndex?: number): Promise<void> {
    await requestVoid(`${BASE_URL}/playlist/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items, insertAtIndex })
    });
  },

  async updateItem(id: string | number, updates: Partial<PlaylistItem>): Promise<void> {
    await requestVoid(`${BASE_URL}/playlist/items/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
  },

  async deleteBatch(ids: (string | number)[]): Promise<{ success: boolean; deletedCount: number }> {
    return await requestJson(`${BASE_URL}/playlist/items/delete-batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids })
    });
  },

  async deleteItem(id: string | number): Promise<void> {
    await requestVoid(`${BASE_URL}/playlist/items/${id}`, {
      method: 'DELETE'
    });
  },

  async reorderItems(orderedIds: (string | number)[]): Promise<void> {
    await requestVoid(`${BASE_URL}/playlist/reorder`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderedIds })
    });
  },

  async clearPlaylist(): Promise<void> {
    await requestVoid(`${BASE_URL}/playlist/clear`, { method: 'POST' });
  },

  async replacePlaylist(items: AddPlaylistItemDto[]): Promise<void> {
    await requestVoid(`${BASE_URL}/playlist/replace`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items })
    });
  },

  async importPlaylist(content: string, format: 'xml' | 'json' = 'xml'): Promise<number> {
    const data = await requestJson<{ importedCount: number }>(`${BASE_URL}/playlist/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, format, replaceExisting: true })
    });
    return data.importedCount || 0;
  },

  getExportXmlUrl(): string {
    return `${BASE_URL}/playlist/export?format=xml`;
  },

  getExportM3uUrl(): string {
    return `${BASE_URL}/playlist/export?format=m3u`;
  },

  async probeMedia(filePath: string): Promise<{ durationMs?: number; format?: any; streams?: any }> {
    return await requestJson<{ durationMs?: number; format?: any; streams?: any }>(`${BASE_URL}/media/probe?path=${encodeURIComponent(filePath)}`);
  },

  async replaceItemFile(itemId: number | string, filePath: string, title?: string, durationMs?: number): Promise<{ success: boolean; title?: string; durationMs?: number; filePath?: string }> {
    return await requestJson<{ success: boolean; title?: string; durationMs?: number; filePath?: string }>(`${BASE_URL}/playlist/items/${itemId}/replace-file`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filePath, title, durationMs })
    });
  },

  async validateBatch(paths: string[]): Promise<Record<string, { valid: boolean; path?: string; error?: string }>> {
    const data = await requestJson<{ success: boolean; results: Record<string, { valid: boolean; path?: string; error?: string }> }>(`${BASE_URL}/playlist/verify-files`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filePaths: paths })
    });
    return data.results || {};
  },

  async purgeMissing(): Promise<number> {
    const data = await requestJson<{ success: boolean; deletedCount: number }>(`${BASE_URL}/playlist/purge-missing`, {
      method: 'POST'
    });
    return data.deletedCount || 0;
  },

  async toggleItemGraphics(itemId: string | number, showGraphics: boolean): Promise<{ success: boolean; itemId: number; showGraphics: boolean }> {
    return await requestJson<{ success: boolean; itemId: number; showGraphics: boolean }>(`${BASE_URL}/playlist/items/${itemId}/graphics`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ showGraphics: Boolean(showGraphics) })
    });
  }
};
