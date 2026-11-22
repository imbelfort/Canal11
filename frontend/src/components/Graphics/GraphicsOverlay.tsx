import React, { useState, useEffect } from 'react';
import { GraphicsState } from '../../types/graphics';
import { Sun, Cloud, CloudSun, CloudRain, CloudLightning, CloudDrizzle, CloudSnow, CloudFog } from 'lucide-react';

interface GraphicsOverlayProps {
  graphics?: GraphicsState | null;
  stationTimecode?: string;
  isPaused?: boolean;
}

export const GraphicsOverlay: React.FC<GraphicsOverlayProps> = ({
  graphics,
  stationTimecode,
  isPaused = false
}) => {
  const [localClock, setLocalClock] = useState<string>('00:00:00');
  const [sequenceFrameIndex, setSequenceFrameIndex] = useState<number>(0);

  // Reloj en tiempo real sincronizado
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      // Hora Oficial de Bolivia (BOT, UTC-4)
      const botTime = new Date(now.getTime() - (4 * 3600 * 1000));
      const pad = (n: number) => String(n).padStart(2, '0');
      const timeStr = `${pad(botTime.getUTCHours())}:${pad(botTime.getUTCMinutes())}:${pad(botTime.getUTCSeconds())}`;
      setLocalClock(timeStr);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Animación de secuencia de imágenes PNG con adaptación automática de cadencia
  // Distingue entre FPS de la animación y FPS de salida (1080i59.94), preservando la velocidad real
  useEffect(() => {
    if (!graphics?.layers?.logo?.enabled || graphics.layers.logo.type !== 'PNG_SEQUENCE') return;
    const framesCount = graphics.layers.logo.sequenceFramesCount || 30;
    if (framesCount <= 1) return;

    // Si sequenceFps no está fijado o es 0, auto-detectar: 25 fps base o cadencia master
    const animFps = Number(graphics.layers.logo.sequenceFps) > 0 ? Number(graphics.layers.logo.sequenceFps) : 25;
    const startWallTime = performance.now();

    let animationFrameId: number;

    const tickAnimation = () => {
      if (!isPaused) {
        const elapsedSec = (performance.now() - startWallTime) / 1000;
        // Cálculo independiente: avance de fotogramas según velocidad de animación real en reloj de pared
        const currentFrame = Math.floor(elapsedSec * animFps) % framesCount;
        setSequenceFrameIndex(currentFrame);
      }
      animationFrameId = requestAnimationFrame(tickAnimation);
    };

    animationFrameId = requestAnimationFrame(tickAnimation);
    return () => cancelAnimationFrame(animationFrameId);
  }, [graphics?.layers?.logo?.type, graphics?.layers?.logo?.sequenceFramesCount, graphics?.layers?.logo?.sequenceFps, isPaused]);

  if (!graphics) return null;

  const { masterEnabled, effectiveVisible, isCommercial, suppressReason, layers } = graphics;
  const { logo, clock, weather, ticker } = layers;

  // Verdad de emisión: Si Rust reporta telemetría nativa, utilizarla como autoridad estricta
  const nativeTelemetry = (graphics as any)?.nativeTelemetry;
  const isSdiVisible = nativeTelemetry ? Boolean(nativeTelemetry.visible) : (effectiveVisible && masterEnabled);

  // Si los gráficos están suprimidos (por ejemplo, en un corte comercial o deshabilitados por el operador)
  if (!isSdiVisible) {
    if (isCommercial) {
      return (
        <div
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            zIndex: 15,
            pointerEvents: 'none',
            background: 'rgba(0, 0, 0, 0.65)',
            border: '1px solid rgba(255, 159, 10, 0.4)',
            borderRadius: 12,
            padding: '2px 8px',
            fontSize: 9,
            fontWeight: 500,
            color: 'var(--apple-orange, #ff9f0a)',
            letterSpacing: '0.4px',
            display: 'flex',
            alignItems: 'center',
            gap: 4
          }}
        >
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--apple-orange, #ff9f0a)' }} />
          <span>CG SUPRIMIDO • CORTE COMERCIAL</span>
        </div>
      );
    }
    return null;
  }

  // Icono dinámico según condición climática
  const renderWeatherIcon = (iconName: string) => {
    switch (iconName) {
      case 'cloud-sun':
        return <CloudSun size={12} color="#ffd60a" />;
      case 'cloud':
        return <Cloud size={12} color="#e5e5ea" />;
      case 'cloud-rain':
        return <CloudRain size={12} color="#64d2ff" />;
      case 'cloud-drizzle':
        return <CloudDrizzle size={12} color="#64d2ff" />;
      case 'cloud-lightning':
        return <CloudLightning size={12} color="#ff9f0a" />;
      case 'cloud-snow':
        return <CloudSnow size={12} color="#ffffff" />;
      case 'cloud-fog':
        return <CloudFog size={12} color="#aeaeb2" />;
      case 'sun':
      default:
        return <Sun size={12} color="#ffd60a" />;
    }
  };

  // Posición calculada para el Logo
  const logoStyle: React.CSSProperties = {
    position: 'absolute',
    zIndex: 10,
    pointerEvents: 'none',
    opacity: (logo.opacity || 85) / 100,
    transform: `scale(${(logo.scale || 75) / 100})`,
    transformOrigin: logo.position === 'TOP_LEFT' ? 'top left' : 'top right'
  };

  if (logo.position === 'TOP_LEFT') {
    logoStyle.top = `${logo.y || 6}%`;
    logoStyle.left = `${logo.x || 6}%`;
  } else if (logo.position === 'BOTTOM_LEFT') {
    logoStyle.bottom = `${logo.y || 6}%`;
    logoStyle.left = `${logo.x || 6}%`;
  } else if (logo.position === 'BOTTOM_RIGHT') {
    logoStyle.bottom = `${logo.y || 6}%`;
    logoStyle.right = `${100 - (logo.x || 88)}%`;
  } else {
    // TOP_RIGHT (estándar de televisión)
    logoStyle.top = `${logo.y || 6}%`;
    logoStyle.right = `${100 - (logo.x || 88)}%`;
  }

  // Formato del reloj
  const displayClock = clock.format === 'HH:MM' ? localClock.slice(0, 5) : localClock;

  return (
    <div
      className="graphics-overlay-layer"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 12,
        overflow: 'hidden'
      }}
    >
      {/* 1. Capa de Logo Mosca de Canal (PNG estático o Secuencia Animada) */}
      {logo.enabled && (
        <div style={logoStyle}>
          {logo.type === 'PNG_SEQUENCE' ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.85))'
              }}
            >
              <div
                style={{
                  background: 'linear-gradient(135deg, rgba(0, 102, 255, 0.9), rgba(0, 51, 153, 0.9))',
                  color: '#ffffff',
                  fontWeight: 800,
                  fontSize: 16,
                  letterSpacing: '1px',
                  padding: '4px 14px',
                  borderRadius: 6,
                  border: '1.5px solid rgba(255, 255, 255, 0.6)',
                  boxShadow: '0 0 10px rgba(0, 102, 255, 0.5)'
                }}
              >
                IB-CAST <span style={{ color: '#ffd60a', fontSize: 13 }}>HD</span>
              </div>
              <span style={{ fontSize: 8, color: '#ffffff', textShadow: '0 1px 2px #000', marginTop: 2, fontWeight: 600 }}>
                CANAL DIGITAL • F{sequenceFrameIndex + 1}
              </span>
            </div>
          ) : (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.85))'
              }}
            >
              <div
                style={{
                  background: 'linear-gradient(135deg, rgba(0, 102, 255, 0.85), rgba(0, 51, 153, 0.85))',
                  color: '#ffffff',
                  fontWeight: 800,
                  fontSize: 15,
                  letterSpacing: '1px',
                  padding: '4px 12px',
                  borderRadius: 6,
                  border: '1.5px solid rgba(255, 255, 255, 0.5)'
                }}
              >
                IB-CAST <span style={{ color: '#ffd60a', fontSize: 12 }}>HD</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 2. Capa de Reloj en Pantalla */}
      {clock.enabled && (
        <div
          style={{
            position: 'absolute',
            top: clock.position === 'BOTTOM_LEFT' ? undefined : `${clock.y || 14}%`,
            bottom: clock.position === 'BOTTOM_LEFT' ? '8%' : undefined,
            right: clock.position === 'BOTTOM_LEFT' ? undefined : `${100 - (clock.x || 88)}%`,
            left: clock.position === 'BOTTOM_LEFT' ? '5%' : undefined,
            zIndex: 11,
            pointerEvents: 'none',
            display: 'flex',
            alignItems: 'center'
          }}
        >
          <div
            style={{
              background: clock.showBox ? `rgba(0, 0, 0, ${clock.bgOpacity || 0.5})` : 'transparent',
              backdropFilter: clock.showBox ? 'blur(4px)' : 'none',
              border: clock.showBox ? '1px solid rgba(255, 255, 255, 0.15)' : 'none',
              borderRadius: 4,
              padding: '2px 8px',
              color: clock.fontColor || '#ffffff',
              fontFamily: 'var(--font-mono, monospace)',
              fontWeight: 600,
              fontSize: clock.fontSize ? clock.fontSize * 0.8 : 12,
              letterSpacing: '0.5px',
              textShadow: '0 1px 3px rgba(0,0,0,0.9)',
              display: 'flex',
              alignItems: 'center',
              gap: 5
            }}
          >
            <span>{displayClock}</span>
            <span style={{ fontSize: 9, color: 'var(--apple-orange, #ff9f0a)', fontWeight: 700 }}>
              {clock.timezone === 'BOT' ? 'BOT' : ''}
            </span>
          </div>
        </div>
      )}

      {/* 3. Capa de Clima en Pantalla (Debajo de la hora o en posición libre - 100% transparente sin fondo negro) */}
      {weather.enabled && weather.temperature !== null && (() => {
        const isUnderClock = weather.position === 'WITH_CLOCK' || weather.position === 'TOP_RIGHT_UNDER_LOGO';
        const targetX = isUnderClock ? (clock.x || 88) : (weather.x || 88);
        const clockYOffset = clock.fontSize ? (clock.fontSize * 0.22 + 2.8) : 4.0;
        const targetY = isUnderClock ? ((clock.y || 14) + clockYOffset) : (weather.y || 19);

        return (
          <div
            style={{
              position: 'absolute',
              top: `${targetY}%`,
              right: `${100 - targetX}%`,
              zIndex: 11,
              pointerEvents: 'none',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <div
              style={{
                background: 'transparent',
                border: 'none',
                padding: '0 4px',
                color: weather.fontColor || '#ffffff',
                fontSize: 11,
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                textShadow: '0 1px 3px rgba(0,0,0,0.95), 0 0 5px rgba(0,0,0,0.9), 1px 1px 2px rgba(0,0,0,1)',
                filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.9))'
              }}
              title={`${weather.city}: ${weather.conditionText} (${weather.temperature}°C, ${weather.humidity}% HR)`}
            >
              {weather.showIcon && renderWeatherIcon(weather.icon || 'sun')}
              <span style={{ fontWeight: 700, letterSpacing: '0.3px' }}>{weather.temperature}°C</span>
              {weather.showHumidity && (
                <span style={{ fontSize: 9.5, color: 'var(--color-cyan, #64d2ff)', fontWeight: 600 }}>
                  {weather.humidity}%
                </span>
              )}
            </div>
          </div>
        );
      })()}

      {/* 3. Capa de Ticker / Zócalo Inferior */}
      {ticker.enabled && ticker.text && (
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            width: '100%',
            height: 26,
            background: ticker.bgColor || 'rgba(0, 43, 73, 0.85)',
            borderTop: '1px solid rgba(255, 255, 255, 0.25)',
            display: 'flex',
            alignItems: 'center',
            overflow: 'hidden',
            zIndex: 10,
            pointerEvents: 'none'
          }}
        >
          <div
            style={{
              background: 'var(--apple-red, #ff453a)',
              color: '#ffffff',
              fontSize: 10,
              fontWeight: 700,
              padding: '0 10px',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              letterSpacing: '0.5px',
              flexShrink: 0
            }}
          >
            IB-CAST NOTICIAS
          </div>
          <div
            style={{
              whiteSpace: 'nowrap',
              color: ticker.textColor || '#ffffff',
              fontSize: 11,
              fontWeight: 500,
              paddingLeft: 16,
              letterSpacing: '0.4px',
              display: 'inline-block'
            }}
          >
            {ticker.text}
          </div>
        </div>
      )}
    </div>
  );
};
