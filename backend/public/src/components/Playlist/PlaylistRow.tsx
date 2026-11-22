import React from 'react';
import { PlaylistItem } from '../../types/playout';
import { GripVertical, Scissors, Sparkles, EyeOff, AlertTriangle, Check } from 'lucide-react';

interface PlaylistRowProps {
  item: PlaylistItem;
  index: number;
  isSelected: boolean;
  isOnAir: boolean;
  isPlayed?: boolean;
  activeProfile?: string;
  startTimeStr: string;
  endTimeStr?: string;
  onSelect: (e: React.MouseEvent, index: number) => void;
  onContextMenu: (e: React.MouseEvent, item: PlaylistItem, index: number) => void;
  onDoubleClick?: (item: PlaylistItem) => void;
  onDragStart: (e: React.DragEvent, index: number) => void;
  onDragOver: (e: React.DragEvent, index: number) => void;
  onDropRow: (e: React.DragEvent, index: number) => void;
  onToggleGraphics?: (itemId: number, nextVal: boolean) => void;
}

const formatDuration = (ms: number) => {
  if (!ms || ms <= 0) return '--:--:--';
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
};

export const PlaylistRow: React.FC<PlaylistRowProps> = React.memo(({
  item,
  index,
  isSelected,
  isOnAir,
  isPlayed = false,
  activeProfile = '1080i59.94',
  startTimeStr,
  onSelect,
  onContextMenu,
  onDoubleClick,
  onDragStart,
  onDragOver,
  onDropRow,
  onToggleGraphics,
}) => {
  const isMissing = item.file_exists === false || item.status === 'FILE_CORRUPT_OR_MISSING' || item.status === 'ERROR';
  const isCommercial = item.event_type === 'COMMERCIAL';
  const hasTrim = Boolean((item.in_point_ms && item.in_point_ms > 0) || (item.out_point_ms && item.out_point_ms > 0));

  // Duración efectiva (Trim IN/OUT manda si está definido)
  const effectiveDurationMs = (item.out_point_ms && item.out_point_ms > (item.in_point_ms || 0))
    ? (item.out_point_ms - (item.in_point_ms || 0))
    : (item.duration_ms || 0);

  // Normalización estricta: sólo false/0/null/undefined es inactivo, cualquier valor truthy es activo
  const cgOn = Boolean(item.cg_enabled ?? item.show_graphics);

  // Estados visuales gobernados directamente por status de Rust y la bandera isOnAir
  const isEmitted = !isOnAir && (isPlayed || item.status === 'PLAYED' || item.status === 'PLAYED_SUCCESS');
  const isInterrupted = !isOnAir && item.status === 'INTERRUPTED';
  const isSkipped = !isOnAir && item.status === 'SKIPPED';

  const renderStatus = () => {
    if (isOnAir) {
      return (
        <span
          className="badge-status"
          style={{
            fontSize: 9,
            padding: '2px 8px',
            background: 'rgba(0, 122, 255, 0.22)',
            color: 'var(--apple-blue, #0a84ff)',
            border: '1px solid rgba(10, 132, 255, 0.55)',
            fontWeight: 700,
            letterSpacing: '0.4px',
            borderRadius: 4
          }}
        >
          ON AIR
        </span>
      );
    }
    if (isMissing) {
      return (
        <span
          className="badge-status missing"
          style={{
            fontSize: 9,
            padding: '2px 7px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 3,
            color: 'var(--color-danger, #ef4444)',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            background: 'rgba(239, 68, 68, 0.12)'
          }}
          title="Archivo no disponible en disco"
        >
          <AlertTriangle size={10} color="var(--color-danger, #ef4444)" />
          <span>FALTA</span>
        </span>
      );
    }
    if (isEmitted) {
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            color: 'var(--color-text-muted)',
            fontSize: 9.5
          }}
          title="Elemento ya emitido"
        >
          <Check size={11} strokeWidth={2.5} color="var(--color-success, #30d158)" />
          <span>Emitido</span>
        </span>
      );
    }
    if (isInterrupted) {
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            color: 'var(--apple-orange, #ff9500)',
            fontSize: 9.5
          }}
          title="Emisión interrumpida por el operador"
        >
          <span>Cortado</span>
        </span>
      );
    }
    if (isSkipped) {
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            color: 'var(--color-text-muted)',
            fontSize: 9.5
          }}
          title="Elemento saltado manualmente"
        >
          <span>Saltado</span>
        </span>
      );
    }
    return null;
  };

  // Formato técnico dinámico según norma activa de Rust
  const getFormatLabel = () => {
    if (item.event_type === 'LIVE_SDI') {
      return `SDI ${activeProfile}`;
    }
    if (item.event_type === 'LIVE_NDI') {
      return 'NDI IP';
    }
    const pathStr = item.file_path || '';
    const lastDot = pathStr.lastIndexOf('.');
    const ext = lastDot !== -1 ? pathStr.slice(lastDot + 1).toUpperCase() : 'VIDEO';
    return ext || 'VIDEO';
  };

  return (
    <tr
      id={`deck-playlist-row-${index}`}
      className={`${isOnAir ? 'row-on-air' : ''} ${isMissing ? 'row-missing' : ''} ${isCommercial ? 'row-commercial' : ''} ${isEmitted ? 'row-played' : ''} ${isSelected ? 'row-selected' : ''}`.trim()}
      style={{
        cursor: 'pointer',
        height: 31,
        maxHeight: 31
      }}
      onClick={(e) => onSelect(e, index)}
      onDoubleClick={() => onDoubleClick?.(item)}
      onContextMenu={(e) => onContextMenu(e, item, index)}
    >
      {/* 1. Posición y Grip de Reordenamiento exclusivo */}
      <td
        style={{
          width: 58,
          minWidth: 58,
          maxWidth: 60,
          padding: '3px 4px',
          textAlign: 'center',
          whiteSpace: 'nowrap',
          userSelect: 'none'
        }}
      >
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 4,
            fontFamily: 'var(--font-family-mono)',
            fontSize: 11,
            color: 'var(--color-text-muted)'
          }}
        >
          <span
            draggable
            onDragStart={(e) => onDragStart(e, index)}
            onDragOver={(e) => onDragOver(e, index)}
            onDrop={(e) => onDropRow(e, index)}
            style={{ display: 'inline-flex', alignItems: 'center', cursor: 'grab' }}
          >
            <GripVertical
              size={12}
              className="row-grip-handle"
              style={{
                opacity: 0.4,
                flexShrink: 0
              }}
            />
          </span>
          <span
            style={{
              display: 'inline-block',
              textAlign: 'right',
              minWidth: 26,
              fontWeight: 500
            }}
          >
            {index + 1}
          </span>
        </div>
      </td>

      {/* 2. Inicio proyectado (BOT) */}
      <td style={{ fontFamily: 'var(--font-family-mono)', fontWeight: 500, color: 'var(--color-cyan)', fontSize: 11.5, width: 80, minWidth: 80, whiteSpace: 'nowrap' }}>
        {startTimeStr}
      </td>

      {/* 3. Estado de emisión */}
      <td style={{ width: 80, minWidth: 80, whiteSpace: 'nowrap' }}>
        {renderStatus()}
      </td>

      {/* 4. Gráficos / CG (Decisión del operador) */}
      <td style={{ textAlign: 'center', width: 38, minWidth: 38 }}>
        <button
          className="ide-icon-btn"
          style={{
            padding: '1px 3px',
            opacity: cgOn ? 1 : 0.45,
            pointerEvents: 'auto'
          }}
          onClick={(e) => {
            e.stopPropagation();
            onToggleGraphics?.(item.id, !cgOn);
          }}
          title={
            cgOn
              ? 'Gráficos activos (Mosca / Reloj). Clic para apagar.'
              : 'Gráficos apagados en este elemento. Clic para activar.'
          }
        >
          {cgOn ? (
            <Sparkles size={11} color="var(--color-accent, #30d158)" />
          ) : (
            <EyeOff size={11} color="var(--color-text-muted)" />
          )}
        </button>
      </td>

      {/* 5. Duración efectiva */}
      <td style={{ fontFamily: 'var(--font-family-mono)', fontWeight: 500, color: 'var(--color-ink)', fontSize: 11.5, width: 95, minWidth: 95, whiteSpace: 'nowrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span>{formatDuration(effectiveDurationMs)}</span>
          {hasTrim && (
            <span
              title="Este video tiene recorte IN / OUT activo"
              style={{
                fontSize: 8.5,
                color: 'var(--color-cyan)',
                backgroundColor: 'rgba(0, 210, 255, 0.12)',
                padding: '0 4px',
                borderRadius: 3,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 2
              }}
            >
              <Scissors size={9} />
              TRIM
            </span>
          )}

          {item.audio_source && item.audio_source !== 'EMBEDDED' && (
            <span
              style={{
                fontSize: 8.5,
                fontWeight: 600,
                fontFamily: 'var(--font-family-mono)',
                color: 'var(--color-primary)',
                backgroundColor: 'rgba(10, 132, 255, 0.12)',
                padding: '0 4px',
                borderRadius: 3,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 2
              }}
              title={`Audio NDI asociado: ${item.audio_source}`}
            >
              {item.audio_source}
            </span>
          )}
        </div>
      </td>

      {/* 6. Archivo y Ubicación en disco (Altura fija 31px sin expandirse) */}
      <td style={{ verticalAlign: 'middle' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0, padding: 0 }}>
          <span
            className={`title-text ${isCommercial && !isEmitted ? 'commercial-title' : ''}`}
            title={item.title}
            style={{
              fontWeight: isCommercial && !isEmitted ? 600 : 500,
              color: isEmitted ? 'var(--color-text-muted)' : isCommercial ? undefined : 'var(--color-ink)',
              fontSize: 11.5,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxWidth: '60%'
            }}
          >
            {item.title}
          </span>

          <span
            title={item.file_path || ''}
            style={{
              fontSize: 10,
              color: isMissing ? 'var(--color-danger, #ef4444)' : 'var(--color-text-muted)',
              fontFamily: 'var(--font-family-mono)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              opacity: 0.8,
              maxWidth: '30%'
            }}
          >
            {item.file_path || ''}
          </span>

          {/* Micro-etiqueta técnica dinámica */}
          <span
            style={{
              fontSize: 9,
              fontFamily: 'var(--font-family-mono)',
              padding: '0 4px',
              borderRadius: 2,
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid var(--color-hairline)',
              color: 'var(--color-text-muted)',
              whiteSpace: 'nowrap',
              flexShrink: 0
            }}
            title={item.event_type === 'LIVE_SDI' ? 'Señal física SDI Blackmagic' : item.event_type === 'LIVE_NDI' ? 'Flujo de Red IP LAN' : 'Formato de emisión estándar'}
          >
            {getFormatLabel()}
          </span>

          {/* Etiqueta de sonoridad EBU R128 para archivos locales */}
          {item.event_type !== 'LIVE_SDI' && item.event_type !== 'LIVE_NDI' && (
            item.loudness_status === 'OK' && typeof item.loudness_lufs === 'number' ? (
              <span
                style={{
                  fontSize: 8.5,
                  fontFamily: 'var(--font-family-mono)',
                  padding: '1px 4px',
                  borderRadius: 3,
                  background: 'rgba(52, 199, 89, 0.1)',
                  border: '1px solid rgba(52, 199, 89, 0.3)',
                  color: 'var(--color-success, #34c759)',
                  whiteSpace: 'nowrap',
                  flexShrink: 0
                }}
                title={`Sonoridad integrada medida: ${item.loudness_lufs.toFixed(1)} LUFS (True Peak: ${item.true_peak_db?.toFixed(1) ?? '--'} dBTP)`}
              >
                {item.loudness_lufs.toFixed(1)} LUFS
              </span>
            ) : item.loudness_status === 'NO_AUDIO' ? (
              <span
                style={{
                  fontSize: 8.5,
                  fontFamily: 'var(--font-family-mono)',
                  padding: '1px 4px',
                  borderRadius: 3,
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid var(--color-hairline)',
                  color: 'var(--color-text-muted)',
                  whiteSpace: 'nowrap',
                  flexShrink: 0
                }}
                title="Este archivo no contiene pista de audio (Mudo)"
              >
                Mudo
              </span>
            ) : (
              <span
                style={{
                  fontSize: 8.5,
                  fontFamily: 'var(--font-family-mono)',
                  padding: '1px 4px',
                  borderRadius: 3,
                  background: 'rgba(255, 159, 10, 0.1)',
                  border: '1px solid rgba(255, 159, 10, 0.3)',
                  color: 'var(--color-warning, #ff9f0a)',
                  whiteSpace: 'nowrap',
                  flexShrink: 0
                }}
                title="Sonoridad pendiente de medición. Se aplicará ganancia neutral (0 dB) por seguridad."
              >
                Sin medir
              </span>
            )
          )}

          {isCommercial && (
            <span
              className="badge-commercial"
              title="Corte Comercial / Publicidad"
            >
              COMERCIAL
            </span>
          )}

          {isMissing && (
            <span
              style={{
                fontSize: 9,
                fontWeight: 600,
                color: 'var(--color-danger, #ef4444)',
                backgroundColor: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.4)',
                padding: '0 5px',
                borderRadius: 2,
                whiteSpace: 'nowrap',
                flexShrink: 0
              }}
              title="Archivo no encontrado en disco (Use menú contextual para reemplazar o eliminar)"
            >
              NO ENCONTRADO
            </span>
          )}
        </div>
      </td>
    </tr>
  );
});
