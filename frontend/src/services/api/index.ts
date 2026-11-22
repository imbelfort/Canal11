import { playlistApi } from './playlist.api';
import { playoutApi } from './playout.api';
import { auditApi } from './audit.api';
import { hardwareApi } from './hardware.api';
import { ndiApi } from './ndi.api';
import { settingsApi } from './settings.api';
import { systemApi } from './system.api';
import { graphicsApi } from './graphics.api';

export * from './client';
export * from './playlist.api';
export * from './playout.api';
export * from './audit.api';
export * from './hardware.api';
export * from './ndi.api';
export * from './settings.api';
export * from './system.api';
export * from './graphics.api';

/**
 * Cliente de API Unificado para IB-Cast Playout.
 * Agrupa los módulos verticales manteniendo compatibilidad total.
 */
export const api = {
  ...playlistApi,
  ...playoutApi,
  ...auditApi,
  ...hardwareApi,
  ...ndiApi,
  ...settingsApi,
  ...systemApi,
  ...graphicsApi
};
