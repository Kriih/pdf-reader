import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ALIGNS, FONTS, LAYOUTS, THEMES } from '../reader/theme';
import { Chip, Section, Stepper } from './ui';

// Controles del estilo de lectura, compartidos por el panel del lector y la
// pantalla de Configuración. Todos reciben { settings, theme, update, step }.

export function LayoutSection({ label = 'Páginas', settings, theme, update }) {
  return (
    <Section label={label} theme={theme}>
      <View style={styles.row}>
        {Object.entries(LAYOUTS).map(([key, l]) => (
          <Chip
            key={key}
            label={l.label}
            selected={settings.layout === key}
            onPress={() => update({ layout: key })}
            theme={theme}
          />
        ))}
      </View>
      <Text style={[styles.hint, { color: theme.muted }]}>
        {settings.layout === 'paged'
          ? 'Una página cada vez, entera en pantalla: desliza en horizontal para pasar de página.'
          : 'Desplazamiento vertical continuo.'}
      </Text>
    </Section>
  );
}

export function FontSection({ settings, theme, update }) {
  return (
    <Section label="Fuente" theme={theme}>
      <View style={styles.row}>
        {Object.entries(FONTS).map(([key, font]) => (
          <Chip
            key={key}
            label={font.label}
            selected={settings.font === key}
            onPress={() => update({ font: key })}
            theme={theme}
            style={{ fontFamily: font.family }}
          />
        ))}
      </View>
    </Section>
  );
}

export function SizeSection({ settings, theme, step }) {
  return (
    <View style={styles.row}>
      <View style={styles.flex}>
        <Section label="Tamaño" theme={theme}>
          <Stepper
            value={settings.fontSize}
            format={(v) => `${v}`}
            onDecrease={() => step('fontSize', -1)}
            onIncrease={() => step('fontSize', 1)}
            labels={['Letra más pequeña', 'Letra más grande']}
            theme={theme}
          />
        </Section>
      </View>
      <View style={styles.flex}>
        <Section label="Interlineado" theme={theme}>
          <Stepper
            value={settings.lineHeight}
            format={(v) => v.toFixed(1)}
            onDecrease={() => step('lineHeight', -1)}
            onIncrease={() => step('lineHeight', 1)}
            labels={['Menos interlineado', 'Más interlineado']}
            theme={theme}
          />
        </Section>
      </View>
    </View>
  );
}

export function AlignSection({ settings, theme, update }) {
  return (
    <Section label="Texto" theme={theme}>
      <View style={styles.row}>
        {Object.entries(ALIGNS).map(([key, a]) => (
          <Chip
            key={key}
            label={a.label}
            selected={settings.align === key}
            onPress={() => update({ align: key })}
            theme={theme}
          />
        ))}
      </View>
    </Section>
  );
}

export function BackgroundSection({ settings, theme, update }) {
  return (
    <Section label="Fondo" theme={theme}>
      <View style={[styles.row, styles.wrap]}>
        {Object.entries(THEMES).map(([key, t]) => {
          const selected = settings.theme === key;
          return (
            <Pressable
              key={key}
              onPress={() => update({ theme: key })}
              accessibilityRole="radio"
              accessibilityLabel={`Fondo ${t.label}`}
              accessibilityState={{ checked: selected }}
              style={[
                styles.swatch,
                { backgroundColor: t.bg, borderColor: selected ? theme.accent : theme.border },
                selected && styles.swatchSelected,
              ]}
            >
              <Text style={[styles.swatchText, { color: t.text }]} numberOfLines={1}>
                {t.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </Section>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: 'row', gap: 8 },
  wrap: { flexWrap: 'wrap' },
  hint: { fontSize: 12, lineHeight: 16 },
  swatch: {
    flexBasis: '45%',
    flexGrow: 1,
    minHeight: 52,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatchSelected: { borderWidth: 3 },
  swatchText: { fontSize: 15, fontWeight: '500' },
});
