import { useEffect, useMemo, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ActivityIndicator, Animated, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import ContentsSheet from '../../../components/ContentsSheet';
import PdfViewer from '../../../components/PdfViewer';
import ReadingSettings from '../../../components/ReadingSettings';
import ReflowView from '../../../components/ReflowView';
import { IconButton } from '../../../components/ui';
import {
  addBookmark,
  displayName,
  fileUri,
  flushLibrary,
  removeBookmark,
  updateBookmark,
  updateDocument,
  useDocument,
} from '../../../library/library';
import { chapterMarks, contentsList, currentChapter } from '../../../reader/reflowItems';
import { notify } from '../../../reader/notify';
import { useAutoHide } from '../../../reader/useAutoHide';
import { useReaderSettings } from '../../../reader/useReaderSettings';
import { runPython } from '../../../modules/pdf-python/src/PdfPythonModule';

const TOP_BAR = 56;
const BOTTOM_BAR = 64;
const TEXT_BATCH = 6; // páginas por tanda de extracción
const SNIPPET = 140; // caracteres de texto que se guardan con cada marcador

// Primer párrafo (que no sea un título) de una página, para reconocer el marcador.
function snippetOf(paragraphs) {
  const para = paragraphs?.find((p) => !p.heading) ?? paragraphs?.[0];
  return para ? para.text.replace(/\s+/g, ' ').slice(0, SNIPPET) : null;
}

// La biblioteca vuelve a estar debajo en la pila; si se entró por un enlace
// directo (p. ej. recargando la web en /reader/…) no hay a dónde volver.
const goBack = () => (router.canGoBack() ? router.back() : router.replace('/'));

// Solo recibe el id por la ruta: el resto (archivo, última página, modo)
// sale de la biblioteca, que es la fuente de verdad.
export default function Reader() {
  const { id } = useLocalSearchParams();
  const doc = useDocument(id);
  const insets = useSafeAreaInsets();
  const { settings, theme, update, step } = useReaderSettings();
  const chrome = useAutoHide();

  const [uri, setUri] = useState(null);
  const [info, setInfo] = useState(null);
  const [page, setPage] = useState(() => doc?.lastPage ?? 1);
  // 'pdf' (original) | 'text' (texto ajustado, continuo) | 'paged' (texto ajustado en horizontal, por páginas)
  const [mode, setMode] = useState(() => doc?.mode ?? 'pdf');
  const [sheet, setSheet] = useState(null); // 'style' | 'contents' | null
  // Saltos pedidos desde el índice o los marcadores: cada n nuevo es un salto.
  const [jump, setJump] = useState({ page: 1, n: 0 });
  const [text, setText] = useState(null); // { pages, total } del texto extraído
  const [error, setError] = useState(null);

  const textStarted = !!text;
  const textDone = textStarted && text.pages.length >= text.total;
  const textual = mode !== 'pdf';
  // En la vista PDF, continuo o por páginas es un ajuste; en el texto lo decide el modo.
  const pdfPaged = settings.layout === 'paged';

  // Capítulos: del índice del PDF o, si no tiene, de los títulos del texto extraído.
  const textPages = textStarted ? text.pages : null;
  const outline = info?.outline;
  const marks = useMemo(() => chapterMarks(outline, textPages), [outline, textPages]);
  const contents = useMemo(() => contentsList(outline, textPages), [outline, textPages]);
  const chapter = currentChapter(marks, page);

  const bookmarks = doc?.bookmarks ?? [];
  const marked = bookmarks.some((b) => b.page === page);
  const canBookmark = !!uri;

  // Carga el PDF guardado al entrar.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const saved = await fileUri(id);
        if (cancelled) return;
        setUri(saved);
        updateDocument(id, { openedAt: Date.now() });
        const i = await runPython('info', { src: saved });
        if (cancelled) return;
        setInfo(i);
        // Por si el documento tiene ahora menos páginas que la última leída.
        setPage((p) => Math.min(p, i.pages));
        updateDocument(id, { pages: i.pages });
      } catch (e) {
        if (!cancelled) setError(e.message);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  // Guarda la posición mientras se lee.
  useEffect(() => {
    if (uri) updateDocument(id, { lastPage: page, mode });
  }, [id, uri, page, mode]);

  // Al salir del lector, a disco sin esperar al guardado agrupado.
  useEffect(() => flushLibrary, []);

  // Extrae el texto (Python) por tandas al entrar en modo texto: cada tanda que
  // llega cambia `text` y este efecto pide la siguiente.
  useEffect(() => {
    if (!textual || !uri || textDone) return;
    let cancelled = false;
    const start = textStarted ? text.pages.length + 1 : 1;
    runPython('extract_text', { src: uri, start, count: TEXT_BATCH })
      .then((r) => {
        if (cancelled) return;
        setText((t) => ({ total: r.total, pages: [...(t?.pages ?? []), ...r.pages] }));
      })
      .catch((e) => {
        if (cancelled) return;
        notify('No se pudo extraer el texto', e.message);
        setMode('pdf');
      });
    return () => {
      cancelled = true;
    };
  }, [textual, uri, text, textStarted, textDone]);

  const switchMode = (next) => {
    setMode(next);
    chrome.show();
  };

  const goToPage = (target) => {
    setSheet(null);
    setPage(target);
    setJump((j) => ({ page: target, n: j.n + 1 }));
    chrome.show();
  };

  // El fragmento de texto sale del modo texto si ya se extrajo esa página; si
  // no, se pide a Python aparte y se añade cuando llega.
  const toggleBookmark = () => {
    if (!canBookmark) return;
    if (marked) return removeBookmark(id, page);
    const target = page;
    const known = textPages?.find((p) => p.number === target);
    addBookmark(id, {
      page: target,
      chapter: chapter?.title ?? null,
      snippet: known ? snippetOf(known.paragraphs) : null,
    });
    if (!known) {
      runPython('extract_text', { src: uri, start: target, count: 1 })
        .then((r) => {
          const snippet = snippetOf(r.pages[0]?.paragraphs);
          if (snippet) updateBookmark(id, target, { snippet });
        })
        .catch(() => {});
    }
  };

  const topInset = insets.top + TOP_BAR;
  const bottomInset = insets.bottom + BOTTOM_BAR + 16;
  const slide = (distance) => ({
    opacity: chrome.progress,
    transform: [{ translateY: chrome.progress.interpolate({ inputRange: [0, 1], outputRange: [distance, 0] }) }],
  });

  if (!doc || error) {
    return (
      <View style={[styles.center, styles.padded, { backgroundColor: theme.bg }]}>
        <StatusBar style={theme.statusBar} />
        <Ionicons name="alert-circle-outline" size={44} color={theme.muted} />
        <Text style={[styles.title, { color: theme.text }]}>No se pudo abrir el documento</Text>
        <Text style={[styles.subtitle, { color: theme.muted }]}>{error ?? 'Ya no está en la biblioteca.'}</Text>
        <Pressable
          onPress={goBack}
          accessibilityRole="button"
          style={({ pressed }) => [styles.primary, { backgroundColor: theme.accent }, pressed && { opacity: 0.7 }]}
        >
          <Text style={[styles.primaryText, { color: theme.onAccent }]}>Volver a la biblioteca</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.flex, { backgroundColor: textual ? theme.bg : theme.pdfBg }]}>
      <StatusBar style={theme.statusBar} hidden={!chrome.visible} />

      {/* Contenido a pantalla completa; las barras flotan encima. */}
      {!uri ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.accent} />
        </View>
      ) : mode === 'pdf' ? (
        <PdfViewer
          // Cada cambio de paso de página o salto vuelve a montar el visor
          // para que empiece en la página que toca.
          key={`${settings.layout}-${jump.n}`}
          uri={uri}
          style={styles.flex}
          initialPage={page}
          paged={pdfPaged}
          onPageChanged={setPage}
          onTap={chrome.toggle}
          onScrollAway={chrome.hide}
          insetTop={topInset}
          insetBottom={bottomInset}
        />
      ) : textStarted ? (
        <ReflowView
          // Al cambiar entre continuo y horizontal, se vuelve a empezar en la página actual.
          key={mode}
          paged={mode === 'paged'}
          pages={text.pages}
          total={text.total}
          settings={settings}
          theme={theme}
          marks={marks}
          initialPage={page}
          jump={jump}
          insetTop={topInset}
          insetBottom={bottomInset}
          safeTop={insets.top}
          safeBottom={insets.bottom}
          onScroll={chrome.onScroll}
          onTap={chrome.toggle}
          onTurn={chrome.hide}
          onPageVisible={setPage}
          onBackToPdf={() => switchMode('pdf')}
        />
      ) : (
        <View style={[styles.center, { backgroundColor: theme.bg }]}>
          <ActivityIndicator size="large" color={theme.accent} />
          <Text style={{ color: theme.muted }}>Extrayendo texto…</Text>
        </View>
      )}

      {/* Barra superior: volver + documento + cambio de modo */}
      <Animated.View
        pointerEvents={chrome.visible ? 'auto' : 'none'}
        style={[
          styles.topBar,
          { paddingTop: insets.top, backgroundColor: theme.surface, borderColor: theme.border },
          slide(-(TOP_BAR + insets.top)),
        ]}
      >
        <IconButton icon="arrow-back" label="Volver a la biblioteca" onPress={goBack} theme={theme} />
        <View style={styles.titleBlock}>
          <Text style={[styles.fileName, { color: theme.text }]} numberOfLines={1}>
            {displayName(doc)}
          </Text>
          <Text style={[styles.meta, { color: theme.muted }]} numberOfLines={1}>
            Página {page} de {info?.pages ?? '…'}
            {chapter ? ` · ${chapter.title}` : ''}
          </Text>
        </View>
        <IconButton
          icon={marked ? 'bookmark' : 'bookmark-outline'}
          label={marked ? 'Quitar marcador' : 'Marcar esta página'}
          onPress={toggleBookmark}
          theme={theme}
          disabled={!canBookmark}
        />
        <View style={[styles.segment, { borderColor: theme.border }]} accessibilityRole="tablist">
          <IconButton
            icon="document-outline"
            label="Vista PDF original"
            active={mode === 'pdf'}
            onPress={() => switchMode('pdf')}
            theme={theme}
          />
          <IconButton
            icon="reader-outline"
            label="Vista texto ajustado"
            active={mode === 'text'}
            onPress={() => switchMode('text')}
            theme={theme}
          />
          <IconButton
            icon="book-outline"
            label="Vista horizontal por páginas"
            active={mode === 'paged'}
            onPress={() => switchMode('paged')}
            theme={theme}
          />
        </View>
      </Animated.View>

      {/* Barra inferior flotante: acciones */}
      <Animated.View
        pointerEvents={chrome.visible ? 'box-none' : 'none'}
        style={[styles.bottomWrap, { bottom: insets.bottom + 12 }, slide(BOTTOM_BAR + insets.bottom + 12)]}
      >
        <View style={[styles.bottomBar, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <IconButton icon="list-outline" label="Índice" showLabel onPress={() => setSheet('contents')} theme={theme} />
          <IconButton
            icon={textual ? 'text' : 'options-outline'}
            label={textual ? 'Estilo' : 'Vista'}
            showLabel
            onPress={() => setSheet('style')}
            theme={theme}
          />
        </View>
      </Animated.View>

      <ReadingSettings
        visible={sheet === 'style'}
        onClose={() => setSheet(null)}
        settings={settings}
        theme={theme}
        update={update}
        step={step}
        mode={mode}
      />
      <ContentsSheet
        visible={sheet === 'contents'}
        onClose={() => setSheet(null)}
        theme={theme}
        contents={contents}
        chapter={chapter}
        bookmarks={bookmarks}
        page={page}
        marked={marked}
        canBookmark={canBookmark}
        fromText={!outline?.length}
        onGo={goToPage}
        onAddBookmark={toggleBookmark}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  padded: { padding: 32 },
  title: { fontSize: 20, fontWeight: '700', textAlign: 'center' },
  subtitle: { fontSize: 15, textAlign: 'center', marginBottom: 12 },
  primary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 14,
  },
  primaryText: { fontSize: 16, fontWeight: '600' },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    minHeight: TOP_BAR,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  titleBlock: { flex: 1, paddingHorizontal: 4 },
  fileName: { fontSize: 15, fontWeight: '600' },
  meta: { fontSize: 12 },
  segment: { flexDirection: 'row', borderWidth: 1, borderRadius: 24, padding: 2, gap: 2 },
  bottomWrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: BOTTOM_BAR,
    paddingHorizontal: 8,
    gap: 4,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    ...Platform.select({ web: { boxShadow: '0 4px 20px rgba(0,0,0,0.12)' }, default: { elevation: 6 } }),
  },
});
