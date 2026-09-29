import { useEffect } from 'react';

// react-native-web no tiene onTextLayout: las líneas se calculan con canvas
// partiendo por palabras, como hace el navegador. Se deja un margen de 2 px
// para que redondeos del navegador no añadan una línea que no se midió.
const SAFETY = 2;

function wrap(ctx, text, width) {
  const lines = [];
  let line = '';
  for (const word of text.split(/(?<= )/)) {
    if (line && ctx.measureText((line + word).trimEnd()).width > width) {
      lines.push(line);
      line = '';
    }
    line += word;
  }
  if (line) lines.push(line);
  return lines.length ? lines : [''];
}

export default function TextMeasurer({ items, width, styleFor, onMeasured }) {
  useEffect(() => {
    if (!items.length) return;
    const ctx = document.createElement('canvas').getContext('2d');
    const out = new Map();
    for (const it of items) {
      const st = styleFor(it);
      ctx.font = `${st.fontWeight ?? 400} ${st.fontSize}px ${st.fontFamily ?? 'system-ui, sans-serif'}`;
      const text = it.title ?? it.text;
      out.set(it.key, { text, lines: wrap(ctx, text, width - SAFETY) });
    }
    onMeasured(out);
  }, [items, width, styleFor, onMeasured]);
  return null;
}
