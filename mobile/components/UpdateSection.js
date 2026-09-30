import { useState } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { canInstall, checkForUpdate, currentVersion, downloadAndInstall, openReleasePage } from '../updates/updates';
import { Section } from './ui';

const MB = 1024 * 1024;

// "Actualizaciones" en Configuración. Estados: idle → checking → latest | available
// → downloading → (instalador de Android); error en cualquier paso.
export default function UpdateSection({ theme }) {
  const [state, setState] = useState({ step: 'idle' });

  const check = async () => {
    setState({ step: 'checking' });
    try {
      const update = await checkForUpdate();
      setState(update.available ? { step: 'available', update } : { step: 'latest', update });
    } catch (e) {
      setState({ step: 'error', message: e.message });
    }
  };

  const install = async (update) => {
    setState({ step: 'downloading', update, progress: 0 });
    try {
      await downloadAndInstall(update, (progress) => setState((s) => ({ ...s, progress })));
      // El instalador ya está abierto; si el usuario lo cancela vuelve aquí.
      setState({ step: 'available', update });
    } catch (e) {
      setState({ step: 'error', update, message: e.message });
    }
  };

  const { step, update } = state;

  return (
    <Section label="Actualizaciones" theme={theme}>
      <View style={[styles.card, { borderColor: theme.border }]}>
        <Text style={[styles.version, { color: theme.text }]}>Versión instalada: {currentVersion}</Text>

        {step === 'checking' && (
          <View style={styles.status}>
            <ActivityIndicator color={theme.accent} />
            <Text style={[styles.message, { color: theme.muted }]}>Buscando en GitHub…</Text>
          </View>
        )}

        {step === 'latest' && (
          <View style={styles.status}>
            <Ionicons name="checkmark-circle" size={20} color={theme.accent} />
            <Text style={[styles.message, { color: theme.text }]}>
              {update?.version ? 'Tienes la última versión.' : 'Todavía no hay versiones publicadas.'}
            </Text>
          </View>
        )}

        {(step === 'available' || step === 'downloading') && (
          <View style={styles.block}>
            <View style={styles.status}>
              <Ionicons name="arrow-up-circle" size={20} color={theme.accent} />
              <Text style={[styles.message, styles.bold, { color: theme.text }]}>
                Nueva versión {update.version} disponible
              </Text>
            </View>
            {update.notes ? (
              <Text style={[styles.notes, { color: theme.muted }]} numberOfLines={6}>
                {update.notes.replace(/[#*`]/g, '').trim()}
              </Text>
            ) : null}
          </View>
        )}

        {step === 'downloading' && (
          <View style={styles.block}>
            <View style={[styles.track, { backgroundColor: theme.border }]}>
              <View
                style={[
                  styles.fill,
                  { backgroundColor: theme.accent, width: `${Math.round((state.progress ?? 0) * 100)}%` },
                ]}
              />
            </View>
            <Text style={[styles.message, { color: theme.muted }]}>
              Descargando… {state.progress != null ? `${Math.round(state.progress * 100)} %` : ''}
            </Text>
          </View>
        )}

        {step === 'error' && (
          <View style={styles.status}>
            <Ionicons name="alert-circle" size={20} color="#dc2626" />
            <Text style={[styles.message, { color: theme.text }]}>{state.message}</Text>
          </View>
        )}

        {step === 'available' ? (
          <>
            <Button
              icon={canInstall ? 'download-outline' : 'open-outline'}
              label={
                canInstall
                  ? `Descargar e instalar${update.size ? ` (${Math.round(update.size / MB)} MB)` : ''}`
                  : 'Abrir la versión en GitHub'
              }
              onPress={() => install(update)}
              theme={theme}
              primary
            />
            {canInstall && (
              <Text style={[styles.hint, { color: theme.muted }]}>
                Android te pedirá permiso para instalar apps desde Lector PDF la primera vez. Tu biblioteca se conserva.
              </Text>
            )}
          </>
        ) : step === 'error' && update ? (
          <Button
            icon="open-outline"
            label="Descargar desde GitHub"
            onPress={() => openReleasePage(update)}
            theme={theme}
          />
        ) : step !== 'downloading' ? (
          <Button
            icon="refresh-outline"
            label="Buscar actualizaciones"
            onPress={check}
            theme={theme}
            disabled={step === 'checking'}
          />
        ) : null}
      </View>
    </Section>
  );
}

function Button({ icon, label, onPress, theme, primary, disabled }) {
  const color = primary ? theme.onAccent : theme.text;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      style={({ pressed }) => [
        styles.button,
        primary ? { backgroundColor: theme.accent, borderColor: theme.accent } : { borderColor: theme.border },
        (pressed || disabled) && { opacity: 0.6 },
      ]}
    >
      <Ionicons name={icon} size={20} color={color} />
      <Text style={[styles.buttonText, { color }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 12, padding: 14, gap: 12 },
  version: { fontSize: 15, fontWeight: '500' },
  block: { gap: 8 },
  status: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  message: { flex: 1, fontSize: 14, lineHeight: 20 },
  bold: { fontWeight: '600' },
  notes: { fontSize: 13, lineHeight: 18 },
  hint: { fontSize: 12, lineHeight: 16 },
  track: { height: 6, borderRadius: 3, overflow: 'hidden' },
  fill: { height: 6, borderRadius: 3 },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 48,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  buttonText: { fontSize: 15, fontWeight: '600' },
});
