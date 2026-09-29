import { createContext, useContext, useEffect, useMemo, useState } from 'react';

import { ACCENTS, ALIGNS, DEFAULT_SETTINGS, FONTS, LAYOUTS, LIBRARY_VIEWS, LIMITS, THEMES, themeFor } from './theme';
import { loadSettings, saveSettings } from './settingsStore';

const clamp = (key, value) => {
  const [min, max, step] = LIMITS[key];
  const rounded = Math.round(value / step) * step;
  return Math.min(max, Math.max(min, Number(rounded.toFixed(2))));
};

const ReaderSettingsContext = createContext(null);

// Estado único de estilos de lectura, compartido por la biblioteca y el lector
// (el tema elegido en el lector también tiñe la biblioteca). Cualquier cambio
// se refleja al instante y se guarda para la próxima vez, así que lo que se
// elige en Configuración es el estilo con el que se abren todos los documentos.
export function ReaderSettingsProvider({ children }) {
  const [settings, setSettings] = useState(() => {
    const saved = loadSettings() ?? {};
    const merged = { ...DEFAULT_SETTINGS, ...saved };
    if (!THEMES[merged.theme]) merged.theme = DEFAULT_SETTINGS.theme;
    if (!ACCENTS[merged.accent]) merged.accent = DEFAULT_SETTINGS.accent;
    if (!LIBRARY_VIEWS[merged.libraryView]) merged.libraryView = DEFAULT_SETTINGS.libraryView;
    if (!FONTS[merged.font]) merged.font = DEFAULT_SETTINGS.font;
    if (!ALIGNS[merged.align]) merged.align = DEFAULT_SETTINGS.align;
    if (!LAYOUTS[merged.layout]) merged.layout = DEFAULT_SETTINGS.layout;
    return merged;
  });

  useEffect(() => saveSettings(settings), [settings]);

  const value = useMemo(
    () => ({
      settings,
      theme: themeFor(settings),
      update: (patch) => setSettings((s) => ({ ...s, ...patch })),
      reset: () => setSettings(DEFAULT_SETTINGS),
      step: (key, direction) =>
        setSettings((s) => ({ ...s, [key]: clamp(key, s[key] + direction * LIMITS[key][2]) })),
    }),
    [settings],
  );

  return <ReaderSettingsContext.Provider value={value}>{children}</ReaderSettingsContext.Provider>;
}

export function useReaderSettings() {
  return useContext(ReaderSettingsContext);
}
