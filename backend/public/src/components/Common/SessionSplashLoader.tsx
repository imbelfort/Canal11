import React, { useState, useEffect } from 'react';
import { PlaySquare, Radio, ShieldCheck } from 'lucide-react';

interface SessionSplashLoaderProps {
  isSessionReady: boolean;
}

export const SessionSplashLoader: React.FC<SessionSplashLoaderProps> = ({ isSessionReady }) => {
  const [visible, setVisible] = useState(true);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    if (isSessionReady) {
      setFading(true);
      const timer = setTimeout(() => {
        setVisible(false);
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [isSessionReady]);

  // Timeout de seguridad: Si la sesión tarda más de 3 segundos (ej. modo offline local), liberar pantalla
  useEffect(() => {
    const safetyTimer = setTimeout(() => {
      setFading(true);
      setTimeout(() => setVisible(false), 300);
    }, 3200);
    return () => clearTimeout(safetyTimer);
  }, []);

  if (!visible) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        background: 'var(--color-canvas, #f8f9fa)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: fading ? 0 : 1,
        transition: 'opacity 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
        pointerEvents: fading ? 'none' : 'auto'
      }}
    >
      <div
        style={{
          width: 380,
          maxWidth: '90vw',
          background: 'var(--color-field, #edf2fa)',
          border: '1px solid var(--color-hairline, #e0e3e7)',
          borderRadius: 18,
          padding: '24px 28px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          boxShadow: '0 8px 30px rgba(0, 0, 0, 0.08)'
        }}
      >
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 14,
            background: 'var(--color-primary-subtle, rgba(11, 87, 208, 0.12))',
            color: 'var(--color-primary, #0b57d0)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 16
          }}
        >
          <PlaySquare size={26} />
        </div>

        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-ink, #1f1f1f)', textAlign: 'center' }}>
          IB-Cast Playout Master
        </div>
        <div style={{ fontSize: 11, color: 'var(--color-text-muted, #5e6260)', marginTop: 2, textAlign: 'center' }}>
          Emisión Continua 24/7 y Sincronización de Escaleta
        </div>

        {/* Barra de Progreso Lineal Indeterminada M3 */}
        <div
          style={{
            width: '100%',
            height: 3,
            position: 'relative',
            overflow: 'hidden',
            background: 'rgba(11, 87, 208, 0.1)',
            borderRadius: 9999,
            marginTop: 20,
            marginBottom: 14
          }}
        >
          <div className="m3-linear-loader-bar" />
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 10.5,
            color: 'var(--color-text-muted, #5e6260)',
            fontFamily: 'var(--font-family-mono, monospace)'
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              backgroundColor: 'var(--color-primary, #0b57d0)',
              display: 'inline-block',
              animation: 'tally-dot-blink 1.2s infinite'
            }}
          />
          <span>Recuperando sesión y validando medios...</span>
        </div>
      </div>
    </div>
  );
};

