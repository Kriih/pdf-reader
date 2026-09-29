// Del texto extraído por páginas a la lista de bloques que pinta el modo texto:
// párrafos unidos entre páginas y marcas de inicio de capítulo.

const LIST_ITEM = /^([•·▪◦‣–—-]|\d{1,3}[.)]|[a-z][)])\s/;
const CONTINUATION_START = /^[\p{Ll},;:)\]»”]/u;

// ¿El primer párrafo de una página continúa el último de la anterior?
// - Nunca si alguno es un título o si la página empieza con una viñeta.
// - Sí si empieza en minúscula o con puntuación ("…del / mundo", "…etc. / y otros").
// - Si no, se sigue a Python: marca `continues` cuando la página acabó sin
//   punto y aparte (la última línea no era la corta de final de párrafo).
export function continuesInto(prev, next, text) {
  if (prev.type === 'heading' || next.heading || LIST_ITEM.test(text)) return false;
  return CONTINUATION_START.test(text) || prev.continues;
}

// "pala-" + "bra" -> "palabra"; si no, un espacio.
export const joinText = (a, b) => (/\p{Ll}-$/u.test(a) && /^\p{Ll}/u.test(b) ? a.slice(0, -1) + b : `${a} ${b}`);

// Títulos que suelen abrir un capítulo, para PDFs sin índice.
const CHAPTER_WORDS =
  /^(cap[ií]tulo|chapter|parte|part|libro|book|pr[oó]logo|prefacio|introducci[oó]n|ep[ií]logo|conclusi[oó]n|ap[eé]ndice|anexo)\b/i;
const ROMAN = /^[IVXLC]{1,7}\.?$/;
const isChapterHeading = (text) => CHAPTER_WORDS.test(text) || ROMAN.test(text);

// Entradas del índice que separan capítulos: el nivel más alto con al menos
// dos entradas (con una sola suele ser el título del libro). Si son pocas,
// seguramente son "Partes" y se incluyen también los capítulos de dentro.
function outlineMarks(outline) {
  const count = (level) => outline.filter((o) => o.level === level).length;
  const levels = [...new Set(outline.map((o) => o.level))].sort((a, b) => a - b);
  const base = levels.find((l) => count(l) >= 2) ?? levels[0];
  const deepest = count(base) < 4 && count(base + 1) > count(base) ? base + 1 : base;
  return outline.filter((o) => o.level >= base && o.level <= deepest);
}

// Capítulos del documento: [{ title, page, level, source }], por página.
// Del índice del PDF si lo tiene; si no, de los títulos del texto ya extraído.
export function chapterMarks(outline, pages) {
  if (outline?.length) {
    return outlineMarks(outline)
      .map((o) => ({ ...o, source: 'outline' }))
      .sort((a, b) => a.page - b.page);
  }
  const marks = [];
  for (const p of pages ?? []) {
    for (const para of p.paragraphs) {
      if (para.heading && isChapterHeading(para.text)) {
        marks.push({ title: para.text, page: p.number, level: 0, source: 'text' });
      }
    }
  }
  return marks;
}

// Índice completo para el panel "Contenido" (hasta tres niveles).
export function contentsList(outline, pages) {
  if (!outline?.length) return chapterMarks(null, pages);
  const min = Math.min(...outline.map((o) => o.level));
  return outline.filter((o) => o.level <= min + 2).map((o) => ({ ...o, level: o.level - min }));
}

export function currentChapter(marks, page) {
  let current = null;
  for (const m of marks) if (m.page <= page) current = m;
  return current;
}

// Bloques: { key, type: 'paragraph' | 'heading' | 'chapter', text, title,
// number (página donde empieza), end (donde acaba) }.
export function buildItems(pages, { marks = [] } = {}) {
  const out = [];
  for (const p of pages) {
    p.paragraphs.forEach((para, i) => {
      const { text } = para;
      const last = i === p.paragraphs.length - 1;
      const prev = out[out.length - 1];
      if (i === 0 && prev?.last && continuesInto(prev, para, text)) {
        out[out.length - 1] = {
          ...prev,
          text: joinText(prev.text, text),
          end: p.number,
          last,
          continues: !!para.continues,
        };
        return;
      }
      out.push({
        key: `${p.number}-${i}`,
        type: para.heading ? 'heading' : 'paragraph',
        text,
        number: p.number,
        end: p.number,
        last,
        continues: !!para.continues,
      });
    });
  }

  // Dónde empieza cada capítulo -> título a mostrar (null si el texto ya
  // trae su propio título en ese punto).
  const starts = new Map();
  if (marks[0]?.source === 'outline') {
    let i = 0;
    for (const m of marks) {
      while (i < out.length && out[i].number < m.page) i++;
      if (i >= out.length) break;
      if (!starts.has(i)) starts.set(i, out[i].type === 'heading' ? null : m.title);
    }
  } else {
    out.forEach((it, i) => {
      if (it.type === 'heading' && isChapterHeading(it.text)) starts.set(i, null);
    });
  }

  const items = [];
  out.forEach((it, i) => {
    const title = starts.get(i);
    // Al principio del documento no hace falta separar nada si no hay título que añadir.
    if (starts.has(i) && (i > 0 || title)) {
      items.push({ key: `ch-${it.key}`, type: 'chapter', title, first: i === 0, number: it.number, end: it.number });
    }
    items.push(it);
  });
  return items;
}
