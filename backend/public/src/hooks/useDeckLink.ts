import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../services/api';
import {
  DeckLinkStatus,
  DeckLinkScanResult,
  HardwareInput,
  HardwareOutput,
  SdiTestResult,
  MasterOutputConfig
} from '../types/playout';

export interface UseDeckLinkOptions {
  autoFetch?: boolean;
}

export function useDeckLink(options: UseDeckLinkOptions = { autoFetch: true }) {
  const [status, setStatus] = useState<DeckLinkStatus | null>(null);
  const [scanResult, setScanResult] = useState<DeckLinkScanResult | null>(null);
  const [inputs, setInputs] = useState<HardwareInput[]>([]);
  const [outputs, setOutputs] = useState<HardwareOutput[]>([]);
  const [outputConfig, setOutputConfig] = useState<MasterOutputConfig>({
    outputType: 'DECKLINK',
    blackmagicDevice: '',
    ndiStreamName: 'IB-CAST-MASTER',
    sdiFormat: '',
    sdiConnector: 'SDI Out 1',
    keyingMode: 'DISABLED',
    keyerBlendLevel: 255,
    inputLine: 'NONE'
  });
  const [capabilities, setCapabilities] = useState<string[]>([]);
  const [isApplying, setIsApplying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testNotice, setTestNotice] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Referencia para cancelar temporizador de prueba SDI al desmontar
  const testTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (testTimerRef.current) {
        clearTimeout(testTimerRef.current);
        testTimerRef.current = null;
      }
    };
  }, []);

  const refreshData = useCallback(async () => {
    setIsLoading(true);
    const errors: string[] = [];

    // Consultas resilientes e independientes
    const [insRes, outsRes, statRes, scanRes, outCfgRes, capsRes] = await Promise.allSettled([
      api.getHardwareInputs(),
      api.getHardwareOutputs(),
      api.getDeckLinkStatus(),
      api.getDeckLinkScan(),
      api.getMasterOutputConfig(),
      api.getDeckLinkCapabilities()
    ]);

    if (insRes.status === 'fulfilled') {
      setInputs(insRes.value);
    } else {
      errors.push(`Entradas: ${insRes.reason?.message || insRes.reason}`);
    }

    if (outsRes.status === 'fulfilled') {
      setOutputs(outsRes.value);
    } else {
      errors.push(`Salidas: ${outsRes.reason?.message || outsRes.reason}`);
    }

    if (statRes.status === 'fulfilled') {
      setStatus(statRes.value);
    } else {
      // Si el estado falla, marcarlo como null en vez de conservar datos obsoletos
      setStatus(null);
    }

    if (scanRes.status === 'fulfilled') {
      setScanResult(scanRes.value);
    } else {
      // Si la consulta de escaneo falló, no conservar un escaneo obsoleto como reciente
      setScanResult(null);
      errors.push(`Escaneo de tarjetas: ${scanRes.reason?.message || scanRes.reason}`);
    }

    if (outCfgRes.status === 'fulfilled') {
      setOutputConfig(outCfgRes.value);
    }

    if (capsRes.status === 'fulfilled' && capsRes.value?.availableStandards) {
      setCapabilities(capsRes.value.availableStandards);
    } else if (statRes.status === 'fulfilled' && statRes.value?.availableStandards) {
      setCapabilities(statRes.value.availableStandards);
    } else {
      // Si no hay capacidades del backend, no conservar lista antigua inconsistente
      setCapabilities([]);
    }

    if (errors.length > 0) {
      setErrorMessage(`Advertencia al cargar hardware: ${errors.join(', ')}`);
    } else {
      setErrorMessage(null);
    }

    setIsLoading(false);
  }, []);

  const applyAndRestart = useCallback(async (format: string) => {
    setIsApplying(true);
    try {
      const res = await api.applyAndRestartOutput(format);
      if (res.decklink) setStatus(res.decklink);
      setOutputConfig(prev => ({ ...prev, sdiFormat: format }));
      setErrorMessage(null);
      return res;
    } catch (err: any) {
      setErrorMessage(`Error al aplicar norma en tarjeta: ${err.message || err}`);
      throw err;
    } finally {
      setIsApplying(false);
    }
  }, []);

  const saveOutputConfig = useCallback(async (cfg: Partial<MasterOutputConfig>) => {
    try {
      await api.saveMasterOutputConfig(cfg);
      setOutputConfig(prev => ({ ...prev, ...cfg }));
      setErrorMessage(null);
      return true;
    } catch (err: any) {
      setErrorMessage(`Error al guardar configuración de salida: ${err.message || err}`);
      return false;
    }
  }, []);

  const scanHardware = useCallback(async () => {
    setIsScanning(true);
    try {
      const scan = await api.scanDeckLinkHardware();
      setScanResult(scan);
      // Sincronizar estado si el escaneo devuelve estado operativo
      if (scan) {
        const updatedStatus = await api.getDeckLinkStatus().catch(() => null);
        if (updatedStatus) setStatus(updatedStatus);
      }
      setErrorMessage(null);
      return scan;
    } catch (err: any) {
      setErrorMessage(`Error al escanear hardware DeckLink: ${err.message || err}`);
      return null;
    } finally {
      setIsScanning(false);
    }
  }, []);

  const testOutput = useCallback(async (outputId?: string) => {
    setIsTesting(true);
    try {
      const res: SdiTestResult = await api.testSdiOutput(outputId);
      setTestNotice(res.message);
      if (testTimerRef.current) clearTimeout(testTimerRef.current);
      testTimerRef.current = setTimeout(() => {
        setTestNotice(null);
        testTimerRef.current = null;
      }, 5000);
      setErrorMessage(null);
      return res;
    } catch (err: any) {
      setErrorMessage(`Error en prueba SDI: ${err.message || err}`);
      return null;
    } finally {
      setIsTesting(false);
    }
  }, []);

  const addOutput = useCallback(async (output: Partial<HardwareOutput>) => {
    try {
      const updated = await api.saveHardwareOutput(output);
      setOutputs(updated);
      setErrorMessage(null);
      return updated;
    } catch (err: any) {
      setErrorMessage(`Error al guardar salida SDI: ${err.message || err}`);
      return null;
    }
  }, []);

  const deleteOutput = useCallback(async (id: string) => {
    try {
      const updated = await api.deleteHardwareOutput(id);
      setOutputs(updated);
      setErrorMessage(null);
      return updated;
    } catch (err: any) {
      setErrorMessage(`Error al eliminar salida SDI: ${err.message || err}`);
      return null;
    }
  }, []);

  const addInput = useCallback(async (input: Partial<HardwareInput>) => {
    try {
      const updated = await api.saveHardwareInput(input);
      setInputs(updated);
      setErrorMessage(null);
      return updated;
    } catch (err: any) {
      setErrorMessage(`Error al guardar entrada SDI: ${err.message || err}`);
      return null;
    }
  }, []);

  const deleteInput = useCallback(async (id: string) => {
    try {
      const updated = await api.deleteHardwareInput(id);
      setInputs(updated);
      setErrorMessage(null);
      return updated;
    } catch (err: any) {
      setErrorMessage(`Error al eliminar entrada SDI: ${err.message || err}`);
      return null;
    }
  }, []);

  const setDefaultInput = useCallback(async (id: string) => {
    try {
      const updated = await api.setDefaultHardwareInput(id);
      setInputs(updated);
      setErrorMessage(null);
      return updated;
    } catch (err: any) {
      setErrorMessage(`Error al establecer entrada predeterminada: ${err.message || err}`);
      return null;
    }
  }, []);

  const relinkInput = useCallback(async (id: string, deviceIdentifier: string) => {
    try {
      const updated = await api.relinkHardwareInput(id, deviceIdentifier);
      setInputs(updated);
      setErrorMessage(null);
      return updated;
    } catch (err: any) {
      setErrorMessage(`Error al re-vincular entrada SDI: ${err.message || err}`);
      return null;
    }
  }, []);

  const cleanDisconnectedInputs = useCallback(async (connectedDevices: string[]) => {
    try {
      const updated = await api.cleanDisconnectedInputs(connectedDevices);
      setInputs(updated);
      setErrorMessage(null);
      return updated;
    } catch (err: any) {
      setErrorMessage(`Error al limpiar entradas desconectadas: ${err.message || err}`);
      return null;
    }
  }, []);

  const relinkOutput = useCallback(async (id: string, deviceIdentifier: string) => {
    try {
      const updated = await api.relinkHardwareOutput(id, deviceIdentifier);
      setOutputs(updated);
      setErrorMessage(null);
      return updated;
    } catch (err: any) {
      setErrorMessage(`Error al re-vincular salida SDI: ${err.message || err}`);
      return null;
    }
  }, []);

  const cleanDisconnectedOutputs = useCallback(async (connectedDevices: string[]) => {
    try {
      const updated = await api.cleanDisconnectedOutputs(connectedDevices);
      setOutputs(updated);
      setErrorMessage(null);
      return updated;
    } catch (err: any) {
      setErrorMessage(`Error al limpiar salidas desconectadas: ${err.message || err}`);
      return null;
    }
  }, []);

  useEffect(() => {
    if (options.autoFetch) {
      refreshData();
    }
  }, [options.autoFetch, refreshData]);

  return {
    status,
    scanResult,
    outputConfig,
    // Filtrado robusto por tipo de entrada explícito o discriminador
    inputs: inputs.filter(i => {
      if (i.type) return i.type === 'SDI';
      const conn = (i.connector || '').toUpperCase();
      const id = (i.id || '').toUpperCase();
      return !conn.includes('NDI') && !id.startsWith('NDI');
    }),
    rawInputs: inputs,
    outputs,
    isLoading,
    isScanning,
    isTesting,
    isApplying,
    capabilities,
    applyAndRestart,
    testNotice,
    errorMessage,
    setErrorMessage,
    refreshData,
    saveOutputConfig,
    scanHardware,
    testOutput,
    addOutput,
    deleteOutput,
    addInput,
    deleteInput,
    setDefaultInput,
    relinkInput,
    cleanDisconnectedInputs,
    relinkOutput,
    cleanDisconnectedOutputs
  };
}
