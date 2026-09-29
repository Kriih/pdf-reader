import { StyleSheet, Text, View } from 'react-native';

import { RULE } from '../reader/textStyles';

// Separación entre capítulos: hueco, raya corta y, si el texto no trae su
// propio título en ese punto, el del índice del PDF. Sus medidas salen de
// textStyles para que el modo por páginas sepa cuánto ocupa.
export default function ChapterBreak({ title, first, s, theme }) {
  return (
    <View style={[styles.wrap, { paddingTop: first ? 0 : s.chapterGap }]} accessibilityRole="header">
      {!first && <View style={[styles.rule, { backgroundColor: theme.accent, marginBottom: s.ruleGap }]} />}
      {title ? <Text style={s.chapterTitle}>{title}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '100%', alignItems: 'center' },
  rule: { width: RULE.width, height: RULE.height, borderRadius: 1, opacity: 0.7 },
});
