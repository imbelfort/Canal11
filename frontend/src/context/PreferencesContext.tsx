import React, { createContext, useContext, useState, useEffect } from 'react';

export type ThemeMode = 'dark' | 'light';
export type ColorPalette = 'default' | 'broadcast-blue' | 'cyber-emerald' | 'sunset-amber';
export type FontSizeLevel = 'sm' | 'md' | 'lg';

interface VisualPreferences {
  themeMode: ThemeMode;
  colorPalette: ColorPalette;
  fontSize: FontSizeLevel;
}

interface UserSession {
  id_usuario: number;
  nombre: string;
  apellidos: string;
  email: string;
  usuario_sistema: string;
  ci: string;
  roles: string[];
  rol_principal: 'ADMINISTRADOR' | 'PROGRAMADOR' | 'ENCARGADO_CONTENIDOS' | string;
}

interface PreferencesContextType {
  prefs: VisualPreferences;
  user: UserSession | null;
  setUser: (u: UserSession | null) => void;
  setThemeMode: (mode: ThemeMode) => void;
  setColorPalette: (palette: ColorPalette) => void;
  setFontSize: (size: FontSizeLevel) => void;
  logout: () => void;
}

const defaultPrefs: VisualPreferences = {
  themeMode: 'dark',
  colorPalette: 'default',
  fontSize: 'md'
};

const PreferencesContext = createContext<PreferencesContextType>({
  prefs: defaultPrefs,
  user: null,
  setUser: () => {},
  setThemeMode: () => {},
  setColorPalette: () => {},
  setFontSize: () => {},
  logout: () => {}
});

export const PreferencesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [prefs, setPrefs] = useState<VisualPreferences>(() => {
    try {
      const saved = localStorage.getItem('canal11_visual_prefs');
      return saved ? JSON.parse(saved) : defaultPrefs;
    } catch {
      return defaultPrefs;
    }
  });

  const [user, setUser] = useState<UserSession | null>(() => {
    try {
      const saved = localStorage.getItem('playout_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    // Aplicar a HTML raíz para herencia en cascada CSS limpia
    const root = document.documentElement;
    root.setAttribute('data-theme', prefs.themeMode);
    root.setAttribute('data-palette', prefs.colorPalette);
    root.setAttribute('data-font-size', prefs.fontSize);
    localStorage.setItem('canal11_visual_prefs', JSON.stringify(prefs));
  }, [prefs]);

  const setThemeMode = (mode: ThemeMode) => setPrefs(prev => ({ ...prev, themeMode: mode }));
  const setColorPalette = (palette: ColorPalette) => setPrefs(prev => ({ ...prev, colorPalette: palette }));
  const setFontSize = (fontSize: FontSizeLevel) => setPrefs(prev => ({ ...prev, fontSize }));

  const logout = () => {
    localStorage.removeItem('playout_token');
    localStorage.removeItem('playout_user');
    setUser(null);
  };

  return (
    <PreferencesContext.Provider value={{ prefs, user, setUser, setThemeMode, setColorPalette, setFontSize, logout }}>
      {children}
    </PreferencesContext.Provider>
  );
};

export const usePreferences = () => useContext(PreferencesContext);
