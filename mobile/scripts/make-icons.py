"""Genera los iconos de la app en assets/ a partir del dibujo en SVG.

Uso (desde mobile/): python3 scripts/make-icons.py   (necesita rsvg-convert: sudo apt install librsvg2-bin)
"""
import os
import subprocess
import tempfile
INDIGO = '#4b50e6'
INDIGO_DARK = '#3238b8'
PAGE = '#f5f5f7'
BG = '#eef0ff'

# Geometría en una caja de 512: página con la esquina superior derecha doblada.
PAGE_PATH = 'M110 44 H296 L424 172 V446 Q424 468 402 468 H110 Q88 468 88 446 V66 Q88 44 110 44 Z'
FLAP = 'M296 44 V150 Q296 172 318 172 H424 Z'
FLAP_SHADOW = 'M300 172 H424 V296 Z'
LINES = [(128, 300, 134), (128, 362, 214)]  # x, y, ancho de las líneas de texto

def doc(color=True):
    if not color:
        # Monocromo: contorno, pliegue y líneas en un solo color.
        lines = ''.join(f'<rect x="{x}" y="{y}" width="{w}" height="32" rx="6"/>' for x, y, w in LINES)
        return (f'<g fill="none" stroke="#000" stroke-width="44" stroke-linejoin="round"><path d="{PAGE_PATH}"/></g>'
                f'<path d="{FLAP}" fill="#000" stroke="#000" stroke-width="14" stroke-linejoin="round"/><g fill="#000">{lines}</g>')
    lines = ''.join(f'<rect x="{x}" y="{y}" width="{w}" height="32" rx="6" fill="{INDIGO}"/>' for x, y, w in LINES)
    return (
        f'<path d="{PAGE_PATH}" fill="{INDIGO}" stroke="{INDIGO}" stroke-width="44" stroke-linejoin="round"/>'
        f'<path d="{PAGE_PATH}" fill="{INDIGO_DARK}" opacity="0.55" transform="translate(0 9)"/>'
        f'<path d="{PAGE_PATH}" fill="{PAGE}"/>'
        f'<path d="{FLAP_SHADOW}" fill="#1f2340" opacity="0.18"/>'
        f'<path d="{FLAP}" fill="#cfd1dc"/>'
        f'{lines}'
    )

def svg(content, bg=None, scale=1.0):
    # Centra el documento (caja 66..446 x 22..490, centro 256,256) y lo escala.
    t = f'translate(256 256) scale({scale}) translate(-256 -256)'
    back = f'<rect width="512" height="512" fill="{bg}"/>' if bg else ''
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">{back}<g transform="{t}">{content}</g></svg>'

def render(text, size, out):
    with tempfile.NamedTemporaryFile('w', suffix='.svg') as f:
        f.write(text)
        f.flush()
        subprocess.run(['rsvg-convert', '-w', str(size), '-h', str(size), f.name, '-o', out], check=True)

A = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'assets') + os.sep
render(svg(doc(), BG, 0.74), 1024, A + 'icon.png')
render(svg(doc(), None, 1.0), 1024, A + 'splash-icon.png')
render(svg(doc(), None, 1.0), 48, A + 'favicon.png')
# Adaptativo de Android: el lanzador recorta con su máscara; el dibujo va dentro
# de la zona segura (círculo central de 66/108 del lienzo).
render(svg(doc(), None, 0.56), 1024, A + 'android-icon-foreground.png')
render(svg('', BG), 1024, A + 'android-icon-background.png')
render(svg(doc(False), None, 0.56), 1024, A + 'android-icon-monochrome.png')
