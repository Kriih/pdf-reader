import { useEffect, useReducer, useSyncExternalStore } from 'react';
import { AppState } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';

import { runPython } from '../modules/pdf-python/src/PdfPythonModule';
import {
  coverUri,
  fileUri,
  loadIndex,
  removeCover,
  removeFile,
  saveIndex,
  storeCover,
  storeFile,
} from './libraryStore';

// Estado único de la biblioteca, compartido por todas las pantallas: la
// biblioteca muestra el progreso que el lector va guardando sin recargar nada.
//
// Documento: { id, name, title, cover, size, pages, addedAt, openedAt, lastPage, mode, bookmarks }
// `name` es el nombre del archivo; `title`, el que pone el usuario al renombrar.
let docs = loadIndex();
const listeners = new Set();

// El progreso cambia con cada página: se escribe en disco agrupado y, por si
// la app se cierra, también al pasar a segundo plano y al salir del lector.
const SAVE_DELAY = 800;
let saveTimer = null;

export function flushLibrary() {
  if (!saveTimer) return;
  clearTimeout(saveTimer);
  saveTimer = null;
  saveIndex(docs);
}

AppState.addEventListener('change', (state) => {
  if (state !== 'active') flushLibrary();
});

function commit(next) {
  docs = next;
  listeners.forEach((l) => l());
  clearTimeout(saveTimer);
  saveTimer = setTimeout(flushLibrary, SAVE_DELAY);
}

const subscribe = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export function useLibrary() {
  return useSyncExternalStore(subscribe, () => docs);
}

export function useDocument(id) {
  return useSyncExternalStore(subscribe, () => docs.find((d) => d.id === id));
}

export function updateDocument(id, patch) {
  const doc = docs.find((d) => d.id === id);
  if (!doc || Object.keys(patch).every((k) => doc[k] === patch[k])) return;
  commit(docs.map((d) => (d.id === id ? { ...d, ...patch } : d)));
}

export async function pickPdfs(multiple = false) {
  const res = await DocumentPicker.getDocumentAsync({
    type: 'application/pdf',
    copyToCacheDirectory: true,
    multiple,
  });
  return res.canceled ? [] : res.assets;
}

const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

// Añade los PDFs elegidos y devuelve sus ids. Si un archivo ya estaba (mismo
// nombre y tamaño) no se duplica: se devuelve el existente.
export async function importPdfs(assets) {
  const ids = [];
  const added = [];
  for (const asset of assets) {
    const existing = docs.find((d) => d.name === asset.name && d.size === asset.size);
    if (existing) {
      ids.push(existing.id);
      continue;
    }
    const id = newId();
    await storeFile(id, asset.uri);
    let pages = null;
    try {
      pages = (await runPython('info', { src: asset.uri })).pages;
    } catch {
      // El lector lo vuelve a pedir al abrirlo.
    }
    added.push({
      id,
      name: asset.name,
      size: asset.size ?? null,
      pages,
      addedAt: Date.now(),
      openedAt: null,
      lastPage: 1,
      mode: 'pdf',
    });
    ids.push(id);
  }
  if (added.length) commit([...added, ...docs]);
  return ids;
}

export async function removeDocument(id) {
  const doc = docs.find((d) => d.id === id);
  commit(docs.filter((d) => d.id !== id));
  flushLibrary();
  await removeFile(id);
  if (doc?.cover) await removeCover(doc.cover);
}

// Marcadores del documento: [{ page, chapter, snippet, createdAt }], por página.
export function addBookmark(id, bookmark) {
  const doc = docs.find((d) => d.id === id);
  if (!doc || doc.bookmarks?.some((b) => b.page === bookmark.page)) return;
  const bookmarks = [...(doc.bookmarks ?? []), { ...bookmark, createdAt: Date.now() }].sort((a, b) => a.page - b.page);
  updateDocument(id, { bookmarks });
  flushLibrary();
}

export function updateBookmark(id, page, patch) {
  const doc = docs.find((d) => d.id === id);
  if (!doc?.bookmarks) return;
  updateDocument(id, { bookmarks: doc.bookmarks.map((b) => (b.page === page ? { ...b, ...patch } : b)) });
  flushLibrary();
}

export function removeBookmark(id, page) {
  const doc = docs.find((d) => d.id === id);
  if (!doc?.bookmarks) return;
  updateDocument(id, { bookmarks: doc.bookmarks.filter((b) => b.page !== page) });
  flushLibrary();
}

export const displayName = (doc) => doc.title || doc.name.replace(/\.pdf$/i, '');

// Un título vacío vuelve al nombre del archivo.
export function renameDocument(id, title) {
  updateDocument(id, { title: title.trim() || null });
  flushLibrary();
}

// Galería del sistema (no pide permisos); recorte con la proporción de un folio.
export async function pickCoverImage() {
  const res = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [5, 7],
    quality: 0.7,
  });
  return res.canceled ? null : res.assets[0].uri;
}

// `uri` null quita la portada. Cada portada lleva un nombre nuevo para que
// <Image> no siga mostrando la anterior desde su caché.
export async function setCover(id, uri) {
  const old = docs.find((d) => d.id === id)?.cover;
  const cover = uri ? `${id}-${Date.now()}.jpg` : null;
  if (cover) await storeCover(cover, uri);
  updateDocument(id, { cover });
  flushLibrary();
  if (old) await removeCover(old).catch(() => {});
}

// En web la portada sale de IndexedDB (asíncrono): se resuelve una vez y se
// guarda en caché para que la lista no parpadee al volver a pintarse.
const coverCache = new Map();

export function useCover(name) {
  const [, rerender] = useReducer((n) => n + 1, 0);
  useEffect(() => {
    if (!name || coverCache.has(name)) return;
    let cancelled = false;
    coverUri(name)
      .then((uri) => {
        coverCache.set(name, uri);
        if (!cancelled) rerender();
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [name]);
  return (name && coverCache.get(name)) || null;
}

export { fileUri };
