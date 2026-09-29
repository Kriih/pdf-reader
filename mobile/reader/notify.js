import { Alert, Platform } from 'react-native';

// Alert.alert no hace nada en react-native-web; en el navegador usamos window.alert.
export function notify(title, message) {
  if (Platform.OS === 'web') window.alert(`${title}\n\n${message}`);
  else Alert.alert(title, message);
}

// Pregunta con varias opciones [{ text, value, style }]; resuelve con el value
// elegido, o null si se cancela. En el navegador, window.confirm solo tiene
// Aceptar/Cancelar, así que se pregunta opción por opción.
export function ask(title, message, options) {
  if (Platform.OS === 'web') {
    for (const o of options.filter((o) => o.style !== 'cancel')) {
      if (window.confirm(`${title}\n\n${message}\n\n¿${o.text}?`)) return Promise.resolve(o.value);
    }
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    Alert.alert(
      title,
      message,
      options.map((o) => ({ text: o.text, style: o.style, onPress: () => resolve(o.value ?? null) })),
      { cancelable: true, onDismiss: () => resolve(null) },
    );
  });
}
