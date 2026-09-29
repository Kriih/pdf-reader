import { ScrollView, StyleSheet, useWindowDimensions } from 'react-native';

import { AlignSection, BackgroundSection, FontSection, LayoutSection, SizeSection } from './StyleControls';
import { Sheet } from './ui';

// Ajustes de lectura. Cada control llama a update/step y la vista de detrás
// se re-renderiza al momento. En la vista PDF solo aplica el paso de página;
// en el texto ajustado, continuo u horizontal se elige con los botones de la barra.
export default function ReadingSettings({ visible, onClose, settings, theme, update, step, mode }) {
  const { height } = useWindowDimensions();
  const text = mode !== 'pdf';
  const props = { settings, theme, update, step };
  return (
    <Sheet visible={visible} title={text ? 'Estilo de lectura' : 'Vista'} onClose={onClose} theme={theme}>
      <ScrollView style={{ maxHeight: height * 0.7 }} contentContainerStyle={styles.content}>
        {text ? (
          <>
            <FontSection {...props} />
            <SizeSection {...props} />
            <AlignSection {...props} />
            <BackgroundSection {...props} />
          </>
        ) : (
          <LayoutSection {...props} />
        )}
      </ScrollView>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  content: { gap: 16 },
});
