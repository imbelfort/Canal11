import React from 'react';

interface LinearLoaderProps {
  active: boolean;
  height?: number;
  label?: string;
  style?: React.CSSProperties;
}

export const LinearLoader: React.FC<LinearLoaderProps> = ({
  active,
  height = 2.5,
  label,
  style
}) => {
  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height,
        zIndex: 40,
        pointerEvents: 'none',
        opacity: active ? 1 : 0,
        transition: 'opacity 0.25s ease',
        ...style
      }}
      role="progressbar"
      aria-label="Cargando..."
    >
      <div
        className="m3-linear-loader"
        style={{
          width: '100%',
          height: '100%',
          background: 'rgba(11, 87, 208, 0.12)'
        }}
      >
        <div className="m3-linear-loader-bar" />
      </div>

      {label && active && (
        <div
          style={{
            position: 'absolute',
            top: height + 4,
            right: 14,
            fontSize: 10,
            fontWeight: 600,
            color: 'var(--color-primary)',
            background: 'var(--color-field)',
            border: '1px solid var(--color-hairline)',
            borderRadius: 9999,
            padding: '2px 8px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            pointerEvents: 'none',
            zIndex: 41
          }}
        >
          <span
            style={{
              width: 5,
              height: 5,
              borderRadius: '50%',
              backgroundColor: 'var(--color-primary)',
              display: 'inline-block',
              animation: 'tally-dot-blink 1.2s infinite'
            }}
          />
          <span>{label}</span>
        </div>
      )}
    </div>
  );
};
