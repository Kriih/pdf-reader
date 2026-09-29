import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ReaderSettingsProvider, useReaderSettings } from '../../reader/useReaderSettings';

// Pila: Biblioteca (/) → Lector (/reader/[id]) o Configuración (/settings).
// Todas pintan su propia barra, así que se oculta la cabecera nativa.
function ThemedStack() {
  const { theme } = useReaderSettings();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.bg },
        // El documento "sube" desde la lista y al volver baja: se entiende como
        // abrir y cerrar un documento, no como ir a otra sección de la app.
        animation: 'fade_from_bottom',
      }}
    >
      {/* Configuración es otra sección, no un documento: entra desde el lado. */}
      <Stack.Screen name="settings" options={{ animation: 'slide_from_right' }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ReaderSettingsProvider>
        <ThemedStack />
      </ReaderSettingsProvider>
    </SafeAreaProvider>
  );
}
