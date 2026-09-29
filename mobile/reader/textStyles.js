import { FONTS } from './theme';

export const RULE = { width: 48, height: 2 };

// Estilos del modo texto a partir de los ajustes. El modo por páginas los usa
// también para calcular alturas: cada línea mide exactamente su lineHeight.
export function textStyles(settings, theme) {
  const fontFamily = FONTS[settings.font].family;
  const size = settings.fontSize;
  const headingSize = Math.round(size * 1.35);
  const chapterSize = Math.round(size * 1.6);
  const chapterGap = Math.round(size * 2.5);
  const ruleGap = size;
  return {
    justify: settings.align === 'justify',
    body: {
      fontFamily,
      fontSize: size,
      lineHeight: Math.round(size * settings.lineHeight),
      color: theme.text,
      textAlign: settings.align === 'justify' ? 'justify' : 'left',
      marginBottom: Math.round(size * 0.9),
    },
    heading: {
      fontFamily,
      fontSize: headingSize,
      lineHeight: Math.round(headingSize * 1.25),
      fontWeight: '700',
      color: theme.text,
      marginTop: Math.round(size * 0.6),
      marginBottom: Math.round(size * 0.7),
    },
    chapterTitle: {
      fontFamily,
      fontSize: chapterSize,
      lineHeight: Math.round(chapterSize * 1.25),
      fontWeight: '700',
      color: theme.text,
      textAlign: 'center',
      marginBottom: Math.round(size * 1.2),
    },
    // Separación de capítulo: hueco + raya corta centrada (+ título si hace falta).
    chapterGap,
    ruleGap,
    chapterDecor: chapterGap + RULE.height + ruleGap,
  };
}
