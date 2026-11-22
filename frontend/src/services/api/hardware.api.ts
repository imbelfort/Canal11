import { DeckLinkStatus, DeckLinkScanResult, HardwareInput, HardwareOutput, SdiTestResult, MasterOutputConfig } from '../../types/playout';

// Modo Web Puro: Retornos seguros sin requerir controladores propietarios DeckLink
const defaultStatus: DeckLinkStatus = {
  driverInstalled: false,
  deviceCount: 0,
  devices: [],
  hardwarePresent: false,
  activeProfile: 'WEB_HTML5_STREAM',
  currentStandard: '1080p29.97 (Web Video)'
};

const defaultScan: DeckLinkScanResult = {
  installed: false,
  deviceCount: 0,
  devices: [],
  driverVersion: 'Web Player Mode'
};

export const hardwareApi = {
  async getMasterOutputConfig(): Promise<MasterOutputConfig> {
    return {
      outputType: 'WEB_DISPLAY',
      resolution: '1920x1080',
      fps: 30,
      enabled: true
    } as any;
  },

  async saveMasterOutputConfig(_config: Partial<MasterOutputConfig>): Promise<void> {},

  async applyAndRestartOutput(_sdiFormat: string): Promise<{ success: boolean; message: string; decklink: DeckLinkStatus }> {
    return {
      success: true,
      message: 'Modo Web activo: salida mediante reproductor HTML5',
      decklink: defaultStatus
    };
  },

  async getDeckLinkCapabilities(): Promise<{ availableStandards: string[] }> {
    return { availableStandards: ['1080p30 (Web)', '720p60 (Web)'] };
  },

  async getRegisteredDevices(): Promise<{ masterVendor: string; devices: any[]; simultaneousOutput: any }> {
    return { masterVendor: 'Web Native HTML5', devices: [], simultaneousOutput: null };
  },

  async setMasterHardwareVendor(_vendor: string): Promise<void> {},

  async getDeckLinkStatus(): Promise<DeckLinkStatus> {
    return defaultStatus;
  },

  async scanDeckLinkHardware(): Promise<DeckLinkScanResult> {
    return defaultScan;
  },

  async getDeckLinkScan(): Promise<DeckLinkScanResult> {
    return defaultScan;
  },

  async testSdiOutput(_outputId?: string): Promise<SdiTestResult> {
    return { success: true, message: 'Salida web lista' } as any;
  },

  async getHardwareInputs(): Promise<HardwareInput[]> {
    return [];
  },

  async scanHardwareInputs(): Promise<HardwareInput[]> {
    return [];
  },

  async testHardwareInput(_id: string): Promise<{ success: boolean; signalDetected: boolean }> {
    return { success: false, signalDetected: false };
  },

  async getActiveInput(): Promise<{ activeInputId: string | null; input: HardwareInput | null }> {
    return { activeInputId: null, input: null };
  },

  async setActiveInput(_id: string): Promise<{ success: boolean; activeInputId: string }> {
    return { success: true, activeInputId: 'none' };
  },

  async clearActiveInput(): Promise<void> {},

  async getLiveInputState(): Promise<{ isLive: boolean; activeInput: HardwareInput | null; channelState: string }> {
    return { isLive: false, activeInput: null, channelState: 'IDLE' };
  },

  async triggerHardwareFailover(_reason?: string): Promise<void> {}
};
