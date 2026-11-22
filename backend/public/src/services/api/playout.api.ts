import { BASE_URL, requestVoid } from './client';

export const playoutApi = {
  async play(itemId?: string | number): Promise<void> {
    await requestVoid(`${BASE_URL}/playout/play`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemId })
    });
  },

  async pause(): Promise<void> {
    await requestVoid(`${BASE_URL}/playout/pause`, { method: 'POST' });
  },

  async resume(): Promise<void> {
    await requestVoid(`${BASE_URL}/playout/resume`, { method: 'POST' });
  },

  async stop(): Promise<void> {
    await requestVoid(`${BASE_URL}/playout/stop`, { method: 'POST' });
  },

  async setLoop(loop: boolean): Promise<void> {
    await requestVoid(`${BASE_URL}/playout/loop`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ loop })
    });
  },

  async next(): Promise<void> {
    await requestVoid(`${BASE_URL}/playout/next`, { method: 'POST' });
  },

  async takeLive(): Promise<void> {
    await requestVoid(`${BASE_URL}/playout/take-live`, { method: 'POST' });
  },

  async returnLive(): Promise<void> {
    await requestVoid(`${BASE_URL}/playout/return-live`, { method: 'POST' });
  },

  async triggerEmergency(reason?: string): Promise<void> {
    await requestVoid(`${BASE_URL}/playout/emergency`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason })
    });
  }
};
