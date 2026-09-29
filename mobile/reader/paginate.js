// Reparte los bloques del modo texto en páginas del alto de la pantalla.
//
// `linesFor(bloque)` da las líneas en que se parte su texto al ancho de la
// columna (Android: onTextLayout; web: canvas), o undefined si aún no se ha
// medido. Como el estilo
// fija el lineHeight, cada línea mide exactamente eso y las alturas salen sin
// volver a medir. Un párrafo que no cabe se corta por líneas y sigue en la
// página siguiente; se para en el primer bloque aún sin medir.
//
// Página: { key, blocks, number (página del PDF donde empieza), end }.
// Bloque: { key, type, text | title, number, flush (sin margen arriba), split (sigue en la siguiente) }.
export function paginate(items, linesFor, s, pageHeight) {
  const pages = [];
  let page;
  let used = 0;
  const open = () => {
    page = { key: `p${pages.length}`, blocks: [], number: null, end: null };
    pages.push(page);
    used = 0;
  };
  const add = (block, it) => {
    page.blocks.push(block);
    page.number ??= it.number;
    page.end = Math.max(page.end ?? it.end, it.end);
  };
  open();

  for (const it of items) {
    const lines = linesFor(it);
    if (!lines) return { pages, complete: false };

    // Cada capítulo empieza en una página nueva, como en un libro.
    if (it.type === 'chapter') {
      if (page.blocks.length) open();
      add({ key: it.key, type: 'chapter', title: it.title, number: it.number }, it);
      const title = lines.length ? lines.length * s.chapterTitle.lineHeight + s.chapterTitle.marginBottom : 0;
      used += s.chapterDecor + title;
      continue;
    }

    // Los títulos no se parten ni se quedan solos al pie de la página.
    if (it.type === 'heading') {
      const st = s.heading;
      const height = lines.length * st.lineHeight + st.marginBottom;
      const top = () => (page.blocks.length ? st.marginTop : 0);
      const afterChapter = page.blocks.at(-1)?.type === 'chapter';
      if (page.blocks.length && !afterChapter && used + top() + height + 2 * s.body.lineHeight > pageHeight) open();
      const flush = !page.blocks.length;
      used += top() + height;
      add({ key: it.key, type: 'heading', text: it.text, number: it.number, flush }, it);
      continue;
    }

    const lh = s.body.lineHeight;
    let start = 0;
    while (start < lines.length) {
      const rest = lines.length - start;
      let fit = Math.floor((pageHeight - used) / lh);
      // Una página vacía siempre acepta al menos una línea (pantallas diminutas).
      if (!page.blocks.length) fit = Math.max(1, fit);
      // Sin línea huérfana: la primera línea de un párrafo no se queda sola al pie.
      else if (fit <= 0 || (start === 0 && fit === 1 && rest > 1)) {
        open();
        continue;
      }
      const take = Math.min(fit, rest);
      const split = take < rest;
      add(
        {
          key: `${it.key}:${start}`,
          type: 'paragraph',
          text: lines
            .slice(start, start + take)
            .join('')
            .trimEnd(),
          number: it.number,
          split,
        },
        it,
      );
      used += take * lh;
      start += take;
      if (split) open();
    }
    used += s.body.marginBottom;
  }
  if (!page.blocks.length && pages.length > 1) pages.pop();
  return { pages, complete: true };
}
