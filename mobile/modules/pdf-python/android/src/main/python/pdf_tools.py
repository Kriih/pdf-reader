"""Operaciones sobre PDFs, ejecutadas en el móvil con Chaquopy.

Punto de entrada único: run(command, args_json) -> json.
Las rutas pueden venir como "file:///..." (URIs de Expo) o como rutas normales.
"""

import json
import os
import re
from collections import Counter
from urllib.parse import unquote, urlparse

from pypdf import PdfReader


def _path(uri):
    if uri.startswith("file://"):
        return unquote(urlparse(uri).path)
    return uri


def info(src):
    reader = PdfReader(_path(src))
    meta = reader.metadata or {}
    first = reader.pages[0].mediabox if reader.pages else None
    return {
        "pages": len(reader.pages),
        "title": meta.get("/Title") or "",
        "author": meta.get("/Author") or "",
        "width": float(first.width) if first else 0,
        "height": float(first.height) if first else 0,
        "encrypted": reader.is_encrypted,
        "outline": _outline(reader),
    }


def _outline(reader, limit=500):
    """Índice que trae el PDF: [{"title", "page" (base 1), "level"}]."""
    out = []

    def walk(items, level):
        for item in items:
            if len(out) >= limit:
                return
            # pypdf anida los hijos como una lista justo después de su padre.
            if isinstance(item, list):
                walk(item, level + 1)
                continue
            try:
                page = reader.get_destination_page_number(item)
            except Exception:
                page = None
            title = _SPACES.sub(" ", str(item.title or "")).strip()
            if title and page is not None and page >= 0:
                out.append({"title": title, "page": page + 1, "level": level})

    try:
        walk(reader.outline, 0)
    except Exception:
        pass  # índices rotos: el lector detecta los capítulos por los títulos
    return out


_SPACES = re.compile(r"\s+")
_SENTENCE_END = (".", "!", "?", ":", "…", '"', "»", "”", ")")


def _reflow(raw):
    """Convierte las líneas rotas del PDF en párrafos continuos.

    El PDF guarda texto en líneas de ancho fijo; aquí las volvemos a unir:
    - una línea vacía separa párrafos si lo anterior parece un final
      (puntuación o línea corta); si no, es solo interlineado amplio;
    - una línea claramente más corta que las demás que acaba en puntuación
      cierra el párrafo (fin de párrafo típico);
    - una línea corta sin puntuación al inicio de un bloque es un título;
    - "pala-" + "bra" se une como "palabra".
    Devuelve [{"text": ..., "heading": bool}, ...]. Si la página acaba sin
    punto y aparte, el último párrafo lleva "continues": True (sigue en la
    página siguiente y el lector lo une con ella).
    """
    # El modo layout rellena con espacios para imitar la justificación: los colapsamos.
    lines = [_SPACES.sub(" ", ln).strip() for ln in raw.splitlines()]
    # Las líneas vacías del final (a menudo, el pie de página ya quitado)
    # cerrarían el último párrafo aunque siga en la página siguiente.
    while lines and not lines[-1]:
        lines.pop()
    lengths = sorted(len(ln) for ln in lines if ln)
    if not lengths:
        return []
    typical = lengths[len(lengths) * 3 // 4]  # percentil 75: ancho de una línea "llena"

    paragraphs, current, last_len = [], "", 0

    def close(heading=False):
        nonlocal current
        if current:
            paragraphs.append({"text": current, "heading": heading})
            current = ""

    for line in lines:
        short = len(line) < typical * 0.6
        if not line:
            if current.endswith(_SENTENCE_END) or last_len < typical * 0.75:
                close()
            continue
        last_len = len(line)
        if not current and short and not line.endswith(_SENTENCE_END) and typical > 30:
            current = line
            close(heading=True)
            continue
        if not current:
            current = line
        elif current.endswith("-") and line[:1].islower():
            current = current[:-1] + line
        else:
            current += " " + line
        if len(line) < typical * 0.75 and line.endswith(_SENTENCE_END):
            close()
    # Lo que sigue abierto al acabar la página no terminó en punto y aparte.
    if current:
        paragraphs.append({"text": current, "heading": False, "continues": True})
    return paragraphs


def extract_text(src, start=1, count=None):
    """Texto de las páginas [start, start+count), ya separado en párrafos.

    Se pide por tandas para que el modo lectura muestre las primeras páginas
    enseguida en documentos largos.
    """
    path = _path(src)
    reader = PdfReader(path)
    total = len(reader.pages)
    end = total if count is None else min(total, start - 1 + count)
    numbers = range(start, end + 1)
    raws = [_page_text(reader.pages[n - 1]) for n in numbers]

    edges = _edge_stats(path)
    for raw in raws:
        edges["pages"] += 1
        edges["seen"].update({_signature(ln) for ln in _edge_lines(raw)})

    pages = [
        {"number": n, "paragraphs": _reflow(_strip_page_furniture(raw, edges))}
        for n, raw in zip(numbers, raws)
    ]
    return {"pages": pages, "total": total}


# --- Encabezados y pies de página -------------------------------------------
# Se buscan solo en las primeras/últimas líneas de cada página. Una línea ahí
# es "mobiliario" de página si es un número de página o si se repite en muchas
# páginas (ignorando los números: "Capítulo 2 · 14" ~ "Capítulo 2 · 15").
# Las estadísticas se acumulan por documento entre tandas.

_EDGE_LINES = 2
_PAGE_NUMBER = re.compile(
    # "5", "- 5 -", "[5]", "Página 5", "pág. 5 de 20", "5/20"; pero no "100%" ni "5.".
    r"^[\s\-–—·|\[(]*((p[aá]g(ina)?|page|p)\.?\s*)?\d{1,4}(\s*(de|of|/)\s*\d{1,4})?[\s\-–—·|\])]*$",
    re.IGNORECASE,
)
_edge_cache = {}


def _edge_stats(path):
    # Clave barata del documento: tamaño + inicio y final del archivo.
    with open(path, "rb") as f:
        head = f.read(65536)
        f.seek(max(0, os.path.getsize(path) - 65536))
        key = (os.path.getsize(path), hash(head + f.read()))
    if key not in _edge_cache:
        _edge_cache.clear()  # solo nos interesa el documento abierto
        _edge_cache[key] = {"pages": 0, "seen": Counter()}
    return _edge_cache[key]


def _signature(line):
    return re.sub(r"\d+", "#", _SPACES.sub(" ", line).strip().lower())


def _edge_lines(raw):
    lines = [ln for ln in raw.splitlines() if ln.strip()]
    if len(lines) <= 2 * _EDGE_LINES:
        return lines
    return lines[:_EDGE_LINES] + lines[-_EDGE_LINES:]


def _strip_page_furniture(raw, edges):
    lines = raw.splitlines()
    filled = [i for i, ln in enumerate(lines) if ln.strip()]
    edge_idx = set(filled[:_EDGE_LINES] + filled[-_EDGE_LINES:])
    min_repeats = max(3, edges["pages"] * 0.4)

    def is_furniture(line):
        text = line.strip()
        if _PAGE_NUMBER.match(text):
            return True
        return edges["pages"] >= 3 and edges["seen"][_signature(text)] >= min_repeats

    return "\n".join(
        "" if i in edge_idx and is_furniture(ln) else ln for i, ln in enumerate(lines)
    )


def _page_text(page):
    # El modo "layout" coloca cada palabra según su posición en la página, así
    # que reconstruye bien las líneas aunque el PDF guarde cada palabra por
    # separado (típico de Word con texto justificado). El modo normal mete un
    # salto de línea entre esas palabras y el texto queda en una columna.
    try:
        return page.extract_text(extraction_mode="layout") or ""
    except Exception:
        try:
            return page.extract_text() or ""
        except Exception:
            return ""


COMMANDS = {
    "info": info,
    "extract_text": extract_text,
}


def run(command, args_json):
    if command not in COMMANDS:
        raise ValueError(f"Comando desconocido: {command}")
    return json.dumps(COMMANDS[command](**json.loads(args_json)))
