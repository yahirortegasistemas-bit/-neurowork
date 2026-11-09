#!/usr/bin/env python3
"""
Genera los iconos PNG de la PWA de NeuroWork sin librerías externas
(solo la biblioteca estándar: zlib + struct).

Marcas: una pequeña "red neuronal" (nodos + conexiones) sobre el color
primario de la app. Se dibuja con supersampling 4x para bordes suaves.

Uso:
    python3 tools/make-icons.py

Salida: icons/icon-192.png, icons/icon-512.png, icons/icon-512-maskable.png
"""
import math
import os
import struct
import zlib

BG = (47, 98, 89)        # --primary
INK = (255, 255, 255)
ACCENT = (192, 134, 60)  # --accent

# Nodos (coordenadas normalizadas 0..1) y conexiones del grafo.
NODES = [(0.30, 0.32), (0.72, 0.26), (0.70, 0.72), (0.26, 0.70), (0.50, 0.50)]
EDGES = [(0, 4), (1, 4), (2, 4), (3, 4), (0, 1), (1, 2), (2, 3), (3, 0)]
CENTER = 4

SS = 4  # supersampling


def render(size, glyph_scale=1.0):
    W = size * SS
    buf = bytearray([BG[0], BG[1], BG[2], 255]) * (W * W)

    def disc(cx, cy, r, col):
        x0 = max(0, int(cx - r - 1)); x1 = min(W - 1, int(cx + r + 1))
        y0 = max(0, int(cy - r - 1)); y1 = min(W - 1, int(cy + r + 1))
        r2 = r * r
        for y in range(y0, y1 + 1):
            dy = y - cy
            rowbase = y * W * 4
            dy2 = dy * dy
            for x in range(x0, x1 + 1):
                dx = x - cx
                if dx * dx + dy2 <= r2:
                    o = rowbase + x * 4
                    buf[o] = col[0]; buf[o + 1] = col[1]; buf[o + 2] = col[2]; buf[o + 3] = 255

    def line(p0, p1, w, col):
        x0, y0 = p0; x1, y1 = p1
        d = math.hypot(x1 - x0, y1 - y0)
        steps = max(2, int(d / (w * 0.4)))
        for i in range(steps + 1):
            t = i / steps
            disc(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, w / 2.0, col)

    def sc(p):
        return (0.5 + (p[0] - 0.5) * glyph_scale, 0.5 + (p[1] - 0.5) * glyph_scale)

    pts = [(sc(n)[0] * W, sc(n)[1] * W) for n in NODES]
    line_w = 0.026 * W * glyph_scale
    node_r = 0.085 * W * glyph_scale

    for a, b in EDGES:
        line(pts[a], pts[b], line_w, INK)
    for i, p in enumerate(pts):
        col = ACCENT if i == CENTER else INK
        r = node_r * (1.15 if i == CENTER else 1.0)
        disc(p[0], p[1], r, col)

    # Downsample (promedio de SSxSS) -> antialiasing.
    out = bytearray(size * size * 4)
    n = SS * SS
    for y in range(size):
        for x in range(size):
            r = g = b = 0
            for dy in range(SS):
                base = ((y * SS + dy) * W + x * SS) * 4
                for dx in range(SS):
                    o = base + dx * 4
                    r += buf[o]; g += buf[o + 1]; b += buf[o + 2]
            o2 = (y * size + x) * 4
            out[o2] = r // n; out[o2 + 1] = g // n; out[o2 + 2] = b // n; out[o2 + 3] = 255
    return out


def write_png(path, size, pixels):
    raw = bytearray()
    stride = size * 4
    for y in range(size):
        raw.append(0)  # filtro None
        raw += pixels[y * stride:(y + 1) * stride]

    def chunk(typ, data):
        return (struct.pack('>I', len(data)) + typ + data +
                struct.pack('>I', zlib.crc32(typ + data) & 0xffffffff))

    sig = b'\x89PNG\r\n\x1a\n'
    ihdr = struct.pack('>IIBBBBB', size, size, 8, 6, 0, 0, 0)
    data = sig + chunk(b'IHDR', ihdr) + chunk(b'IDAT', zlib.compress(bytes(raw), 9)) + chunk(b'IEND', b'')
    with open(path, 'wb') as f:
        f.write(data)


def main():
    here = os.path.dirname(os.path.abspath(__file__))
    outdir = os.path.join(os.path.dirname(here), 'icons')
    os.makedirs(outdir, exist_ok=True)
    jobs = [
        ('icon-192.png', 192, 1.0),
        ('icon-512.png', 512, 1.0),
        ('icon-512-maskable.png', 512, 0.78),  # zona segura para maskable
        ('apple-touch-icon.png', 180, 1.0),
    ]
    for name, size, gs in jobs:
        px = render(size, gs)
        write_png(os.path.join(outdir, name), size, px)
        print('escrito', os.path.join('icons', name), str(size) + 'x' + str(size))


if __name__ == '__main__':
    main()
