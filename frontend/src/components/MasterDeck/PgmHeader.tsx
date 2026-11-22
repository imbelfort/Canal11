import React from 'react';
import {
  Radio,
  FileVideo,
  ShieldAlert,
  Square,
  Volume2,
  VolumeX,
  Sliders
} from 'lucide-react';

export interface PgmHeaderProps {
  sourceKind: 'LIVE_NDI' | 'LIVE_SDI' | 'FILE' | 'EMERGENCY' | 'BLACK' | 'IDLE';
  hasOnAirItem: boolean;
  itemCgEnabled: boolean;
  masterCgEnabled: boolean;
  cgConfirmed: boolean;
  onToggleItemCg: () => void;
  onToggleMasterCg: () => void;
  isOnAir: boolean;
  isPaused: boolean;
  isBlackFallback: boolean;
  isMuted: boolean;
  monitorVolume: number;
  onToggleMute: () => void;
  onMonitorVolumeChange: (v: number) => void;
  onOpenAudioModal: () => void;
  masterVolumeDb?: number;
  isAudioActive?: boolean;
}

export const PgmHeader: React.FC<PgmHeaderProps> = React.memo(({
  sourceKind,
  hasOnAirItem,
  itemCgEnabled,
  masterCgEnabled,
  cgConfirmed,
  onToggleItemCg,
  onToggleMasterCg,
  isOnAir,
  isPaused,
  isBlackFallback,
  isMuted,
  monitorVolume,
  onToggleMute,
  onMonitorVolumeChange,
  onOpenAudioModal,
  masterVolumeDb,
  isAudioActive
}) => {
  // Renderizado del badge de fuente optimizado sin JSX inestable
  const renderSourceBadge = () => {
    switch (sourceKind) {
      case 'LIVE_NDI':
        return (
          <span className="badge-status on-air" style={{ gap: 4, padding: '2px 6px', fontSize: 9.5, background: 'var(--apple-indigo, #5e5ce6)' }}>
            <Radio size={11} />
            <span>EN VIVO NDI</span>
          </span>
        );
      case 'LIVE_SDI':
        return (
          <span className="badge-status on-air" style={{ gap: 4, padding: '2px 6px', fontSize: 9.5, background: 'var(--apple-red)' }}>
            <Radio size={11} />
            <span>EN VIVO SDI</span>
          </span>
        );
      case 'FILE':
        return (
          <span className="badge-status played" style={{ gap: 4, padding: '2px 6px', fontSize: 9.5 }}>
            <FileVideo size={11} />
            <span>ARCHIVO</span>
          </span>
        );
      case 'EMERGENCY':
        return (
          <span className="badge-status error" style={{ gap: 4, padding: '2px 6px', fontSize: 9.5 }}>
            <ShieldAlert size={11} />
            <span>RESPALDO</span>
          </span>
        );
      case 'BLACK':
        return (
          <span className="badge-status error" style={{ gap: 4, padding: '2px 6px', fontSize: 9.5 }}>
            <Square size={11} />
            <span>CUADRO NEGRO</span>
          </span>
        );
      default:
        return (
          <span className="badge-status pending" style={{ gap: 4, padding: '2px 6px', fontSize: 9.5 }}>
            <span>EN ESPERA</span>
          </span>
        );
    }
  };

  return (
    <div className="card-header" style={{ padding: '6px 10px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span
          className="m3-monitor-tag pgm"
          style={{ fontWeight: 700, letterSpacing: '0.04em' }}
          title="Monitor Principal de Emisión al Aire (PGM / Salida Final a DeckLink SDI y Emisión con CG)"
        >
          SALIDA MASTER (PGM)
        </span>

        {renderSourceBadge()}

        {/* Separación estricta entre CG de Ítem y CG Maestro */}
        {hasOnAirItem ? (
          <button
            type="button"
            onClick={onToggleItemCg}
            style={{
              fontSize: 9,
              padding: '1px 6px',
              borderRadius: 'var(--radius-full)',
              fontWeight: 600,
              background: itemCgEnabled ? 'var(--color-success-subtle)' : 'var(--color-field)',
              color: itemCgEnabled ? 'var(--color-success)' : 'var(--color-text-muted)',
              border: itemCgEnabled ? '1px solid rgba(52, 199, 89, 0.4)' : '1px solid var(--color-border-subtle)',
              cursor: 'pointer'
            }}
            title={
              !cgConfirmed
                ? 'CG del ítem actual (estado en motor aún no confirmado)'
                : (itemCgEnabled ? 'Gráficos del clip activo: ENCENDIDOS' : 'Gráficos del clip activo: APAGADOS')
            }
          >
            {itemCgEnabled ? (cgConfirmed ? 'CG ÍTEM: ON' : 'CG ÍTEM: ON*') : 'CG ÍTEM: OFF'}
          </button>
        ) : (
          <button
            type="button"
            onClick={onToggleMasterCg}
            style={{
              fontSize: 9,
              padding: '1px 6px',
              borderRadius: 'var(--radius-full)',
              fontWeight: 600,
              background: masterCgEnabled ? 'var(--color-success-subtle)' : 'var(--color-field)',
              color: masterCgEnabled ? 'var(--color-success)' : 'var(--color-text-muted)',
              border: masterCgEnabled ? '1px solid rgba(52, 199, 89, 0.4)' : '1px solid var(--color-border-subtle)',
              cursor: 'pointer'
            }}
            title={masterCgEnabled ? 'Paquete gráfico maestro activo' : 'Paquete gráfico maestro inactivo'}
          >
            {masterCgEnabled ? 'CG MAESTRO: ON' : 'CG MAESTRO: OFF'}
          </button>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {/* Tally ON AIR o PAUSA */}
        {isOnAir && (
          <span
            className="tally-on-air-pill"
            style={{
              padding: '2px 7px',
              fontSize: 9.5,
              background: isPaused ? 'rgba(255, 159, 10, 0.2)' : (isBlackFallback ? 'rgba(239, 68, 68, 0.2)' : undefined),
              border: isPaused ? '1px solid var(--apple-orange)' : (isBlackFallback ? '1px solid var(--color-danger)' : undefined),
              color: isPaused ? 'var(--apple-orange)' : (isBlackFallback ? 'var(--color-danger)' : undefined)
            }}
          >
            <span
              className={`tally-dot ${!isPaused ? 'blinking' : ''}`}
              style={{
                width: 5,
                height: 5,
                background: isPaused ? 'var(--apple-orange)' : (isBlackFallback ? 'var(--color-danger)' : undefined)
              }}
            />
            {isPaused ? 'PAUSA' : (isBlackFallback ? 'NEGRO SDI' : 'ON AIR')}
          </span>
        )}

        {/* Monitor PC: Botón Mute + Slider Mini (monitoreo local sin alterar PGM) */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          background: 'rgba(255, 255, 255, 0.04)',
          padding: '2px 6px',
          borderRadius: 4,
          border: '1px solid var(--border-subtle)'
        }}>
          <button
            type="button"
            className="ide-icon-btn"
            onClick={onToggleMute}
            title={isMuted ? 'Activar audio monitor PC (parlantes)' : 'Silenciar audio monitor PC'}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 0 }}
          >
            {isMuted ? <VolumeX size={12} color="var(--apple-red)" /> : <Volume2 size={12} color="var(--apple-green)" />}
          </button>
          <input
            type="range"
            min="0"
            max="100"
            step="1"
            value={isMuted ? 0 : Math.round(monitorVolume * 100)}
            onChange={(e) => onMonitorVolumeChange(Number(e.target.value) / 100)}
            style={{ width: 42, height: 4, cursor: 'pointer', accentColor: 'var(--color-primary)' }}
            title={`Monitor PC: ${isMuted ? 0 : Math.round(monitorVolume * 100)}%`}
          />
        </div>

        {/* PGM Salida dB Badge con estado veraz */}
        <button
          type="button"
          className="ide-icon-btn"
          onClick={onOpenAudioModal}
          title={isAudioActive ? 'Procesamiento de audio DeckLink activo' : 'Ajustes de audio master (no aplicado al SDI)'}
          style={{
            background: isAudioActive ? 'rgba(52, 199, 89, 0.12)' : 'rgba(59, 130, 246, 0.1)',
            border: isAudioActive ? '1px solid rgba(52, 199, 89, 0.4)' : '1px solid rgba(59, 130, 246, 0.35)',
            color: isAudioActive ? 'var(--color-success)' : 'var(--color-primary)',
            borderRadius: 4,
            cursor: 'pointer',
            padding: '2px 6px',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            fontSize: 10,
            fontWeight: 600
          }}
        >
          <Sliders size={11} />
          <span>
            PGM {masterVolumeDb !== undefined ? (masterVolumeDb > 0 ? `+${masterVolumeDb}` : `${masterVolumeDb}`) : '0.0'} dB {isAudioActive ? '' : '(no aplicado)'}
          </span>
        </button>
      </div>
    </div>
  );
});

PgmHeader.displayName = 'PgmHeader';

