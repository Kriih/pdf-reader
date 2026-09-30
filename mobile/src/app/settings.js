import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  AlignSection,
  BackgroundSection,
  FontSection,
  LayoutSection,
  SizeSection,
} from '../../components/StyleControls';
import UpdateSection from '../../components/UpdateSection';
import { Chip, IconButton, Section } from '../../components/ui';
import { ask } from '../../reader/notify';
import { textStyles } from '../../reader/textStyles';
import { ACCENTS, accentFor, LIBRARY_VIEWS } from '../../reader/theme';
import { useReaderSettings } from '../../reader/useReaderSettings';

const MAX_WIDTH = 680;

const goBack = () => (router.canGoBack() ? router.back() : router.replace('/'));

// Color de la app y estilo de lectura predeterminado. Son los mismos ajustes
// que el panel "Estilo" del lector: lo que se cambia aquí vale para todos los documentos.
export default function Settings() {
  const insets = useSafeAreaInsets();
  const { settings, theme, update, step, reset } = useReaderSettings();
  const props = { settings, theme, update, step };
  const s = textStyles(settings, theme);

  async function onReset() {
    const ok = await ask(
      'Restablecer estilo',
      'El color de la app, la vista de la biblioteca, la fuente, el tamaño, el interlineado, la alineación, el fondo y el paso de página volverán a sus valores por defecto.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Restablecer', value: true, style: 'destructive' },
      ],
    );
    if (ok) reset();
  }

  return (
    <View style={[styles.flex, { backgroundColor: theme.bg }]}>
      <StatusBar style={theme.statusBar} />
      <View style={[styles.topBar, { paddingTop: insets.top, borderColor: theme.border }]}>
        <IconButton icon="arrow-back" label="Volver a la biblioteca" onPress={goBack} theme={theme} />
        <Text style={[styles.title, { color: theme.text }]} accessibilityRole="header">
          Configuración
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 32 }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.column}>
          <Section label="Color de la app" theme={theme}>
            <View style={styles.row}>
              {Object.entries(ACCENTS).map(([key, a]) => {
                const selected = settings.accent === key;
                const color = accentFor(key, theme);
                return (
                  <Pressable
                    key={key}
                    onPress={() => update({ accent: key })}
                    accessibilityRole="radio"
                    accessibilityLabel={`Color ${a.label.toLowerCase()}`}
                    accessibilityState={{ checked: selected }}
                    style={({ pressed }) => [
                      styles.accent,
                      { borderColor: selected ? color : theme.border },
                      selected && styles.accentSelected,
                      pressed && { opacity: 0.6 },
                    ]}
                  >
                    <View style={[styles.accentDot, { backgroundColor: color }]}>
                      {selected && <Ionicons name="checkmark" size={18} color={theme.onAccent} />}
                    </View>
                    <Text style={[styles.accentLabel, { color: theme.text }]}>{a.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          </Section>

          <Section label="Biblioteca" theme={theme}>
            <View style={styles.row}>
              {Object.entries(LIBRARY_VIEWS).map(([key, v]) => (
                <Chip
                  key={key}
                  label={v.label}
                  selected={settings.libraryView === key}
                  onPress={() => update({ libraryView: key })}
                  theme={theme}
                />
              ))}
            </View>
            <Text style={[styles.hint, { color: theme.muted }]}>
              {settings.libraryView === 'grid'
                ? 'Portadas grandes en cuadrícula, como una estantería.'
                : 'Lista con portada pequeña, progreso y fecha de lectura.'}
            </Text>
          </Section>

          <Text style={[styles.intro, { color: theme.muted }]}>
            Estilo de lectura con el que se abren todos los documentos. Mientras lees también puedes cambiarlo desde
            «Estilo».
          </Text>

          <View
            style={[styles.preview, { backgroundColor: theme.bg, borderColor: theme.border }]}
            accessibilityLabel="Vista previa del estilo de lectura"
          >
            <Text style={[s.heading, styles.noMargin]}>Vista previa</Text>
            <Text style={[s.body, styles.noMargin]}>
              Así se verá el texto ajustado: con esta fuente, este tamaño, este interlineado y estos colores.
            </Text>
          </View>

          <FontSection {...props} />
          <SizeSection {...props} />
          <AlignSection {...props} />
          <BackgroundSection {...props} />

          <LayoutSection label="Vista PDF" {...props} />

          <Pressable
            onPress={onReset}
            accessibilityRole="button"
            style={({ pressed }) => [styles.reset, { borderColor: theme.border }, pressed && { opacity: 0.6 }]}
          >
            <Ionicons name="refresh-outline" size={20} color={theme.text} />
            <Text style={[styles.resetText, { color: theme.text }]}>Restablecer valores por defecto</Text>
          </Pressable>

          <UpdateSection theme={theme} />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minHeight: 56,
    paddingHorizontal: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: { fontSize: 18, fontWeight: '600' },
  scroll: { paddingHorizontal: 16, paddingTop: 16 },
  column: { width: '100%', maxWidth: MAX_WIDTH, alignSelf: 'center', gap: 20 },
  intro: { fontSize: 14, lineHeight: 20 },
  preview: { borderWidth: 1, borderRadius: 12, padding: 16, gap: 8 },
  noMargin: { marginTop: 0, marginBottom: 0 },
  row: { flexDirection: 'row', gap: 8 },
  hint: { fontSize: 12, lineHeight: 16 },
  accent: { flex: 1, alignItems: 'center', gap: 6, paddingVertical: 10, borderWidth: 1, borderRadius: 12 },
  accentSelected: { borderWidth: 2 },
  accentDot: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  accentLabel: { fontSize: 13, fontWeight: '500' },
  reset: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 48,
    borderWidth: 1,
    borderRadius: 12,
    marginTop: 4,
  },
  resetText: { fontSize: 15, fontWeight: '600' },
});
