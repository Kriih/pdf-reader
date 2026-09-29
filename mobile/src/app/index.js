import { useMemo, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ActivityIndicator, FlatList, Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import DocumentCard from '../../components/DocumentCard';
import DocumentOptions from '../../components/DocumentOptions';
import DocumentRow from '../../components/DocumentRow';
import { IconButton } from '../../components/ui';
import { importPdfs, pickPdfs, useLibrary } from '../../library/library';
import { notify } from '../../reader/notify';
import { useReaderSettings } from '../../reader/useReaderSettings';

const MAX_WIDTH = 680;
// Cuadrícula: tantas columnas como quepan con portadas de al menos MIN_CARD
// de ancho (dos en un móvil), hasta GRID_MAX de ancho total.
const GRID_MAX = 1040;
const GRID_PAD = 16;
const GRID_GAP = 16;
const MIN_CARD = 140;

const openReader = (id) => router.push({ pathname: '/reader/[id]', params: { id } });
const openSettings = () => router.push('/settings');

// Pantalla principal: documentos guardados, del último leído al más antiguo.
export default function Library() {
  const insets = useSafeAreaInsets();
  const { settings, theme } = useReaderSettings();
  const { width } = useWindowDimensions();
  const docs = useLibrary();
  const [busy, setBusy] = useState(false);
  // Por id: así el panel refleja al momento el nombre o la portada nuevos.
  const [optionsId, setOptionsId] = useState(null);
  const optionsDoc = docs.find((d) => d.id === optionsId) ?? null;

  const sorted = useMemo(
    () => [...docs].sort((a, b) => (b.openedAt ?? b.addedAt) - (a.openedAt ?? a.addedAt)),
    [docs],
  );

  // Con un solo PDF se abre directamente (es lo que el usuario quiere leer);
  // con varios se quedan en la lista.
  async function onImport() {
    try {
      const assets = await pickPdfs(true);
      if (!assets.length) return;
      setBusy(true);
      const ids = await importPdfs(assets);
      if (ids.length === 1) openReader(ids[0]);
    } catch (e) {
      notify('No se pudo importar', e.message);
    } finally {
      setBusy(false);
    }
  }

  const empty = docs.length === 0;
  const grid = settings.libraryView === 'grid';
  const gridWidth = Math.min(width, GRID_MAX);
  const inner = gridWidth - 2 * GRID_PAD;
  const columns = Math.max(2, Math.floor((inner + GRID_GAP) / (MIN_CARD + GRID_GAP)));
  const cardWidth = Math.floor((inner - GRID_GAP * (columns - 1)) / columns);
  const bottomSpace = insets.bottom + 112; // hueco para que el botón flotante no tape lo último

  return (
    <View style={[styles.flex, { backgroundColor: theme.bg }]}>
      <StatusBar style={theme.statusBar} />

      {empty ? (
        <View style={[styles.empty, { paddingTop: insets.top }]}>
          <View style={[styles.cornerButton, { top: insets.top + 8 }]}>
            <IconButton icon="settings-outline" label="Configuración" onPress={openSettings} theme={theme} />
          </View>
          <View style={[styles.emptyIcon, { backgroundColor: theme.pdfBg }]}>
            <Ionicons name="library-outline" size={44} color={theme.accent} />
          </View>
          <Text style={[styles.emptyTitle, { color: theme.text }]}>Tu biblioteca está vacía</Text>
          <Text style={[styles.emptyBody, { color: theme.muted }]}>
            Importa un PDF para empezar a leer. Recordaremos la página en la que te quedes.
          </Text>
          <Pressable
            onPress={onImport}
            disabled={busy}
            accessibilityRole="button"
            style={({ pressed }) => [styles.primary, { backgroundColor: theme.accent }, pressed && { opacity: 0.7 }]}
          >
            <Ionicons name="add" size={22} color={theme.onAccent} />
            <Text style={[styles.primaryText, { color: theme.onAccent }]}>Importar PDF</Text>
          </Pressable>
          <Text style={[styles.hint, { color: theme.muted }]}>Se guarda una copia en la app: funciona sin conexión.</Text>
        </View>
      ) : (
        <FlatList
          // Cambiar el número de columnas exige montar la lista de nuevo.
          key={grid ? `grid-${columns}` : 'list'}
          data={sorted}
          keyExtractor={(d) => d.id}
          numColumns={grid ? columns : 1}
          columnWrapperStyle={grid ? { gap: GRID_GAP } : undefined}
          ItemSeparatorComponent={grid ? GridSpacer : undefined}
          renderItem={({ item }) =>
            grid ? (
              <DocumentCard
                doc={item}
                theme={theme}
                width={cardWidth}
                onOpen={() => openReader(item.id)}
                onMore={() => setOptionsId(item.id)}
              />
            ) : (
              <View style={styles.column}>
                <DocumentRow
                  doc={item}
                  theme={theme}
                  onOpen={() => openReader(item.id)}
                  onMore={() => setOptionsId(item.id)}
                />
              </View>
            )
          }
          ListHeaderComponent={
            <View style={[styles.header, grid ? styles.gridHeader : styles.column]}>
              <View style={styles.flex}>
                <Text style={[styles.heading, { color: theme.text }]} accessibilityRole="header">
                  Biblioteca
                </Text>
                <Text style={[styles.count, { color: theme.muted }]}>
                  {docs.length === 1 ? '1 documento' : `${docs.length} documentos`}
                </Text>
              </View>
              <IconButton icon="settings-outline" label="Configuración" onPress={openSettings} theme={theme} />
            </View>
          }
          contentContainerStyle={[
            { paddingTop: insets.top + 8, paddingBottom: bottomSpace },
            grid ? [styles.gridContent, { width: gridWidth }] : styles.listContent,
          ]}
        />
      )}

      {!empty && (
        <Pressable
          onPress={onImport}
          disabled={busy}
          accessibilityRole="button"
          accessibilityLabel="Importar PDF"
          style={({ pressed }) => [
            styles.fab,
            { backgroundColor: theme.accent, bottom: insets.bottom + 20 },
            pressed && { opacity: 0.8 },
          ]}
        >
          <Ionicons name="add" size={24} color={theme.onAccent} />
          <Text style={[styles.primaryText, { color: theme.onAccent }]}>Importar</Text>
        </Pressable>
      )}

      <DocumentOptions doc={optionsDoc} theme={theme} onClose={() => setOptionsId(null)} />

      {busy && (
        <View style={styles.overlay}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.overlayText}>Guardando en la biblioteca…</Text>
        </View>
      )}
    </View>
  );
}

const GridSpacer = () => <View style={styles.gridSpacer} />;

const styles = StyleSheet.create({
  flex: { flex: 1 },
  column: { width: '100%', maxWidth: MAX_WIDTH, alignSelf: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', paddingLeft: 16, paddingRight: 4, paddingTop: 16, paddingBottom: 12 },
  heading: { fontSize: 30, fontWeight: '700' },
  count: { fontSize: 14, marginTop: 2 },
  // En la cuadrícula el título se alinea con las portadas.
  gridHeader: { paddingLeft: 0, paddingRight: 0 },
  gridSpacer: { height: 20 },
  gridContent: { paddingHorizontal: GRID_PAD, alignSelf: 'center' },
  listContent: { paddingHorizontal: 8 },
  cornerButton: { position: 'absolute', right: 12 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 32 },
  emptyIcon: { width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  emptyTitle: { fontSize: 22, fontWeight: '700', textAlign: 'center' },
  emptyBody: { fontSize: 15, lineHeight: 22, textAlign: 'center', maxWidth: 320, marginBottom: 16 },
  hint: { fontSize: 12, textAlign: 'center', marginTop: 8 },
  primary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 14,
  },
  primaryText: { fontSize: 16, fontWeight: '600' },
  fab: {
    position: 'absolute',
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 56,
    paddingLeft: 18,
    paddingRight: 22,
    borderRadius: 28,
    ...Platform.select({ web: { boxShadow: '0 6px 20px rgba(0,0,0,0.18)' }, default: { elevation: 6 } }),
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    gap: 12,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlayText: { color: '#fff', fontSize: 15 },
});
