import { Directory, File, Paths } from 'expo-file-system';

// Almacenamiento de la biblioteca en el móvil (versión web: libraryStore.web.js).
// - library.json: índice con los metadatos y el progreso de cada documento.
// - library/<id>.pdf: copia propia del PDF. El picker deja el archivo en la
//   caché (Android puede borrarla) y los content:// no sobreviven a un reinicio,
//   así que la biblioteca guarda su propia copia en el almacenamiento de la app.
const indexFile = () => new File(Paths.document, 'library.json');
const filesDir = () => new Directory(Paths.document, 'library');
const pdfFile = (id) => new File(filesDir(), `${id}.pdf`);
const coversDir = () => new Directory(filesDir(), 'covers');
const coverFile = (name) => new File(coversDir(), name);

export function loadIndex() {
  try {
    const f = indexFile();
    return f.exists ? JSON.parse(f.textSync()) : [];
  } catch {
    return [];
  }
}

export function saveIndex(docs) {
  try {
    indexFile().write(JSON.stringify(docs));
  } catch {
    // Si no se puede guardar, la biblioteca sigue funcionando en memoria.
  }
}

// Copia el PDF elegido en el picker a la biblioteca.
export async function storeFile(id, uri) {
  const dir = filesDir();
  if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
  new File(uri).copySync(pdfFile(id), { overwrite: true });
}

export async function fileUri(id) {
  const f = pdfFile(id);
  if (!f.exists) throw new Error('El archivo ya no está en la biblioteca');
  return f.uri;
}

export async function removeFile(id) {
  const f = pdfFile(id);
  if (f.exists) f.delete();
}

// Portadas elegidas de la galería: library/covers/<nombre>.
export async function storeCover(name, uri) {
  const dir = coversDir();
  if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
  new File(uri).copySync(coverFile(name), { overwrite: true });
}

export async function coverUri(name) {
  return coverFile(name).uri;
}

export async function removeCover(name) {
  const f = coverFile(name);
  if (f.exists) f.delete();
}
