// En el navegador los blob: del picker mueren al recargar la página, así que
// los PDFs se guardan en IndexedDB y el índice en localStorage.
const KEY = 'library';
const DB = 'lector-pdf';
const STORE = 'files';

export function loadIndex() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) ?? [];
  } catch {
    return [];
  }
}

export function saveIndex(docs) {
  try {
    localStorage.setItem(KEY, JSON.stringify(docs));
  } catch {
    // Navegación privada o almacenamiento lleno: se usa la lista en memoria.
  }
}

function open() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function run(mode, fn) {
  const db = await open();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const req = fn(tx.objectStore(STORE));
    tx.oncomplete = () => resolve(req.result);
    tx.onerror = () => reject(tx.error);
  });
}

export async function storeFile(id, uri) {
  const blob = await (await fetch(uri)).blob();
  await run('readwrite', (s) => s.put(blob, id));
}

export async function fileUri(id) {
  const blob = await run('readonly', (s) => s.get(id));
  if (!blob) throw new Error('El archivo ya no está en la biblioteca');
  return URL.createObjectURL(blob);
}

export async function removeFile(id) {
  await run('readwrite', (s) => s.delete(id));
}

// Las portadas van en el mismo almacén, con prefijo para no chocar con los ids.
const coverKey = (name) => `cover:${name}`;

export const storeCover = (name, uri) => storeFile(coverKey(name), uri);
export const coverUri = (name) => fileUri(coverKey(name));
export const removeCover = (name) => removeFile(coverKey(name));
