import Constants from 'expo-constants';
import { Directory, File, Paths } from 'expo-file-system';
import * as IntentLauncher from 'expo-intent-launcher';
import { Linking, Platform } from 'react-native';

// Actualizaciones desde las releases de GitHub: se busca la última release,
// se compara su etiqueta (v1.2.3) con la versión instalada y, si es más nueva,
// se descarga su APK y se abre el instalador de Android.
export const REPO = 'Kriih/pdf-reader';
const LATEST = `https://api.github.com/repos/${REPO}/releases/latest`;

// version de app.json, embebida al compilar.
export const currentVersion = Constants.expoConfig?.version ?? '0.0.0';

// Solo Android puede instalar el APK; en la web se abre la página de la release.
export const canInstall = Platform.OS === 'android';

const parse = (v) =>
  String(v)
    .replace(/^v/i, '')
    .split(/[.-]/)
    .slice(0, 3)
    .map((n) => parseInt(n, 10) || 0);

export function isNewer(candidate, installed) {
  const a = parse(candidate);
  const b = parse(installed);
  for (let i = 0; i < 3; i++) if (a[i] !== b[i]) return a[i] > b[i];
  return false;
}

// { available, version, notes, url, size, page }
export async function checkForUpdate() {
  let res;
  try {
    res = await fetch(LATEST, { headers: { Accept: 'application/vnd.github+json' } });
  } catch {
    throw new Error('Sin conexión con GitHub. Comprueba tu conexión a internet.');
  }
  if (res.status === 404) return { available: false, version: null }; // aún no hay releases
  if (res.status === 403) throw new Error('GitHub limita las consultas: prueba de nuevo en un rato.');
  if (!res.ok) throw new Error(`GitHub respondió con el error ${res.status}.`);
  const release = await res.json();
  const apk = release.assets?.find((a) => a.name.toLowerCase().endsWith('.apk'));
  const version = release.tag_name.replace(/^v/i, '');
  return {
    available: !!apk && isNewer(version, currentVersion),
    version,
    notes: release.body ?? '',
    url: apk?.browser_download_url ?? null,
    size: apk?.size ?? null,
    page: release.html_url,
  };
}

// Descarga el APK a la caché y abre el instalador. onProgress recibe 0..1
// (o null si GitHub no da el tamaño).
export async function downloadAndInstall(update, onProgress) {
  if (!canInstall) return Linking.openURL(update.page);

  // Solo se guarda el último APK descargado.
  const dir = new Directory(Paths.cache, 'updates');
  if (dir.exists) dir.delete();
  dir.create({ intermediates: true, idempotent: true });

  const file = await File.downloadFileAsync(update.url, new File(dir, `lector-pdf-${update.version}.apk`), {
    idempotent: true,
    onProgress: ({ bytesWritten, totalBytes }) => onProgress?.(totalBytes > 0 ? bytesWritten / totalBytes : null),
  });

  // content:// con permiso de lectura para el instalador (FLAG_GRANT_READ_URI_PERMISSION).
  await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
    data: file.contentUri,
    type: 'application/vnd.android.package-archive',
    flags: 1,
  });
}

export const openReleasePage = (update) =>
  Linking.openURL(update?.page ?? `https://github.com/${REPO}/releases/latest`);
