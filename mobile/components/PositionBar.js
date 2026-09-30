import { StyleSheet, View } from 'react-native';

const THUMB = 12;
const DOT = 6;
const LINE = 4;

// "#2563eb" mezclado con negro: el mismo color, más oscuro.
function darken(hex, amount) {
  const n = parseInt(hex.slice(1), 16);
  const c = [n >> 16, (n >> 8) & 255, n & 255].map((v) => Math.round(v * (1 - amount)));
  return `#${c.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

// Barra fija al pie de las vistas de texto: dónde voy dentro del PDF (el punto
// grande) y dónde hay marcadores (los pequeños). Solo informa: no capta toques,
// así que no interfiere con pasar de página tocando los bordes.
export default function PositionBar({ page, pages, bookmarks, theme, safeBottom }) {
  if (!pages) return null;
  const at = (p) => `${(pages > 1 ? (Math.min(Math.max(p, 1), pages) - 1) / (pages - 1) : 0) * 100}%`;
  const dark = darken(theme.accent, 0.4);
  return (
    <View
      pointerEvents="none"
      style={[styles.wrap, { paddingBottom: safeBottom + 6, backgroundColor: theme.bg }]}
      accessibilityRole="progressbar"
      accessibilityLabel="Posición en el documento"
      accessibilityValue={{ min: 1, max: pages, now: page, text: `Página ${page} de ${pages}` }}
    >
      <View style={styles.track}>
        <View style={[styles.line, { backgroundColor: theme.accent }]} />
        {bookmarks.map((b) => (
          <View key={b.page} style={[styles.dot, { left: at(b.page), backgroundColor: dark }]} />
        ))}
        <View style={[styles.thumb, { left: at(page), backgroundColor: dark, borderColor: theme.bg }]} />
      </View>
    </View>
  );
}

// Alto que ocupa la barra por encima del borde inferior seguro.
export const POSITION_BAR_HEIGHT = THUMB + 12;

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingTop: 6, paddingHorizontal: 20 },
  track: { height: THUMB },
  line: { position: 'absolute', left: 0, right: 0, top: (THUMB - LINE) / 2, height: LINE, borderRadius: LINE / 2 },
  dot: {
    position: 'absolute',
    top: (THUMB - DOT) / 2,
    width: DOT,
    height: DOT,
    borderRadius: DOT / 2,
    marginLeft: -DOT / 2,
  },
  thumb: {
    position: 'absolute',
    top: -2,
    width: THUMB + 4,
    height: THUMB + 4,
    borderRadius: (THUMB + 4) / 2,
    borderWidth: 2,
    marginLeft: -(THUMB + 4) / 2,
  },
});
