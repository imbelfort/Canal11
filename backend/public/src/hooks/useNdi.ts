import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { NdiSource, NdiRuntimeStatus, NdiAudioConfig } from '../types/playout';

export interface UseNdiOptions {
  autoFetch?: boolean;
}

export function useNdi(options: UseNdiOptions = { autoFetch: true }) {
  const [ndiStatus, setNdiStatus] = useState<NdiRuntimeStatus | null>(null);
  const [ndiSources, setNdiSources] = useState<NdiSource[]>([]);
  const [selectedSource, setSelectedSource] = useState<NdiSource | null>(null);
  const [audioConfig, setAudioConfig] = useState<NdiAudioConfig>({
    enabled: true,
    normalize48k: true,
    mute: false
  });
  const [isScanning, setIsScanning] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [pingResults, setPingResults] = useState<{ [id: string]: { status: 'testing' | 'ok' | 'error'; msg: string; networkReachable?: boolean } }>({});
  const [previewKey, setPreviewKey] = useState<number>(Date.now());
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const refreshData = useCallback(async () => {
    const errors: string[] = [];

    const [sourcesRes, statusRes] = await Promise.allSettled([
      api.getNdiSources(),
      api.getNdiStatus()
    ]);

    if (sourcesRes.status === 'fulfilled') {
      const data = sourcesRes.value;
      setNdiSources(data.sources || []);
      const active = data.selected || (data.sources && data.sources.length > 0 ? data.sources[0] : null);
      setSelectedSource(active);
    } else {
      errors.push(`Fuentes NDI: ${sourcesRes.reason?.message || sourcesRes.reason}`);
    }

    if (statusRes.status === 'fulfilled') {
      setNdiStatus(statusRes.value);
    } else {
      setNdiStatus(null);
      errors.push(`Estado Runtime NDI: ${statusRes.reason?.message || statusRes.reason}`);
    }

    if (errors.length > 0) {
      setErrorMessage(`Advertencia al cargar NDI: ${errors.join(', ')}`);
    } else {
      setErrorMessage(null);
    }
  }, []);

  const scanSources = useCallback(async () => {
    setIsScanning(true);
    setErrorMessage(null);
    try {
      const [data, updatedStatus] = await Promise.all([
        api.scanNdiSources(),
        api.getNdiStatus().catch(() => null)
      ]);

      if (data) {
        setNdiSources(data.sources || []);
        const active = data.selected || (data.sources && data.sources.length > 0 ? data.sources[0] : null);
        setSelectedSource(active);
      }
      if (updatedStatus) {
        setNdiStatus(updatedStatus);
      }
      return data;
    } catch (err: any) {
      setErrorMessage(`Error al escanear fuentes NDI: ${err.message || err}`);
      return null;
    } finally {
      setIsScanning(false);
    }
  }, []);

  const selectSource = useCallback(async (id: string) => {
    try {
      const data = await api.selectNdiSource(id);
      setNdiSources(data.sources || []);
      setSelectedSource(data.selected || null);
      // Sincronizar estado del receptor tras seleccionar
      const updatedStatus = await api.getNdiStatus().catch(() => null);
      if (updatedStatus) setNdiStatus(updatedStatus);
      setPreviewKey(Date.now());
      return data;
    } catch (err: any) {
      setErrorMessage(`Error al seleccionar fuente NDI: ${err.message || err}`);
      return null;
    }
  }, []);

  const pingSource = useCallback(async (src: NdiSource) => {
    setPingResults(prev => ({ ...prev, [src.id]: { status: 'testing', msg: 'Probando socket de red...' } }));
    try {
      const res = await api.testNdiConnection(src.ip_address, src.port);
      if (res.reachable) {
        setPingResults(prev => ({
          ...prev,
          [src.id]: {
            status: 'ok',
            msg: `Puerto accesible (${res.latencyMs || 15}ms) [Sin confirmar stream de video]`,
            networkReachable: true
          }
        }));
      } else {
        setPingResults(prev => ({
          ...prev,
          [src.id]: {
            status: 'error',
            msg: res.error || 'Puerto no alcanzable',
            networkReachable: false
          }
        }));
      }
    } catch (err: any) {
      setPingResults(prev => ({
        ...prev,
        [src.id]: {
          status: 'error',
          msg: err.message || 'Error de socket de red',
          networkReachable: false
        }
      }));
    }
  }, []);

  const saveManualSource = useCallback(async (source: Partial<NdiSource>) => {
    try {
      const updated = await api.saveNdiSource(source);
      setNdiSources(updated);
      // Sincronizar selectedSource si coincide el id o si es la única fuente
      if (source.id && selectedSource?.id === source.id) {
        const found = updated.find(s => s.id === source.id);
        if (found) setSelectedSource(found);
      }
      setErrorMessage(null);
      return updated;
    } catch (err: any) {
      setErrorMessage(`Error al guardar fuente NDI: ${err.message || err}`);
      return null;
    }
  }, [selectedSource]);

  const deleteSource = useCallback(async (id: string) => {
    try {
      const updated = await api.deleteNdiSource(id);
      setNdiSources(updated);
      // Evitar que selectedSource quede apuntando a una fuente eliminada
      if (selectedSource?.id === id) {
        setSelectedSource(updated.length > 0 ? updated[0] : null);
      }
      setErrorMessage(null);
      return updated;
    } catch (err: any) {
      setErrorMessage(`Error al eliminar fuente NDI: ${err.message || err}`);
      return null;
    }
  }, [selectedSource]);

  const clearOfflineSources = useCallback(async () => {
    try {
      const res = await api.clearOfflineSources();
      setNdiSources(res.sources);
      // Verificar si la fuente seleccionada fue eliminada
      if (selectedSource && !res.sources.some(s => s.id === selectedSource.id)) {
        setSelectedSource(res.sources.length > 0 ? res.sources[0] : null);
      }
      setErrorMessage(null);
      return res;
    } catch (err: any) {
      setErrorMessage(`Error al limpiar fuentes desconectadas: ${err.message || err}`);
      return null;
    }
  }, [selectedSource]);

  const installRuntime = useCallback(async () => {
    setIsInstalling(true);
    try {
      await api.installNdiRuntime();
      const stat = await api.getNdiStatus();
      setNdiStatus(stat);
      setErrorMessage(null);
    } catch (err: any) {
      setErrorMessage(err.message || 'Error al ejecutar instalador NDI 6 Runtime');
    } finally {
      setIsInstalling(false);
    }
  }, []);

  const configureAudio = useCallback((cfg: Partial<NdiAudioConfig>) => {
    setAudioConfig(prev => ({ ...prev, ...cfg }));
  }, []);

  const refreshPreview = useCallback(() => {
    setPreviewKey(Date.now());
  }, []);

  useEffect(() => {
    if (options.autoFetch) {
      refreshData();
    }
  }, [options.autoFetch, refreshData]);

  // Estados discriminados rigurosos de recepción NDI
  const isNetworkReachable = Boolean(selectedSource && pingResults[selectedSource.id]?.networkReachable);
  const isReceiverConnected = Boolean(ndiStatus?.receiver?.connected);
  const isVideoReceiving = Boolean(ndiStatus?.receiver?.receivingVideo);
  const isAudioReceiving = Boolean(ndiStatus?.receiver?.receivingAudio);

  return {
    ndiStatus,
    ndiSources,
    selectedSource,
    audioConfig,
    configureAudio,
    isScanning,
    isInstalling,
    pingResults,
    previewKey,
    // Estados discriminados para UI y monitoreo profesional
    isNetworkReachable,
    isReceiverConnected,
    isVideoReceiving,
    isAudioReceiving,
    errorMessage,
    setErrorMessage,
    refreshData,
    scanSources,
    selectSource,
    pingSource,
    saveManualSource,
    deleteSource,
    clearOfflineSources,
    installRuntime,
    refreshPreview
  };
}

