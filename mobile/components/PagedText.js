import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { paginate } from '../reader/paginate';
import ChapterBreak from './ChapterBreak';
import TextMeasurer from './TextMeasurer';

const MAX_WIDTH = 680;
const SIDE = 24;
const TOP = 28; // bajo la barra de estado
const FOOTER = 40; // capítulo y número de página
const MEASURE_BATCH = 60; // bloques medidos por tanda: la primera página sale enseguida
const EDGE = 0.3; // toques en el 30 % de cada lado pasan de página
const VIEWABILITY = { itemVisiblePercentThreshold: 60 };

const textOf = (it) => it.title ?? it.text;
const needsMeasure = (it) => it.type !== 'chapter' || !!it.title;

// Modo "por páginas" del texto ajustado: el texto se reparte en páginas del
// tamaño de la pantalla y se pasa de una a otra en horizontal, como en un e-reader.
export default function PagedText({
  items,
  loading,
  s,
  theme,
  initialPage,
  jump,
  safeTop,
  safeBottom,
  chapterAt,
  onTap,
  onTurn,
  onPageVisible,
}) {
  const listRef = useRef(null);
  const [size, setSize] = useState(null);
  const width = size ? Math.min(size.width - SIDE * 2, MAX_WIDTH) : 0;
  const pageHeight = size ? size.height - safeTop - TOP - safeBottom - FOOTER : 0;

  // Las medidas valen para un ancho y unos estilos; si cambian, se mide de
  // nuevo. Cada medida guarda su texto: si un párrafo cambia (se une con la
  // página siguiente), se vuelve a medir.
  const sig = `${width}|${JSON.stringify([s.body, s.heading, s.chapterTitle])}`;
  const [measured, setMeasured] = useState({ sig, map: new Map() });
  if (measured.sig !== sig) setMeasured({ sig, map: new Map() });

  const linesFor = useCallback(
    (it) => {
      if (!needsMeasure(it)) return [];
      const m = measured.map.get(it.key);
      return m && m.text === textOf(it) ? m.lines : undefined;
    },
    [measured],
  );

  const pending = useMemo(
    () => (width > 0 ? items.filter((it) => !linesFor(it)).slice(0, MEASURE_BATCH) : []),
    [items, linesFor, width],
  );
  const styleFor = useCallback(
    (it) => (it.type === 'chapter' ? s.chapterTitle : it.type === 'heading' ? s.heading : s.body),
    [s],
  );
  const onMeasured = useCallback(
    (results) => setMeasured((m) => (m.sig === sig ? { sig, map: new Map([...m.map, ...results]) } : m)),
    [sig],
  );

  const { pages, complete } = useMemo(
    () => (pageHeight > 0 ? paginate(items, linesFor, s, pageHeight) : { pages: [], complete: false }),
    [items, linesFor, s, pageHeight],
  );
  const finished = complete && !loading;

  // Ir a una página del PDF: al abrir, desde el índice o al cambiar el estilo
  // (se vuelve a la misma página aunque ahora ocupe otras pantallas).
  const current = useRef(null); // página del PDF que se está viendo
  const goal = useRef(initialPage);
  const seenJump = useRef(jump.n);
  useEffect(() => {
    if (jump.n === seenJump.current) return;
    seenJump.current = jump.n;
    goal.current = jump.page;
  }, [jump]);
  useEffect(() => {
    if (current.current) goal.current = current.current;
  }, [sig]);
  useEffect(() => {
    if (goal.current == null || !pages.length) return;
    let index = pages.findIndex((p) => p.end >= goal.current);
    if (index < 0) {
      if (!finished) return; // aún no se ha paginado hasta ahí
      index = pages.length - 1;
    }
    goal.current = null;
    const t = setTimeout(() => listRef.current?.scrollToIndex({ index, animated: false }), 0);
    return () => clearTimeout(t);
  }, [pages, finished, jump, sig]);

  // FlatList exige que onViewableItemsChanged no cambie; los callbacks del padre sí cambian.
  const callbacks = useRef({ onPageVisible, onTurn });
  useEffect(() => {
    callbacks.current = { onPageVisible, onTurn };
  });
  const index = useRef(0);
  const onViewableItemsChanged = useCallback(({ viewableItems }) => {
    const first = viewableItems[0];
    if (!first) return;
    current.current = first.item.number;
    callbacks.current.onPageVisible(first.item.number);
    if (first.index !== index.current) callbacks.current.onTurn();
    index.current = first.index;
  }, []);

  const turn = (delta) => {
    const next = Math.min(pages.length - 1, Math.max(0, index.current + delta));
    listRef.current?.scrollToIndex({ index: next, animated: true });
  };

  const onPress = (e) => {
    const x = e.nativeEvent.pageX ?? e.nativeEvent.locationX;
    if (x < size.width * EDGE) turn(-1);
    else if (x > size.width * (1 - EDGE)) turn(1);
    else onTap();
  };

  const renderPage = ({ item: page, index: i }) => (
    <Pressable onPress={onPress} style={{ width: size.width, height: size.height }}>
      <View style={[styles.column, { top: safeTop + TOP, width, height: pageHeight, left: (size.width - width) / 2 }]}>
        {page.blocks.map((b) =>
          b.type === 'chapter' ? (
            <ChapterBreak key={b.key} title={b.title} s={s} theme={theme} />
          ) : (
            <Text
              key={b.key}
              textBreakStrategy="simple"
              android_hyphenationFrequency="none"
              style={[b.type === 'heading' ? s.heading : s.body, b.flush && styles.flush, b.split && styles.split]}
              accessibilityRole={b.type === 'heading' ? 'header' : 'text'}
            >
              {b.text}
            </Text>
          ),
        )}
      </View>
      <View style={[styles.footer, { bottom: safeBottom + 12, left: SIDE, right: SIDE }]}>
        <Text style={[styles.footerText, styles.flex, { color: theme.muted }]} numberOfLines={1}>
          {chapterAt(page.number)?.title ?? ''}
        </Text>
        <Text style={[styles.footerText, { color: theme.muted }]}>
          {i + 1} / {finished ? pages.length : '…'}
        </Text>
      </View>
    </Pressable>
  );

  const ready = size && pages.length > 0 && pages[0].blocks.length > 0;

  return (
    <View style={[styles.flex, { backgroundColor: theme.bg }]} onLayout={(e) => setSize(e.nativeEvent.layout)}>
      {pending.length > 0 && (
        <TextMeasurer
          // Una tanda nueva (o un texto cambiado) vuelve a montar el medidor desde cero.
          key={`${sig}|${pending.map((p) => `${p.key}:${textOf(p).length}`).join(',')}`}
          items={pending}
          width={width}
          styleFor={styleFor}
          onMeasured={onMeasured}
        />
      )}
      {ready ? (
        <FlatList
          ref={listRef}
          data={pages}
          keyExtractor={(p) => p.key}
          renderItem={renderPage}
          extraData={[s, finished, size, chapterAt]}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          getItemLayout={(_, i) => ({ length: size.width, offset: size.width * i, index: i })}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={VIEWABILITY}
          onScrollBeginDrag={() => {
            goal.current = null;
          }}
          onScrollToIndexFailed={({ index: i }) =>
            setTimeout(() => listRef.current?.scrollToIndex({ index: i, animated: false }), 50)
          }
          initialNumToRender={2}
          windowSize={5}
        />
      ) : (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.accent} />
          <Text style={{ color: theme.muted }}>Preparando páginas…</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  column: { position: 'absolute', overflow: 'hidden' },
  flush: { marginTop: 0 },
  split: { marginBottom: 0 },
  footer: { position: 'absolute', flexDirection: 'row', gap: 16 },
  footerText: { fontSize: 12, fontVariant: ['tabular-nums'] },
});
