import React from 'react';
import { usePreferences, ColorPalette, FontSizeLevel, ThemeMode } from '../context/PreferencesContext';
import { Sun, Moon, Sliders, X, Check } from 'lucide-react';

interface PreferencesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PreferencesModal: React.FC<PreferencesModalProps> = ({ isOpen, onClose }) => {
  const { prefs, setThemeMode, setColorPalette, setFontSize } = usePreferences();

  if (!isOpen) return null;

  const palettes: { id: ColorPalette; label: string; primaryColor: string; desc: string }[] = [
    { id: 'broadcast-blue', label: 'Broadcast Blue', primaryColor: '#2563eb', desc: 'Estándar para emisión' },
    { id: 'cyber-emerald', label: 'Cyber Emerald', primaryColor: '#10b981', desc: 'Control técnico QC y master' },
    { id: 'sunset-amber', label: 'Sunset Amber', primaryColor: '#f59e0b', desc: 'Programación y pautas' }
  ];

  const fontSizes: { id: FontSizeLevel; label: string; desc: string }[] = [
    { id: 'sm', label: 'Compacta (13px)', desc: 'Mayor densidad de datos' },
    { id: 'md', label: 'Estándar (14.5px)', desc: 'Equilibrio ideal' },
    { id: 'lg', label: 'Grande (16.5px)', desc: 'Monitores de cabina a distancia' }
  ];

  return (
    <div className="config-modal-backdrop" onClick={onClose}>
      <div className="config-modal-card" onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, borderBottom: '1px solid var(--color-hairline, #334155)', paddingBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: 16 }}>
            <Sliders size={18} color="var(--primary, #38bdf8)" />
            <span>Configuración Visual (Compartida por Roles)</span>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: 18 }}>
            <X size={18} />
          </button>
        </div>

        {/* 1. MODO OSCURO / CLARO */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>
            Modo de Visualización
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <button
              onClick={() => setThemeMode('dark')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                padding: '10px 14px',
                borderRadius: 8,
                border: prefs.themeMode === 'dark' ? '2px solid var(--primary, #38bdf8)' : '1px solid var(--color-hairline, #334155)',
                background: prefs.themeMode === 'dark' ? 'rgba(56, 189, 248, 0.12)' : 'var(--color-field, #0f172a)',
                color: 'inherit',
                cursor: 'pointer',
                fontWeight: 600
              }}
            >
              <Moon size={16} />
              <span>Modo Oscuro</span>
              {prefs.themeMode === 'dark' && <Check size={14} color="#38bdf8" />}
            </button>
            <button
              onClick={() => setThemeMode('light')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                padding: '10px 14px',
                borderRadius: 8,
                border: prefs.themeMode === 'light' ? '2px solid var(--primary, #38bdf8)' : '1px solid var(--color-hairline, #334155)',
                background: prefs.themeMode === 'light' ? 'rgba(56, 189, 248, 0.12)' : 'var(--color-field, #0f172a)',
                color: 'inherit',
                cursor: 'pointer',
                fontWeight: 600
              }}
            >
              <Sun size={16} />
              <span>Modo Claro</span>
              {prefs.themeMode === 'light' && <Check size={14} color="#38bdf8" />}
            </button>
          </div>
        </div>

        {/* 2. PALETAS DE COLOR PERSONALIZADAS */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>
            Paleta de Color del Sistema (3 Temas)
          </label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {palettes.map(p => {
              const active = prefs.colorPalette === p.id || (p.id === 'broadcast-blue' && prefs.colorPalette === 'default');
              return (
                <div
                  key={p.id}
                  onClick={() => setColorPalette(p.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    borderRadius: 8,
                    border: active ? `2px solid ${p.primaryColor}` : '1px solid var(--color-hairline, #334155)',
                    background: active ? `${p.primaryColor}18` : 'var(--color-field, #0f172a)',
                    cursor: 'pointer',
                    transition: 'all 0.15s'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 16, height: 16, borderRadius: '50%', background: p.primaryColor }} />
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{p.label}</div>
                      <div style={{ fontSize: 11, color: '#94a3b8' }}>{p.desc}</div>
                    </div>
                  </div>
                  {active && <Check size={16} color={p.primaryColor} />}
                </div>
              );
            })}
          </div>
        </div>

        {/* 3. TAMAÑO DE TIPOGRAFÍA ESCALABLE */}
        <div style={{ marginBottom: 24 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>
            Tamaño de Letra (Escalado Global)
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            {fontSizes.map(f => {
              const active = prefs.fontSize === f.id;
              return (
                <button
                  key={f.id}
                  onClick={() => setFontSize(f.id)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 4,
                    padding: '10px 8px',
                    borderRadius: 8,
                    border: active ? '2px solid var(--primary, #38bdf8)' : '1px solid var(--color-hairline, #334155)',
                    background: active ? 'rgba(56, 189, 248, 0.15)' : 'var(--color-field, #0f172a)',
                    color: 'inherit',
                    cursor: 'pointer'
                  }}
                >
                  <span style={{ fontWeight: 700, fontSize: f.id === 'sm' ? 12 : f.id === 'md' ? 14 : 16 }}>A</span>
                  <span style={{ fontSize: 11, fontWeight: 600 }}>{f.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <button
          onClick={onClose}
          className="btn-action"
          style={{ width: '100%', justifyContent: 'center', padding: '10px' }}
        >
          Aplicar y Cerrar
        </button>
      </div>
    </div>
  );
};
