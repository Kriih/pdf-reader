import { useRef, useState } from 'react';
import Pdf from 'react-native-pdf';

import { notify } from '../reader/notify';

// Visor nativo (Android). La versión web está en PdfViewer.web.js.
// Las barras flotan encima: al pasar de página se ocultan y un toque las muestra.
// `paged`: una página cada vez, en horizontal y entera en pantalla.
export default function PdfViewer({ uri, style, initialPage, paged, onPageChanged, onTap, onScrollAway }) {
  // La página inicial se fija al montar: si siguiera a la página actual,
  // cada cambio de página haría saltar el scroll al inicio de esa página.
  const [startPage] = useState(initialPage);
  const lastPage = useRef(initialPage);
  return (
    <Pdf
      key={uri}
      source={{ uri, cache: false }}
      page={startPage}
      style={style}
      horizontal={!!paged}
      enablePaging={!!paged}
      onPageChanged={(p) => {
        if (p !== lastPage.current) onScrollAway?.();
        lastPage.current = p;
        onPageChanged(p);
      }}
      onPageSingleTap={() => onTap?.()}
      onError={(e) => notify('No se pudo mostrar el PDF', String(e?.message ?? e))}
    />
  );
}
