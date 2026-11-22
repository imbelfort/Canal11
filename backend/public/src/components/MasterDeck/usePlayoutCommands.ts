import { useState, useRef, useEffect, useCallback } from 'react';
import { api } from '../../services/api';

export interface UsePlayoutCommandsParams {
  isPlaying: boolean;
  isPaused: boolean;
  isLive: boolean;
  loop?: boolean;
}

export interface UsePlayoutCommandsResult {
  isCommandInProgress: boolean;
  commandError: string | null;
  clearCommandError: () => void;
  handlePlayPause: () => Promise<void>;
  handleNext: () => Promise<void>;
  handleStop: () => Promise<void>;
  handleEmergency: () => Promise<void>;
  handleToggleLoop: () => Promise<void>;
}

export function usePlayoutCommands({
  isPlaying,
  isPaused,
  isLive,
  loop = false
}: UsePlayoutCommandsParams): UsePlayoutCommandsResult {
  const [isCommandInProgress, setIsCommandInProgress] = useState(false);
  const [commandError, setCommandError] = useState<string | null>(null);

  const commandLockRef = useRef<boolean>(false);
  const commandTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (commandTimeoutRef.current) {
        clearTimeout(commandTimeoutRef.current);
      }
    };
  }, []);

  const clearCommandError = useCallback(() => {
    setCommandError(null);
  }, []);

  // Cerrojo de comando: ~300ms antirrebote para permitir respuesta rápida de la interfaz
  const startCommand = useCallback((): boolean => {
    if (commandLockRef.current) return false;
    commandLockRef.current = true;
    setIsCommandInProgress(true);
    setCommandError(null);
    if (commandTimeoutRef.current) clearTimeout(commandTimeoutRef.current);
    commandTimeoutRef.current = setTimeout(() => {
      commandLockRef.current = false;
      setIsCommandInProgress(false);
    }, 400);
    return true;
  }, []);

  const finishCommand = useCallback(() => {
    if (commandTimeoutRef.current) clearTimeout(commandTimeoutRef.current);
    commandLockRef.current = false;
    setIsCommandInProgress(false);
  }, []);

  const handlePlayPause = useCallback(async () => {
    if (!startCommand()) return;
    try {
      if (isPlaying) {
        await api.pause();
      } else if (isPaused) {
        await api.resume();
      } else if (isLive) {
        await api.stop();
      } else {
        await api.play();
      }
    } catch (err: any) {
      const msg = err?.message || 'Error al ejecutar comando Reproducir/Pausa';
      setCommandError(msg);
      console.error(msg, err);
    } finally {
      finishCommand();
    }
  }, [isPlaying, isPaused, isLive, startCommand, finishCommand]);

  const handleNext = useCallback(async () => {
    if (!startCommand()) return;
    try {
      await api.next();
    } catch (err: any) {
      const msg = err?.message || 'Error al ejecutar comando Siguiente';
      setCommandError(msg);
      console.error(msg, err);
    } finally {
      finishCommand();
    }
  }, [startCommand, finishCommand]);

  const handleStop = useCallback(async () => {
    if (!startCommand()) return;
    try {
      await api.stop();
    } catch (err: any) {
      const msg = err?.message || 'Error al ejecutar comando Detener';
      setCommandError(msg);
      console.error(msg, err);
    } finally {
      finishCommand();
    }
  }, [startCommand, finishCommand]);

  // EMERGENCIA NUNCA BLOQUEADA: ignora cerrojos, se puede disparar concurrentemente sin antirrebote
  const handleEmergency = useCallback(async () => {
    try {
      await api.triggerEmergency('Conmutación inmediata de contingencia por operador');
    } catch (err: any) {
      const msg = err?.message || 'Error crítico al conmutar a contingencia';
      setCommandError(msg);
      console.error(msg, err);
    }
  }, []);

  const handleToggleLoop = useCallback(async () => {
    try {
      await api.setLoop(!loop);
    } catch (err: any) {
      const msg = err?.message || 'Error al cambiar modo bucle';
      setCommandError(msg);
      console.error(msg, err);
    }
  }, [loop]);

  return {
    isCommandInProgress,
    commandError,
    clearCommandError,
    handlePlayPause,
    handleNext,
    handleStop,
    handleEmergency,
    handleToggleLoop
  };
}

