import React, { useState } from 'react';
import { AlertCircle, RefreshCw, X, Copy, Check } from 'lucide-react';

interface ErrorAlertBannerProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  onDismiss?: () => void;
  severity?: 'error' | 'warning';
}

export const ErrorAlertBanner: React.FC<ErrorAlertBannerProps> = ({
  title = 'Error en la Operación',
  message,
  onRetry,
  onDismiss,
  severity = 'error'
}) => {
  const [copied, setCopied] = useState(false);

  const isError = severity === 'error';
  const accentColor = isError ? 'var(--apple-red, #ff453a)' : 'var(--apple-orange, #ff9f0a)';
  const bgColor = isError ? 'rgba(255, 69, 58, 0.12)' : 'rgba(255, 159, 10, 0.12)';
  const borderColor = isError ? 'rgba(255, 69, 58, 0.35)' : 'rgba(255, 159, 10, 0.35)';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(`${title}: ${message}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  return (
    <div
      style={{
        margin: '8px 12px',
        padding: '10px 14px',
        background: bgColor,
        border: `1px solid ${borderColor}`,
        borderRadius: 6,
        display: 'flex',
        alignItems: 'flex-start',
        gap: 10,
        boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
      }}
    >
      <AlertCircle size={16} color={accentColor} style={{ flexShrink: 0, marginTop: 2 }} />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: accentColor, marginBottom: 2 }}>
          {title}
        </div>
        <div
          style={{
            fontSize: 11.5,
            fontFamily: 'Consolas, monospace',
            color: 'var(--text-primary, #ffffff)',
            lineHeight: 1.4,
            wordBreak: 'break-all'
          }}
        >
          {message}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
        <button
          className="btn-tool"
          onClick={handleCopy}
          style={{ padding: '3px 8px', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}
          title="Copiar mensaje de error"
        >
          {copied ? <Check size={11} color="var(--apple-green)" /> : <Copy size={11} />}
          <span>{copied ? 'Copiado' : 'Copiar'}</span>
        </button>

        {onRetry && (
          <button
            className="btn-tool primary"
            onClick={onRetry}
            style={{ padding: '3px 10px', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}
            title="Reintentar operación"
          >
            <RefreshCw size={11} />
            <span>Reintentar</span>
          </button>
        )}

        {onDismiss && (
          <button
            onClick={onDismiss}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-secondary, #86868b)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              padding: 2
            }}
            title="Cerrar aviso"
          >
            <X size={14} />
          </button>
        )}
      </div>
    </div>
  );
};
