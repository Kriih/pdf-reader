import { useState } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { displayName, pickCoverImage, removeDocument, renameDocument, setCover } from '../library/library';
import { ask, notify } from '../reader/notify';
import { Sheet } from './ui';

const DANGER = '#dc2626';

// Menú ⋮ de un documento de la biblioteca: renombrar, portada y borrar.
export default function DocumentOptions({ doc, theme, onClose }) {
  // Se sigue pintando el último documento mientras el panel se cierra.
  const [shown, setShown] = useState(doc);
  if (doc && doc !== shown) setShown(doc);

  const [renaming, setRenaming] = useState(false);
  const [title, setTitle] = useState('');

  const close = () => {
    setRenaming(false);
    onClose();
  };

  const startRename = () => {
    setTitle(displayName(shown));
    setRenaming(true);
  };

  const saveRename = () => {
    renameDocument(shown.id, title);
    close();
  };

  const changeCover = async () => {
    close();
    try {
      const uri = await pickCoverImage();
      if (uri) await setCover(shown.id, uri);
    } catch (e) {
      notify('No se pudo cambiar la portada', e.message);
    }
  };

  const removeCover = () => {
    close();
    setCover(shown.id, null).catch((e) => notify('No se pudo quitar la portada', e.message));
  };

  const remove = async () => {
    close();
    const choice = await ask(
      `¿Borrar «${displayName(shown)}»?`,
      'Se borrará la copia guardada en la app y su progreso.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Borrar', value: 'remove', style: 'destructive' },
      ],
    );
    if (choice === 'remove') removeDocument(shown.id).catch((e) => notify('No se pudo borrar', e.message));
  };

  if (!shown) return null;

  return (
    <Sheet visible={!!doc} title={renaming ? 'Renombrar' : displayName(shown)} onClose={close} theme={theme}>
      {renaming ? (
        <View style={styles.rename}>
          <TextInput
            value={title}
            onChangeText={setTitle}
            onSubmitEditing={saveRename}
            autoFocus
            selectTextOnFocus
            returnKeyType="done"
            placeholder={shown.name}
            placeholderTextColor={theme.muted}
            accessibilityLabel="Nuevo nombre"
            style={[styles.input, { borderColor: theme.border, color: theme.text }]}
          />
          <Text style={[styles.hint, { color: theme.muted }]}>Déjalo vacío para volver al nombre del archivo.</Text>
          <View style={styles.buttons}>
            <Pressable
              onPress={() => setRenaming(false)}
              accessibilityRole="button"
              style={({ pressed }) => [styles.button, { borderColor: theme.border }, pressed && styles.pressed]}
            >
              <Text style={[styles.buttonText, { color: theme.text }]}>Cancelar</Text>
            </Pressable>
            <Pressable
              onPress={saveRename}
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.button,
                { backgroundColor: theme.accent, borderColor: theme.accent },
                pressed && styles.pressed,
              ]}
            >
              <Text style={[styles.buttonText, { color: theme.onAccent }]}>Guardar</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <View>
          <Action icon="create-outline" label="Renombrar" onPress={startRename} theme={theme} />
          <Action
            icon="image-outline"
            label={shown.cover ? 'Cambiar portada' : 'Poner portada'}
            hint="Elige una imagen de la galería"
            onPress={changeCover}
            theme={theme}
          />
          {shown.cover && (
            <Action icon="close-circle-outline" label="Quitar portada" onPress={removeCover} theme={theme} />
          )}
          <Action icon="trash-outline" label="Borrar" onPress={remove} theme={theme} danger />
        </View>
      )}
    </Sheet>
  );
}

function Action({ icon, label, hint, onPress, theme, danger }) {
  const color = danger ? DANGER : theme.text;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityHint={hint}
      style={({ pressed }) => [styles.action, pressed && { backgroundColor: theme.pdfBg }]}
    >
      <Ionicons name={icon} size={22} color={color} />
      <View style={styles.actionText}>
        <Text style={[styles.actionLabel, { color }]}>{label}</Text>
        {hint && <Text style={[styles.hint, { color: theme.muted }]}>{hint}</Text>}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    minHeight: 52,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  actionText: { flex: 1, gap: 2 },
  actionLabel: { fontSize: 16, fontWeight: '500' },
  hint: { fontSize: 12, lineHeight: 16 },
  rename: { gap: 8 },
  input: { minHeight: 48, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, fontSize: 16 },
  buttons: { flexDirection: 'row', gap: 8, marginTop: 8 },
  button: {
    flex: 1,
    minHeight: 48,
    borderWidth: 1,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: { fontSize: 16, fontWeight: '600' },
  pressed: { opacity: 0.6 },
});
