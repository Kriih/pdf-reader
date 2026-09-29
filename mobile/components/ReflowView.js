import { useCallback, useEffect, useMemo, useRef } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { ActivityIndicator, FlatList, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { buildItems, currentChapter } from '../reader/reflowItems';
import { textStyles } from '../reader/textStyles';
import ChapterBreak from './ChapterBreak';
import PagedText from './PagedText';

const MAX_WIDTH = 680; // ~65–75 caracteres por línea en tablet/escritorio: medida cómoda de lectura
const TAP_SLOP = 10;
const TAP_MS = 250;
const VIEWABILITY = { itemVisiblePercentThreshold: 10 }; // FlatList no admite cambiarlo tras montar

// Modo "texto ajustado": el texto extraído por Python se pinta como párrafos
// normales, así que siempre se adapta al ancho de la pantalla (sin scroll
// horizontal). Continuo (scroll vertical) o, con `paged`, en horizontal por páginas (PagedText).
//
// `initialPage` es la página del PDF donde empezar; `jump` ({ page, n }) pide
// saltos posteriores (índice, marcadores): cada n nuevo es un salto.
export default function ReflowView({
  pages,
  total,
  settings,
  theme,
  paged = false,
  marks,
  initialPage = 1,
  jump,
  insetTop,
  insetBottom,
  safeTop,
  safeBottom,
  onScroll,
  onTap,
  onTurn,
  onPageVisible,
  onBackToPdf,
}) {
  const listRef = useRef(null);
  const touch = useRef(null);
  const onPageVisibleRef = useRef(onPageVisible);
  useEffect(() => {
    onPageVisibleRef.current = onPageVisible;
  });

  const s = useMemo(() => textStyles(settings, theme), [settings, theme]);
  // Texto continuo, sin marcas de página: cada bloque recuerda en qué página
  // empieza y acaba, para la barra superior y para saltar a una página.
  const items = useMemo(() => buildItems(pages, { marks }), [pages, marks]);
  const chapterAt = useCallback((n) => currentChapter(marks, n), [marks]);
  const hasText = pages.some((p) => p.paragraphs.length > 0);
  const loading = pages.length < total;

  // Saltar a una página (puede llegar en una tanda posterior). Si el usuario
  // hace scroll antes, se respeta su posición.
  const goal = useRef(initialPage > 1 ? initialPage : null);
  const seenJump = useRef(jump.n);
  useEffect(() => {
    if (jump.n === seenJump.current) return;
    seenJump.current = jump.n;
    goal.current = jump.page;
  }, [jump]);
  useEffect(() => {
    if (paged || goal.current == null) return;
    // Primer bloque de esa página (o de la siguiente con texto).
    const index = items.findIndex((i) => i.end >= goal.current);
    if (index < 0) return;
    goal.current = null;
    const t = setTimeout(() => listRef.current?.scrollToIndex({ index, animated: false }), 50);
    return () => clearTimeout(t);
  }, [items, jump, paged]);

  // FlatList exige que este callback no cambie entre renders.
  const onViewableItemsChanged = useCallback(({ viewableItems }) => {
    const first = viewableItems[0];
    if (first) onPageVisibleRef.current?.(first.item.number);
  }, []);

  if (!hasText && loading) {
    return (
      <View style={[styles.empty, { backgroundColor: theme.bg }]}>
        <ActivityIndicator size="large" color={theme.accent} />
        <Text style={{ color: theme.muted }}>
          Extrayendo texto… {pages.length}/{total}
        </Text>
      </View>
    );
  }

  if (!hasText) {
    return (
      <View style={[styles.empty, { backgroundColor: theme.bg }]}>
        <Ionicons name="scan-outline" size={40} color={theme.muted} />
        <Text style={[styles.emptyTitle, { color: theme.text }]}>Este PDF no tiene texto seleccionable</Text>
        <Text style={[styles.emptyBody, { color: theme.muted }]}>
          Probablemente es un documento escaneado (imágenes). Para leerlo en modo texto haría falta OCR.
        </Text>
        <Pressable onPress={onBackToPdf} style={[styles.emptyButton, { backgroundColor: theme.accent }]}>
          <Text style={{ color: theme.onAccent, fontWeight: '600' }}>Volver a la vista PDF</Text>
        </Pressable>
      </View>
    );
  }

  if (paged) {
    return (
      <PagedText
        items={items}
        loading={loading}
        s={s}
        theme={theme}
        initialPage={initialPage}
        jump={jump}
        safeTop={safeTop}
        safeBottom={safeBottom}
        chapterAt={chapterAt}
        onTap={onTap}
        onTurn={onTurn}
        onPageVisible={onPageVisible}
      />
    );
  }

  const renderItem = ({ item }) => (
    <View style={styles.column}>
      {item.type === 'chapter' ? (
        <ChapterBreak title={item.title} first={item.first} s={s} theme={theme} />
      ) : (
        <Text
          // En Android el texto seleccionable se pinta con un TextView que recoloca
          // las líneas por su cuenta y pierde o descuadra el justificado. Sin
          // selección se dibuja con el mismo layout justificado con que se midió
          // (igual que en la vista horizontal).
          selectable={!(s.justify && Platform.OS === 'android')}
          // Al justificar, partir palabras evita los huecos grandes entre ellas.
          android_hyphenationFrequency={s.justify ? 'normal' : 'none'}
          style={item.type === 'heading' ? s.heading : s.body}
          accessibilityRole={item.type === 'heading' ? 'header' : 'text'}
        >
          {item.text}
        </Text>
      )}
    </View>
  );

  return (
    <FlatList
      ref={listRef}
      data={items}
      renderItem={renderItem}
      // Re-renderiza las filas visibles cuando cambian los estilos.
      extraData={s}
      style={{ backgroundColor: theme.bg }}
      contentContainerStyle={{ paddingTop: insetTop + 8, paddingBottom: insetBottom + 32, paddingHorizontal: 22 }}
      onScroll={onScroll}
      onScrollBeginDrag={() => {
        goal.current = null;
      }}
      ListFooterComponent={
        loading ? (
          <View style={[styles.column, styles.footer]}>
            <ActivityIndicator color={theme.muted} />
            <Text style={[styles.pageLabel, { color: theme.muted }]}>
              Cargando páginas… {pages.length}/{total}
            </Text>
          </View>
        ) : null
      }
      scrollEventThrottle={16}
      onViewableItemsChanged={onViewableItemsChanged}
      viewabilityConfig={VIEWABILITY}
      onScrollToIndexFailed={({ index, averageItemLength }) => {
        listRef.current?.scrollToOffset({ offset: index * averageItemLength, animated: false });
        setTimeout(() => listRef.current?.scrollToIndex({ index, animated: false }), 100);
      }}
      onTouchStart={(e) => {
        touch.current = { x: e.nativeEvent.pageX, y: e.nativeEvent.pageY, t: Date.now() };
      }}
      onTouchEnd={(e) => {
        const start = touch.current;
        if (!start) return;
        const moved = Math.hypot(e.nativeEvent.pageX - start.x, e.nativeEvent.pageY - start.y);
        if (moved < TAP_SLOP && Date.now() - start.t < TAP_MS) onTap?.();
      }}
      initialNumToRender={20}
      windowSize={11}
    />
  );
}

const styles = StyleSheet.create({
  column: { width: '100%', maxWidth: MAX_WIDTH, alignSelf: 'center' },
  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, marginVertical: 24 },
  pageLabel: { fontSize: 12, letterSpacing: 0.4 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '600', textAlign: 'center' },
  emptyBody: { fontSize: 15, textAlign: 'center', lineHeight: 22, maxWidth: 360 },
  emptyButton: { marginTop: 8, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12 },
});
