import { Platform } from 'react-native';

// Colores de cada fondo; el de acento lo pone el color de la app (ACCENTS).
export const THEMES = {
  light: {
    label: 'Claro',
    bg: '#ffffff',
    pdfBg: '#f3f4f6',
    text: '#1f2328',
    muted: '#6b7280',
    surface: 'rgba(255,255,255,0.96)',
    border: '#e5e7eb',
    statusBar: 'dark',
  },
  sepia: {
    label: 'Sepia',
    bg: '#f4ecd8',
    pdfBg: '#e9dfc6',
    text: '#433422',
    muted: '#8a7458',
    surface: 'rgba(244,236,216,0.97)',
    border: '#dccfb0',
    statusBar: 'dark',
  },
  dark: {
    label: 'Oscuro',
    dark: true,
    bg: '#121212',
    pdfBg: '#1c1c1c',
    text: '#dcdcdc',
    muted: '#9a9a9a',
    surface: 'rgba(30,30,30,0.96)',
    border: '#333333',
    statusBar: 'light',
  },
  amoled: {
    // Negro puro: en pantallas OLED los píxeles se apagan y ahorra batería.
    label: 'AMOLED',
    dark: true,
    bg: '#000000',
    pdfBg: '#0a0a0a',
    text: '#d4d4d4',
    muted: '#8b8b8b',
    surface: 'rgba(0,0,0,0.96)',
    border: '#262626',
    statusBar: 'light',
  },
};

// Color de la app (botones, selección, enlaces). Cada uno tiene un tono para
// fondos claros y otro más luminoso para los oscuros, para que siempre se lea.
export const ACCENTS = {
  blue: { label: 'Azul', light: '#2563eb', dark: '#60a5fa' },
  red: { label: 'Rojo', light: '#c81e1e', dark: '#f87171' },
  green: { label: 'Verde', light: '#15803d', dark: '#4ade80' },
  purple: { label: 'Morado', light: '#7c3aed', dark: '#a78bfa' },
};

export const accentFor = (accent, theme) => (theme.dark ? ACCENTS[accent].dark : ACCENTS[accent].light);

export function themeFor(settings) {
  const theme = THEMES[settings.theme];
  return { ...theme, accent: accentFor(settings.accent, theme), onAccent: theme.dark ? '#000000' : '#ffffff' };
}

// Fuentes del sistema: no hay que empaquetar archivos de fuente y funcionan sin conexión.
export const FONTS = {
  sans: {
    label: 'Sans',
    family: Platform.select({ android: 'sans-serif', web: 'system-ui, "Segoe UI", Roboto, sans-serif' }),
  },
  serif: {
    label: 'Serif',
    family: Platform.select({ android: 'serif', web: 'Georgia, "Times New Roman", serif' }),
  },
  mono: {
    label: 'Mono',
    family: Platform.select({ android: 'monospace', web: 'ui-monospace, Menlo, Consolas, monospace' }),
  },
  system: { label: 'Sistema', family: undefined },
};

export const ALIGNS = {
  left: { label: 'Izquierda' },
  justify: { label: 'Justificado' },
};

// Cómo se pasa de página, en la vista PDF y en el texto ajustado.
export const LAYOUTS = {
  scroll: { label: 'Continuo' },
  paged: { label: 'Por páginas' },
};

// Cómo se muestran los documentos en la biblioteca.
export const LIBRARY_VIEWS = {
  list: { label: 'Lista' },
  grid: { label: 'Cuadrícula' },
};

export const DEFAULT_SETTINGS = {
  font: 'serif',
  fontSize: 18,
  lineHeight: 1.6,
  theme: 'light',
  align: 'left',
  layout: 'scroll',
  accent: 'blue',
  libraryView: 'list',
};

// [mínimo, máximo, paso]
export const LIMITS = {
  fontSize: [12, 32, 1],
  lineHeight: [1.2, 2.2, 0.1],
};
