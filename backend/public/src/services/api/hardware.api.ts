import { DeckLinkStatus, DeckLinkScanResult, HardwareInput, HardwareOutput, SdiTestResult, MasterOutputConfig } from '../../types/playout';
import { BASE_URL, requestJson, requestVoid } from './client';

export const hardwareApi = {
  async getMasterOutputConfig(): Promise<MasterOutputConfig> {
    const data = await requestJson<{ config: MasterOutputConfig }>(`${BASE_URL}/hardware/output-config`);
    return data.config;
  },

  async saveMasterOutputConfig(config: Partial<MasterOutputConfig>): Promise<void> {
    await requestVoid(`${BASE_URL}/hardware/output-config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config)
    });
  },

  async applyAndRestartOutput(sdiFormat: string): Promise<{ success: boolean; message: string; decklink: DeckLinkStatus }> {
    return requestJson(`${BASE_URL}/hardware/apply-output`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sdiFormat })
    });
  },

  async getDeckLinkCapabilities(): Promise<{ availableStandards: string[] }> {
    return requestJson(`${BASE_URL}/decklink/capabilities`);
  },

  async getRegisteredDevices(): Promise<{ masterVendor: string; devices: any[]; simultaneousOutput: any }> {
    return requestJson(`${BASE_URL}/hardware/devices`);
  },

  async setMasterHardwareVendor(vendor: string): Promise<void> {
    await requestVoid(`${BASE_URL}/hardware/master-device`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vendor })
    });
  },

  async getDeckLinkStatus(): Promise<DeckLinkStatus> {
    const data = await requestJson<{ decklink: DeckLinkStatus }>(`${BASE_URL}/decklink/status`);
    return data.decklink;
  },

  async scanDeckLinkHardware(): Promise<DeckLinkScanResult> {
    const data = await requestJson<{ scan: DeckLinkScanResult }>(`${BASE_URL}/decklink/scan`, {
      method: 'POST'
    });
    return data.scan;
  },

  async getDeckLinkScan(): Promise<DeckLinkScanResult> {
    const data = await requestJson<{ scan: DeckLinkScanResult }>(`${BASE_URL}/decklink/scan`);
    return data.scan;
  },

  async testSdiOutput(outputId?: string): Promise<SdiTestResult> {
    return requestJson<SdiTestResult>(`${BASE_URL}/decklink/test-output`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ outputId })
    });
  },

  async getHardwareInputs(): Promise<HardwareInput[]> {
    const data = await requestJson<{ inputs: HardwareInput[] }>(`${BASE_URL}/hardware/inputs`);
    return data.inputs || [];
  },

  async saveHardwareInput(input: Partial<HardwareInput>): Promise<HardwareInput[]> {
    const data = await requestJson<{ inputs: HardwareInput[] }>(`${BASE_URL}/hardware/inputs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input)
    });
    return data.inputs || [];
  },

  async deleteHardwareInput(id: string): Promise<HardwareInput[]> {
    const data = await requestJson<{ inputs: HardwareInput[] }>(`${BASE_URL}/hardware/inputs/${id}`, {
      method: 'DELETE'
    });
    return data.inputs || [];
  },

  async setDefaultHardwareInput(id: string): Promise<HardwareInput[]> {
    const data = await requestJson<{ inputs: HardwareInput[] }>(`${BASE_URL}/hardware/inputs/${id}/default`, {
      method: 'POST'
    });
    return data.inputs || [];
  },

  async relinkHardwareInput(id: string, deviceName: string): Promise<HardwareInput[]> {
    const data = await requestJson<{ inputs: HardwareInput[] }>(`${BASE_URL}/hardware/inputs/${id}/relink`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceName })
    });
    return data.inputs || [];
  },

  async cleanDisconnectedInputs(connectedDevices: string[]): Promise<HardwareInput[]> {
    const data = await requestJson<{ inputs: HardwareInput[] }>(`${BASE_URL}/hardware/inputs/clean-disconnected`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ connectedDevices })
    });
    return data.inputs || [];
  },

  async getHardwareOutputs(): Promise<HardwareOutput[]> {
    const data = await requestJson<{ outputs: HardwareOutput[] }>(`${BASE_URL}/hardware/outputs`);
    return data.outputs || [];
  },

  async saveHardwareOutput(output: Partial<HardwareOutput>): Promise<HardwareOutput[]> {
    const data = await requestJson<{ outputs: HardwareOutput[] }>(`${BASE_URL}/hardware/outputs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(output)
    });
    return data.outputs || [];
  },

  async deleteHardwareOutput(id: string): Promise<HardwareOutput[]> {
    const data = await requestJson<{ outputs: HardwareOutput[] }>(`${BASE_URL}/hardware/outputs/${id}`, {
      method: 'DELETE'
    });
    return data.outputs || [];
  },

  async relinkHardwareOutput(id: string, deviceName: string): Promise<HardwareOutput[]> {
    const data = await requestJson<{ outputs: HardwareOutput[] }>(`${BASE_URL}/hardware/outputs/${id}/relink`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceName })
    });
    return data.outputs || [];
  },

  async cleanDisconnectedOutputs(connectedDevices: string[]): Promise<HardwareOutput[]> {
    const data = await requestJson<{ outputs: HardwareOutput[] }>(`${BASE_URL}/hardware/outputs/clean-disconnected`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ connectedDevices })
    });
    return data.outputs || [];
  },

  async getKeyerStatus(): Promise<any> {
    const data = await requestJson<{ keyer: any }>(`${BASE_URL}/decklink/keyer`);
    return data.keyer;
  },

  async setKeyer(config: { enabled?: boolean; isExternal?: boolean; blendLevel?: number }): Promise<any> {
    const data = await requestJson<{ keyer: any }>(`${BASE_URL}/decklink/keyer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config)
    });
    return data.keyer;
  },

  async rampKeyer(frames = 15, blendIn = true): Promise<any> {
    const data = await requestJson<{ keyer: any }>(`${BASE_URL}/decklink/keyer/ramp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ frames, blendIn })
    });
    return data.keyer;
  },

  async getDirectShowStatus(): Promise<{ filters: any; directShowSdkAvailable: boolean }> {
    return requestJson(`${BASE_URL}/decklink/directshow`);
  },

  async installDeckLinkDriver(): Promise<any> {
    return requestJson(`${BASE_URL}/decklink/install-driver`, {
      method: 'POST'
    });
  },

  async registerDeckLinkFilters(): Promise<any> {
    return requestJson(`${BASE_URL}/decklink/register-filters`, {
      method: 'POST'
    });
  },

  async restartDeckLinkService(): Promise<{ success: boolean; result: { success: boolean; message: string } }> {
    return requestJson(`${BASE_URL}/decklink/restart-service`, {
      method: 'POST'
    });
  },

  async restartDeckLinkPnp(): Promise<{ success: boolean; result: { success: boolean; message: string } }> {
    return requestJson(`${BASE_URL}/decklink/restart-pnp`, {
      method: 'POST'
    });
  }
};
