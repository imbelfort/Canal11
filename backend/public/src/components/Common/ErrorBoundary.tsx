import React, { Component, ErrorInfo, ReactNode } from 'react';
import { ShieldAlert, RefreshCw, Copy, Check, ChevronDown, ChevronUp } from 'lucide-react';

interface Props {
  moduleName: string;
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  copied: boolean;
  showDetails: boolean;
}

/**
 * ErrorBoundary modular (Anti-Monolito):
 * Si ocurre una excepción dentro de un módulo (Playlist, MasterDeck, Auditoría, Modales),
 * aísla el fallo completamente para que la aplicación general y el motor de emisión 24/7
 * NUNCA se cierren ni queden en pantalla blanca.
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      copied: false,
      showDetails: false
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    console.error(`[ErrorBoundary - ${this.props.moduleName}] Excepción capturada:`, error, errorInfo);

    // Registro automático del incidente en la base de datos de auditoría 24/7
    try {
      fetch('/api/audit/incidents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          severity: 'ERROR',
          source: `UI_${this.props.moduleName.toUpperCase().replace(/\s+/g, '_')}`,
          description: `Fallo aislado en interfaz (${this.props.moduleName}): ${error.message || error}`
        })
      }).catch(() => {});
    } catch {}
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  handleCopyDiagnostics = async () => {
    const diagnosticText = [
      `=== DIAGNÓSTICO DE ERROR DE MÓDULO ===`,
      `Módulo: ${this.props.moduleName}`,
      `Fecha: ${new Date().toISOString()}`,
      `Mensaje: ${this.state.error?.name || 'Error'}: ${this.state.error?.message || 'Sin descripción'}`,
      `Stack Técnico:`,
      this.state.error?.stack || 'No disponible',
      `Component Stack:`,
      this.state.errorInfo?.componentStack || 'No disponible'
    ].join('\n');

    try {
      await navigator.clipboard.writeText(diagnosticText);
      this.setState({ copied: true });
      setTimeout(() => this.setState({ copied: false }), 2000);
    } catch (e) {
      console.warn('[ErrorBoundary] No se pudo copiar diagnóstico:', e);
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const errorMessage = this.state.error?.message || 'Error desconocido en el componente';
      const errorName = this.state.error?.name || 'Error';

      return (
        <div
          style={{
            margin: 12,
            padding: 18,
            background: 'var(--color-canvas-soft)',
            border: '1px solid var(--color-live)',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-card)',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            color: 'var(--color-ink)'
          }}
        >
          {/* Cabecera del Error */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--color-live-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <ShieldAlert size={20} color="var(--color-live)" />
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-live)' }}>
                  Fallo Aislado en {this.props.moduleName}
                </div>
                <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                  La emisión 24/7 y los demás subsistemas continúan operando normalmente (Protección Anti-Monolito).
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button
                className="btn-tool"
                onClick={this.handleCopyDiagnostics}
                style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11 }}
                title="Copiar diagnóstico técnico al portapapeles"
              >
                {this.state.copied ? <Check size={12} color="var(--color-success)" /> : <Copy size={12} />}
                <span>{this.state.copied ? '¡Copiado!' : 'Copiar Diagnóstico'}</span>
              </button>
              <button
                className="btn-tool primary"
                onClick={this.handleReset}
                style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11 }}
              >
                <RefreshCw size={12} />
                <span>Reintentar Módulo</span>
              </button>
            </div>
          </div>

          {/* Mensaje de Error Explícito */}
          <div
            style={{
              background: 'var(--color-field)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              padding: '10px 14px',
              fontFamily: 'var(--font-mono)',
              fontSize: 12,
              lineHeight: 1.5,
              color: 'var(--color-live)',
              wordBreak: 'break-all'
            }}
          >
            <strong style={{ color: 'var(--color-live)' }}>{errorName}:</strong> {errorMessage}
          </div>

          {/* Detalles Técnicos Desplegables */}
          <div>
            <button
              onClick={() => this.setState({ showDetails: !this.state.showDetails })}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--color-text-muted)',
                fontSize: 11,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                padding: 0
              }}
            >
              {this.state.showDetails ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              <span>{this.state.showDetails ? 'Ocultar detalles técnicos' : 'Ver traza técnica y detalles'}</span>
            </button>

            {this.state.showDetails && (
              <div
                style={{
                  marginTop: 8,
                  padding: 10,
                  background: 'var(--color-field)',
                  borderRadius: 'var(--radius-sm)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 10.5,
                  color: 'var(--color-ink-soft)',
                  maxHeight: 180,
                  overflowY: 'auto',
                  whiteSpace: 'pre-wrap'
                }}
              >
                {this.state.error?.stack || 'No se pudo obtener traza de pila.'}
                {'\n\nComponent Stack:\n'}
                {this.state.errorInfo?.componentStack || 'No disponible'}
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
