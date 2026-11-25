import React, { createContext, useContext, useState, useEffect } from 'react';

type ThemeMode = 'dark' | 'light' | 'auto';
type VisualProfile = 'child' | 'youth' | 'adult';
type FontSizeLevel = 'sm' | 'md' | 'lg' | 'xl';

interface VisualPreferences {
  themeMode: ThemeMode;
  profile: VisualProfile;
  fontSize: FontSizeLevel;
  highContrast: boolean;
  darkFrom: string;
  darkUntil: string;
}

export interface UserSession {
  id_usuario: number;
  nombre: string;
  apellidos: string;
  email: string;
  usuario_sistema: string;
  ci: string;
  roles: string[];
  rol_principal: string;
}

const defaultPrefs: VisualPreferences = {
  themeMode: 'dark',
  profile: 'adult',
  fontSize: 'md',
  highContrast: false,
  darkFrom: '19:00',
  darkUntil: '07:00',
};

const clock = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'America/La_Paz', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
});
const validTime = (value: unknown): value is string =>
  typeof value === 'string' && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value);

function readPreferences(): VisualPreferences {
  try {
    const saved = JSON.parse(localStorage.getItem('canal11_visual_prefs') ?? 'null');
    if (!saved) return defaultPrefs;
    const profile = ['child', 'youth', 'adult'].includes(saved.profile)
      ? saved.profile
      : saved.colorPalette === 'sunset-amber' ? 'child' : saved.colorPalette === 'cyber-emerald' ? 'youth' : 'adult';
    return {
      profile,
      themeMode: ['light', 'dark', 'auto'].includes(saved.themeMode) ? saved.themeMode : defaultPrefs.themeMode,
      fontSize: ['sm', 'md', 'lg', 'xl'].includes(saved.fontSize) ? saved.fontSize : defaultPrefs.fontSize,
      highContrast: saved.highContrast === true,
      darkFrom: validTime(saved.darkFrom) ? saved.darkFrom : defaultPrefs.darkFrom,
      darkUntil: validTime(saved.darkUntil) ? saved.darkUntil : defaultPrefs.darkUntil,
    };
  } catch {
    return defaultPrefs;
  }
}

function effectiveTheme({ themeMode, darkFrom, darkUntil }: VisualPreferences) {
  if (themeMode !== 'auto') return themeMode;
  const now = clock.format(new Date());
  const dark = darkFrom === darkUntil || (darkFrom < darkUntil
    ? now >= darkFrom && now < darkUntil
    : now >= darkFrom || now < darkUntil);
  return dark ? 'dark' : 'light';
}

const PreferencesContext = createContext({
  prefs: defaultPrefs,
  user: null as UserSession | null,
  setUser: (_user: UserSession | null) => {},
  updatePreferences: (_changes: Partial<VisualPreferences>) => {},
  logout: () => {},
});

export const PreferencesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [prefs, setPrefs] = useState(readPreferences);
  const [user, setUser] = useState<UserSession | null>(() => {
    try {
      return JSON.parse(localStorage.getItem('playout_user') ?? 'null');
    } catch {
      return null;
    }
  });

  useEffect(() => {
    const root = document.documentElement;
    const refreshTheme = () => { root.dataset.theme = effectiveTheme(prefs); };
    root.dataset.profile = prefs.profile;
    root.dataset.fontSize = prefs.fontSize;
    root.dataset.contrast = prefs.highContrast ? 'high' : 'standard';
    refreshTheme();
    try {
      localStorage.setItem('canal11_visual_prefs', JSON.stringify(prefs));
    } catch {
      // Session preferences still apply when persistent storage is unavailable.
    }
    if (prefs.themeMode !== 'auto') return;
    const timer = window.setInterval(refreshTheme, 1000);
    document.addEventListener('visibilitychange', refreshTheme);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', refreshTheme);
    };
  }, [prefs]);

  const updatePreferences = (changes: Partial<VisualPreferences>) => {
    setPrefs(previous => ({ ...previous, ...changes }));
  };

  const logout = () => {
    localStorage.removeItem('playout_token');
    localStorage.removeItem('playout_user');
    setUser(null);
  };

  return (
    <PreferencesContext.Provider value={{ prefs, user, setUser, updatePreferences, logout }}>
      {children}
    </PreferencesContext.Provider>
  );
};

export const usePreferences = () => useContext(PreferencesContext);
