import { useState } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { Chip, Sheet } from './ui';

// Panel "Contenido" del lector: índice de capítulos y marcadores. Tocar una
// entrada salta a su página. Los marcadores se quitan desde la barra superior.
export default function ContentsSheet({
  visible,
  onClose,
  theme,
  contents,
  chapter,
  bookmarks,
  page,
  marked,
  canBookmark,
  fromText,
  onGo,
  onAddBookmark,
}) {
  const { height } = useWindowDimensions();
  const [tab, setTab] = useState('contents');

  return (
    <Sheet visible={visible} title="Contenido" onClose={onClose} theme={theme}>
      <View style={styles.tabs} accessibilityRole="tablist">
        <Chip label="Índice" selected={tab === 'contents'} onPress={() => setTab('contents')} theme={theme} />
        <Chip
          label={bookmarks.length ? `Marcadores (${bookmarks.length})` : 'Marcadores'}
          selected={tab === 'bookmarks'}
          onPress={() => setTab('bookmarks')}
          theme={theme}
        />
      </View>

      <ScrollView style={{ maxHeight: height * 0.55 }}>
        {tab === 'contents' ? (
          contents.length ? (
            <>
              {fromText && (
                <Text style={[styles.note, { color: theme.muted }]}>
                  El PDF no trae índice: estos capítulos se han detectado en el texto leído hasta ahora.
                </Text>
              )}
              {contents.map((c, i) => {
                const current = chapter && c.page === chapter.page && c.title === chapter.title;
                return (
                  <Row
                    key={`${c.page}-${i}`}
                    onPress={() => onGo(c.page)}
                    theme={theme}
                    indent={c.level * 16}
                    title={c.title}
                    bold={c.level === 0}
                    current={current}
                    right={String(c.page)}
                  />
                );
              })}
            </>
          ) : (
            <Empty
              icon="list-outline"
              theme={theme}
              text="Este PDF no trae índice. En el modo texto ajustado se detectan los capítulos por sus títulos."
            />
          )
        ) : (
          <>
            {/* Aquí solo se añaden: se quitan con el icono de la barra superior. */}
            {!marked && (
              <Pressable
                onPress={onAddBookmark}
                disabled={!canBookmark}
                accessibilityRole="button"
                style={({ pressed }) => [
                  styles.markButton,
                  { borderColor: theme.border },
                  (pressed || !canBookmark) && styles.dim,
                ]}
              >
                <Ionicons name="bookmark-outline" size={20} color={theme.accent} />
                <Text style={[styles.markText, { color: theme.text }]}>Marcar la página {page}</Text>
              </Pressable>
            )}
            {bookmarks.length ? (
              bookmarks.map((b) => {
                const here = b.page === page;
                return (
                  <Pressable
                    key={b.page}
                    onPress={() => onGo(b.page)}
                    accessibilityRole="button"
                    accessibilityLabel={`Ir a la página ${b.page}${b.chapter ? `, ${b.chapter}` : ''}`}
                    accessibilityState={{ selected: here }}
                    style={({ pressed }) => [styles.bookmark, pressed && { backgroundColor: theme.pdfBg }]}
                  >
                    <Ionicons name="bookmark" size={18} color={theme.accent} />
                    <View style={styles.bookmarkBody}>
                      <Text
                        style={[styles.bookmarkTitle, { color: here ? theme.accent : theme.text }]}
                        numberOfLines={1}
                      >
                        Página {b.page}
                        {b.chapter ? ` · ${b.chapter}` : ''}
                        {here ? ' · estás aquí' : ''}
                      </Text>
                      {b.snippet ? (
                        <Text style={[styles.snippet, { color: theme.muted }]} numberOfLines={2}>
                          {b.snippet}
                        </Text>
                      ) : null}
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={theme.muted} />
                  </Pressable>
                );
              })
            ) : (
              <Empty
                icon="bookmark-outline"
                theme={theme}
                text="Aún no hay marcadores. Usa el icono de marcador de la barra superior para guardar una página."
              />
            )}
          </>
        )}
      </ScrollView>
    </Sheet>
  );
}

function Row({ onPress, theme, indent, title, bold, current, right }) {
  const color = current ? theme.accent : theme.text;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: !!current }}
      style={({ pressed }) => [styles.row, { paddingLeft: 8 + indent }, pressed && { backgroundColor: theme.pdfBg }]}
    >
      <Text style={[styles.rowTitle, bold && styles.bold, { color }]} numberOfLines={2}>
        {title}
      </Text>
      <Text style={[styles.rowPage, { color: current ? theme.accent : theme.muted }]}>{right}</Text>
    </Pressable>
  );
}

function Empty({ icon, text, theme }) {
  return (
    <View style={styles.empty}>
      <Ionicons name={icon} size={32} color={theme.muted} />
      <Text style={[styles.emptyText, { color: theme.muted }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tabs: { flexDirection: 'row', gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 48, paddingRight: 8, borderRadius: 10 },
  rowTitle: { flex: 1, fontSize: 15 },
  bold: { fontWeight: '600' },
  rowPage: { fontSize: 13, fontVariant: ['tabular-nums'] },
  note: { fontSize: 12, lineHeight: 16, marginBottom: 8 },
  markButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 48,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderRadius: 12,
    marginBottom: 8,
  },
  markText: { fontSize: 15, fontWeight: '500' },
  dim: { opacity: 0.5 },
  bookmark: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  bookmarkBody: { flex: 1, gap: 2 },
  bookmarkTitle: { fontSize: 15, fontWeight: '500' },
  snippet: { fontSize: 13, lineHeight: 18 },
  empty: { alignItems: 'center', gap: 10, paddingVertical: 24, paddingHorizontal: 16 },
  emptyText: { fontSize: 14, lineHeight: 20, textAlign: 'center' },
});
