import { View } from 'react-native';

// En el navegador usamos su visor de PDF integrado. Como el iframe no avisa
// del scroll, las barras se quedan fijas y dejamos hueco para ellas.
export default function PdfViewer({ uri, style, insetTop = 0, insetBottom = 0 }) {
  return (
    <View style={[style, { paddingTop: insetTop, paddingBottom: insetBottom }]}>
      <iframe key={uri} src={uri} title="PDF" style={{ border: 0, width: '100%', height: '100%' }} />
    </View>
  );
}
