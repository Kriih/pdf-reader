import { useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';

// Pinta los bloques invisibles al ancho de la columna y devuelve, por clave,
// { text, lines }: el texto de cada línea tal como lo parte Android (versión
// web: TextMeasurer.web.js). Se monta con una key por tanda, así que cada
// tanda empieza con resultados vacíos.
export default function TextMeasurer({ items, width, styleFor, onMeasured }) {
  const results = useRef(new Map());
  const done = (it, lines) => {
    results.current.set(it.key, { text: it.title ?? it.text, lines });
    if (results.current.size === items.length) onMeasured(results.current);
  };
  return (
    <View pointerEvents="none" style={[styles.hidden, { width }]} importantForAccessibility="no-hide-descendants">
      {items.map((it) => (
        <Text
          key={it.key}
          style={styleFor(it)}
          // Corte de línea voraz (sin optimizar el párrafo entero): un trozo del
          // párrafo se vuelve a partir igual, así que cabe exacto en su página.
          textBreakStrategy="simple"
          android_hyphenationFrequency="none"
          onTextLayout={(e) =>
            done(
              it,
              e.nativeEvent.lines.map((l) => l.text),
            )
          }
        >
          {it.title ?? it.text}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  hidden: { position: 'absolute', top: 0, left: 0, opacity: 0 },
});
