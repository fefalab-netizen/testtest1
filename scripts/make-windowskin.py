#!/usr/bin/env python3
"""SNES-style 9-slice atlas — chrome neon infomercial / retrowave."""

from pathlib import Path

from PIL import Image

OUT = Path("/workspace/public/ui/windowskin.png")
SIZE = 96
SLICE = 32

INK = (8, 2, 18, 255)
GOLD = (255, 214, 90, 255)
GOLD_DIM = (196, 140, 40, 255)
CYAN = (0, 236, 255, 255)
CYAN_DIM = (0, 140, 176, 255)
IVORY = (255, 244, 214, 255)
MAGENTA = (255, 46, 196, 255)
MAGENTA_DIM = (176, 24, 128, 255)
FILL = (16, 6, 32, 255)
FILL2 = (22, 8, 42, 255)
INNER = (10, 4, 22, 255)
JEWEL = (255, 46, 196, 255)
JEWEL_LIT = (255, 180, 70, 255)


def put(px, x, y, c):
    if 0 <= x < SIZE and 0 <= y < SIZE:
        px[x, y] = c


def hline(px, x0, x1, y, c):
    for x in range(x0, x1 + 1):
        put(px, x, y, c)


def vline(px, x, y0, y1, c):
    for y in range(y0, y1 + 1):
        put(px, x, y, c)


def rect(px, x0, y0, x1, y1, c):
    hline(px, x0, x1, y0, c)
    hline(px, x0, x1, y1, c)
    vline(px, x0, y0, y1, c)
    vline(px, x1, y0, y1, c)


def jewel(px, x, y):
    put(px, x, y, JEWEL_LIT)
    put(px, x + 1, y, JEWEL)
    put(px, x, y + 1, MAGENTA)
    put(px, x + 1, y + 1, INK)
    put(px, x - 1, y, CYAN)
    put(px, x, y - 1, CYAN)


def corner_ornament(px, ox, oy, flip_x, flip_y):
    def p(dx, dy, c):
        x = ox + (SLICE - 1 - dx if flip_x else dx)
        y = oy + (SLICE - 1 - dy if flip_y else dy)
        put(px, x, y, c)

    for i in range(6, 14):
        p(i, 6, GOLD_DIM)
        p(6, i, GOLD_DIM)
    for i in range(6, 13):
        p(i, 7, MAGENTA_DIM)
        p(7, i, CYAN_DIM)
    p(8, 8, CYAN)
    p(9, 8, GOLD)
    p(8, 9, GOLD)
    jewel_x = ox + (8 if not flip_x else SLICE - 10)
    jewel_y = oy + (8 if not flip_y else SLICE - 10)
    jewel(px, jewel_x, jewel_y)


def main():
    img = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    px = img.load()

    for y in range(SIZE):
        for x in range(SIZE):
            # faint grid in the fill so stretched centers still read retrowave
            grid = (x % 4 == 0) or (y % 4 == 0)
            px[x, y] = FILL2 if grid else FILL

    last = SIZE - 1
    layers = [
        (0, INK),
        (1, MAGENTA),
        (2, GOLD),
        (3, IVORY),
        (4, CYAN),
        (5, MAGENTA_DIM),
        (6, INNER),
    ]
    for inset, color in layers:
        rect(px, inset, inset, last - inset, last - inset, color)

    corner_ornament(px, 0, 0, False, False)
    corner_ornament(px, SIZE - SLICE, 0, True, False)
    corner_ornament(px, 0, SIZE - SLICE, False, True)
    corner_ornament(px, SIZE - SLICE, SIZE - SLICE, True, True)

    for x in range(SLICE, SIZE - SLICE, 8):
        put(px, x + 3, 2, CYAN)
        put(px, x + 3, last - 2, MAGENTA)
    for y in range(SLICE, SIZE - SLICE, 8):
        put(px, 2, y + 3, CYAN)
        put(px, last - 2, y + 3, MAGENTA)

    OUT.parent.mkdir(parents=True, exist_ok=True)
    img.save(OUT)
    print(f"wrote {OUT} {img.size} slice={SLICE}")


if __name__ == "__main__":
    main()
