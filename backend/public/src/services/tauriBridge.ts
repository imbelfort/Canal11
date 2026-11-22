import { isTauriEnv } from '../hooks/usePlayoutSocket';

export function setupTauriWindowBridge() {
  const getTauriModules = async () => {
    try {
      const { getCurrentWindow } = await import('@tauri-apps/api/window');
      const { open } = await import('@tauri-apps/plugin-dialog');
      return { getCurrentWindow, open };
    } catch (e) {
      console.warn('[Tauri Bridge] No se pudieron cargar los modulos nativos:', e);
      return { getCurrentWindow: null as any, open: null as any };
    }
  };

  (window as any).electronAPI = {
    isElectron: false,
    isTauri: true,

    getSystemVersions: () => ({
      electron: 'N/A (Tauri Native)',
      chrome: 'WebView2 / Edge',
      node: 'Rust Native Engine',
      v8: 'Windows Native'
    }),

    openVideoDialog: async (): Promise<string[]> => {
      try {
        const { open } = await getTauriModules();
        if (!open) {
          console.warn('[Tauri Dialog] Funcion open no disponible.');
          return [];
        }
        const selected = await open({
          multiple: true,
          filters: [
            {
              name: 'Broadcast Video',
              extensions: ['mp4', 'mov', 'mkv', 'avi', 'mxf', 'ts', 'webm', 'wmv', 'mpg', 'mpeg']
            },
            {
              name: 'Todos los archivos',
              extensions: ['*']
            }
          ]
        });
        if (!selected) return [];
        return Array.isArray(selected) ? selected : [selected];
      } catch (err) {
        console.error('[Tauri Dialog] Error al abrir videos:', err);
        return [];
      }
    },

    openEmergencyFileDialog: async (): Promise<string | null> => {
      try {
        const { open } = await getTauriModules();
        const selected = await open({
          multiple: false,
          filters: [
            {
              name: 'Video / Imagen de Emergencia',
              extensions: ['mp4', 'mov', 'mkv', 'png', 'jpg']
            }
          ]
        });
        return (selected as string) || null;
      } catch (err) {
        console.error('[Tauri Dialog] Error al abrir archivo de emergencia:', err);
        return null;
      }
    },

    openImageDialog: async (): Promise<string | null> => {
      try {
        const { open } = await getTauriModules();
        const selected = await open({
          multiple: false,
          filters: [
            {
              name: 'Imagen PNG / Logo',
              extensions: ['png', 'tga', 'jpg', 'jpeg', 'webp']
            }
          ]
        });
        return (selected as string) || null;
      } catch (err) {
        console.error('[Tauri Dialog] Error al abrir imagen:', err);
        return null;
      }
    },

    openFolderDialog: async (): Promise<string | null> => {
      try {
        const { open } = await getTauriModules();
        const selected = await open({
          directory: true,
          multiple: false
        });
        return (selected as string) || null;
      } catch (err) {
        console.error('[Tauri Dialog] Error al abrir carpeta:', err);
        return null;
      }
    },

    getPathForFile: (file: any) => {
      return file.path || file.name;
    },

    minimize: async () => {
      try {
        const { getCurrentWindow } = await getTauriModules();
        if (getCurrentWindow) {
          const win = getCurrentWindow();
          await win.minimize();
        }
      } catch (e) {
        console.error('[Tauri Bridge] Error al minimizar:', e);
      }
    },

    maximize: async () => {
      try {
        const { getCurrentWindow } = await getTauriModules();
        if (getCurrentWindow) {
          const win = getCurrentWindow();
          const isMax = await win.isMaximized();
          if (isMax) {
            await win.unmaximize();
          } else {
            await win.maximize();
          }
        }
      } catch (e) {
        console.error('[Tauri Bridge] Error al maximizar:', e);
      }
    },

    close: async () => {
      try {
        const { getCurrentWindow } = await getTauriModules();
        if (getCurrentWindow) {
          const win = getCurrentWindow();
          await win.close();
        }
      } catch (e) {
        console.error('[Tauri Bridge] Error al cerrar:', e);
      }
    },

    setTheme: (_theme: string) => {
      // En Tauri el tema se aplica directamente por CSS en el frontend
    },

    onExitRequested: (_callback: () => void) => {
      // Callback opcional si se requiere intercepción de salida
    },

    sendExitAction: async (action: string) => {
      try {
        const { getCurrentWindow } = await getTauriModules();
        if (action === 'minimize') {
          await getCurrentWindow().minimize();
        } else if (action === 'quit') {
          await getCurrentWindow().close();
        }
      } catch (e) {
        console.error(e);
      }
    }
  };
}
