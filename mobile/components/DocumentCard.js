import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { displayName, useCover } from '../library/library';
import { progressOf } from '../library/progress';
import { FONTS } from '../reader/theme';
import { IconButton } from './ui';

const RATIO = 1.41; // proporción de un folio A4, como las portadas de la lista

// Un libro de la cuadrícula de la biblioteca: la portada manda. Sin portada
// propia se pinta una con el título, para que la estantería no quede vacía.
export default function DocumentCard({ doc, theme, width, onOpen, onMore }) {
  const { label, ratio } = progressOf(doc);
  const cover = useCover(doc.cover);
  const title = displayName(doc);
  const started = !!doc.openedAt;
  // El botón ⋮ va encima de la portada pero fuera de la zona pulsable:
  // botones anidados confunden a los lectores de pantalla.
  return (
    <View style={{ width }}>
      <Pressable
        onPress={onOpen}
        onLongPress={onMore}
        accessibilityRole="button"
        accessibilityLabel={`${title}. ${label}`}
        accessibilityHint="Abre el documento en el lector"
        style={({ pressed }) => pressed && styles.pressed}
      >
        <View style={[styles.cover, { height: width * RATIO, backgroundColor: theme.pdfBg, borderColor: theme.border }]}>
          {cover ? (
            <Image source={{ uri: cover }} resizeMode="cover" style={styles.fill} accessibilityIgnoresInvertColors />
          ) : (
            <View style={[styles.fill, styles.generated, { backgroundColor: theme.accent }]}>
              <View style={[styles.frame, { borderColor: theme.onAccent }]}>
                <Text
                  style={[styles.coverTitle, { color: theme.onAccent, fontSize: Math.max(13, Math.round(width / 9)) }]}
                  numberOfLines={6}
                >
                  {title}
                </Text>
              </View>
            </View>
          )}
          {started && ratio > 0 && (
            <View style={styles.track}>
              <View
                style={[
                  styles.progress,
                  // Sobre la portada generada (color de la app) la barra va en el color del texto.
                  { backgroundColor: cover ? theme.accent : theme.onAccent, width: `${Math.max(2, ratio * 100)}%` },
                ]}
              />
            </View>
          )}
        </View>

        <Text style={[styles.title, { color: theme.text }]} numberOfLines={2}>
          {title}
        </Text>
        <Text style={[styles.meta, { color: theme.muted }]} numberOfLines={1}>
          {label}
        </Text>
      </Pressable>

      <View style={[styles.more, { backgroundColor: theme.surface }]}>
        <IconButton icon="ellipsis-vertical" label={`Opciones de ${title}`} onPress={onMore} theme={theme} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.7 },
  cover: { borderRadius: 10, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden', marginBottom: 8 },
  fill: { width: '100%', height: '100%' },
  generated: { padding: 10 },
  frame: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 4,
    opacity: 0.9,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
  },
  coverTitle: { fontFamily: FONTS.serif.family, fontWeight: '700', textAlign: 'center' },
  track: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 4, backgroundColor: 'rgba(0,0,0,0.3)' },
  progress: { height: 4 },
  title: { fontSize: 14, fontWeight: '600', lineHeight: 19 },
  meta: { fontSize: 12, marginTop: 2, fontVariant: ['tabular-nums'] },
  more: { position: 'absolute', top: 6, right: 6, borderRadius: 22 },
});
