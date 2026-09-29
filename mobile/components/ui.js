import Ionicons from '@expo/vector-icons/Ionicons';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function IconButton({ icon, label, onPress, theme, active, disabled, showLabel = false }) {
  const color = active ? theme.onAccent : theme.text;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: !!active, disabled: !!disabled }}
      style={({ pressed }) => [
        styles.iconButton,
        showLabel && styles.iconButtonLabeled,
        active && { backgroundColor: theme.accent },
        (pressed || disabled) && { opacity: 0.4 },
      ]}
    >
      <Ionicons name={icon} size={22} color={color} />
      {showLabel && <Text style={[styles.iconLabel, { color }]}>{label}</Text>}
    </Pressable>
  );
}

// Panel inferior; el fondo es casi transparente para ver los cambios en vivo detrás.
export function Sheet({ visible, title, onClose, theme, children }) {
  const insets = useSafeAreaInsets();
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
      navigationBarTranslucent
    >
      {/* Con los campos de texto, el panel sube por encima del teclado. */}
      <KeyboardAvoidingView behavior="padding" style={styles.flex}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Cerrar panel" />
        <View
          style={[
            styles.sheet,
            { backgroundColor: theme.surface, borderColor: theme.border, paddingBottom: insets.bottom + 16 },
          ]}
        >
          <View style={[styles.handle, { backgroundColor: theme.border }]} />
          <View style={styles.sheetHeader}>
            <Text style={[styles.sheetTitle, { color: theme.text }]} numberOfLines={1}>
              {title}
            </Text>
            <IconButton icon="close" label="Cerrar" onPress={onClose} theme={theme} />
          </View>
          {children}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export function Section({ label, theme, children }) {
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionLabel, { color: theme.muted }]}>{label}</Text>
      {children}
    </View>
  );
}

export function Stepper({ value, onDecrease, onIncrease, format, theme, labels }) {
  return (
    <View style={[styles.stepper, { borderColor: theme.border }]}>
      <IconButton icon="remove" label={labels[0]} onPress={onDecrease} theme={theme} />
      <Text style={[styles.stepperValue, { color: theme.text }]} accessibilityLiveRegion="polite">
        {format(value)}
      </Text>
      <IconButton icon="add" label={labels[1]} onPress={onIncrease} theme={theme} />
    </View>
  );
}

export function Chip({ label, selected, onPress, theme, style }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      style={[
        styles.chip,
        { borderColor: selected ? theme.accent : theme.border },
        selected && { backgroundColor: theme.accent },
      ]}
    >
      <Text style={[styles.chipText, { color: selected ? theme.onAccent : theme.text }, style]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  iconButton: {
    minWidth: 44,
    minHeight: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButtonLabeled: { paddingHorizontal: 10, gap: 2, borderRadius: 12 },
  iconLabel: { fontSize: 11, fontWeight: '500' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.15)' },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 20,
    paddingTop: 8,
    gap: 16,
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    ...Platform.select({ web: { boxShadow: '0 -4px 24px rgba(0,0,0,0.12)' }, default: { elevation: 12 } }),
  },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center' },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sheetTitle: { flex: 1, fontSize: 18, fontWeight: '600' },
  section: { gap: 8 },
  sectionLabel: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.6 },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 4,
  },
  stepperValue: { fontSize: 16, fontWeight: '600', fontVariant: ['tabular-nums'] },
  chip: {
    flexGrow: 1,
    minHeight: 44,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipText: { fontSize: 15 },
});
