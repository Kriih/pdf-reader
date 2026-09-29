const KEY = 'reader-settings';

export function loadSettings() {
  try {
    return JSON.parse(localStorage.getItem(KEY));
  } catch {
    return null;
  }
}

export function saveSettings(settings) {
  try {
    localStorage.setItem(KEY, JSON.stringify(settings));
  } catch {
    // Navegación privada o almacenamiento bloqueado: se usan los valores en memoria.
  }
}
