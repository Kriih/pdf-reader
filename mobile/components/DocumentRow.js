import Ionicons from '@expo/vector-icons/Ionicons';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { displayName, useCover } from '../library/library';
import { progressOf, relativeDay } from '../library/progress';
import { IconButton } from './ui';

// Una fila de la biblioteca: portada, título, progreso y menú.
export default function DocumentRow({ doc, theme, onOpen, onMore }) {
  const { label, ratio } = progressOf(doc);
  const cover = useCover(doc.cover);
  const title = displayName(doc);
  const started = !!doc.openedAt;
  const when = started ? relativeDay(doc.openedAt) : `Añadido ${relativeDay(doc.addedAt).toLowerCase()}`;
  // El botón ⋮ va al lado de la zona pulsable, no dentro: botones anidados
  // confunden a los lectores de pantalla (y en web no son HTML válido).
  return (
    <View style={styles.row}>
      <Pressable
        onPress={onOpen}
        onLongPress={onMore}
        accessibilityRole="button"
        accessibilityLabel={`${title}. ${label}`}
        accessibilityHint="Abre el documento en el lector"
        style={({ pressed }) => [styles.main, pressed && { backgroundColor: theme.pdfBg }]}
      >
        <View style={[styles.cover, { backgroundColor: theme.pdfBg, borderColor: theme.border }]}>
          {cover ? (
            <Image
              source={{ uri: cover }}
              resizeMode="cover"
              style={styles.coverImage}
              accessibilityIgnoresInvertColors
            />
          ) : (
            <Ionicons name="document-text-outline" size={22} color={started ? theme.accent : theme.muted} />
          )}
        </View>

        <View style={styles.body}>
          <Text style={[styles.title, { color: theme.text }]} numberOfLines={2}>
            {title}
          </Text>
          <Text style={[styles.meta, { color: theme.muted }]} numberOfLines={1}>
            {label} · {when}
          </Text>
          {started && ratio > 0 && (
            <View style={[styles.track, { backgroundColor: theme.border }]}>
              <View style={[styles.fill, { backgroundColor: theme.accent, width: `${Math.max(2, ratio * 100)}%` }]} />
            </View>
          )}
        </View>
      </Pressable>

      <IconButton icon="ellipsis-vertical" label={`Opciones de ${title}`} onPress={onMore} theme={theme} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingRight: 4 },
  main: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 12,
    paddingLeft: 16,
    paddingRight: 8,
    borderRadius: 14,
  },
  // Proporción de un folio A4 (1 : 1.41).
  cover: {
    width: 44,
    height: 62,
    borderRadius: 6,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  coverImage: { width: '100%', height: '100%' },
  body: { flex: 1, gap: 4 },
  title: { fontSize: 16, fontWeight: '600', lineHeight: 21 },
  meta: { fontSize: 13, fontVariant: ['tabular-nums'] },
  track: { height: 3, borderRadius: 2, marginTop: 4, overflow: 'hidden' },
  fill: { height: 3, borderRadius: 2 },
});
