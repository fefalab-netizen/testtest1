#!/usr/bin/env python3
"""Emergency circus assets: imagine cannot persist while artifacts/ is unreadable."""

from __future__ import annotations

import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

ROOT = Path("/workspace/public")
MAGENTA = (255, 0, 255, 0)


def px(draw: ImageDraw.ImageDraw, x: int, y: int, w: int, h: int, color: tuple[int, ...]) -> None:
    draw.rectangle([x, y, x + w - 1, y + h - 1], fill=color)


def sheet_gif(frames: list[Image.Image], dest: Path, duration: int = 180) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    frames[0].save(
        dest,
        save_all=True,
        append_images=frames[1:],
        duration=duration,
        loop=0,
        disposal=2,
        transparency=0,
        optimize=False,
  )


def canvas(size: int = 96) -> tuple[Image.Image, ImageDraw.ImageDraw]:
    im = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    return im, ImageDraw.Draw(im)


def bob(im: Image.Image, dy: int) -> Image.Image:
    out = Image.new("RGBA", im.size, (0, 0, 0, 0))
    out.alpha_composite(im, (0, dy))
    return out


def clown_frame(dy: int) -> Image.Image:
    im, d = canvas()
    # shoes
    px(d, 28, 82, 16, 6, (40, 20, 20, 255))
    px(d, 52, 82, 16, 6, (40, 20, 20, 255))
    # legs stripe
    px(d, 34, 62, 12, 22, (180, 30, 40, 255))
    px(d, 50, 62, 12, 22, (230, 230, 220, 255))
    # torso
    px(d, 30, 38, 36, 26, (180, 30, 40, 255))
    px(d, 30, 46, 36, 6, (230, 230, 220, 255))
    # ruff
    px(d, 26, 34, 44, 8, (240, 240, 235, 255))
    # head
    px(d, 34, 14, 28, 24, (235, 228, 210, 255))
    px(d, 36, 16, 24, 18, (245, 245, 240, 255))
    # hair tufts
    px(d, 28, 16, 8, 10, (90, 20, 30, 255))
    px(d, 60, 16, 8, 10, (90, 20, 30, 255))
    # eyes empty
    px(d, 40, 22, 6, 6, (30, 40, 30, 255))
    px(d, 50, 22, 6, 6, (30, 40, 30, 255))
    # grin
    px(d, 40, 30, 16, 4, (170, 20, 30, 255))
    # nose
    px(d, 45, 26, 6, 5, (200, 40, 40, 255))
    return bob(im, dy)


def weasel_frame(dy: int) -> Image.Image:
    im, d = canvas()
    # tail
    px(d, 18, 58, 22, 8, (90, 60, 40, 255))
    px(d, 12, 52, 10, 10, (70, 45, 30, 255))
    # body lean
    px(d, 34, 40, 18, 36, (110, 75, 50, 255))
    px(d, 36, 48, 14, 18, (160, 140, 120, 255))  # ribs
    px(d, 38, 50, 10, 3, (40, 30, 25, 255))
    px(d, 38, 56, 10, 3, (40, 30, 25, 255))
    # collar
    px(d, 36, 36, 16, 6, (140, 30, 40, 255))
    # head
    px(d, 38, 18, 22, 20, (120, 80, 55, 255))
    px(d, 56, 24, 14, 8, (120, 80, 55, 255))  # snout
    px(d, 66, 26, 8, 6, (230, 220, 180, 255))  # teeth
    px(d, 44, 24, 6, 6, (200, 210, 180, 255))  # eye
    px(d, 46, 26, 3, 3, (20, 20, 20, 255))
    px(d, 52, 16, 6, 8, (90, 60, 40, 255))  # ear
    return bob(im, dy)


def rhino_frame(dy: int) -> Image.Image:
    im, d = canvas()
    px(d, 30, 78, 14, 8, (50, 45, 40, 255))
    px(d, 52, 78, 14, 8, (50, 45, 40, 255))
    px(d, 32, 50, 34, 30, (130, 130, 125, 255))
    px(d, 34, 38, 30, 16, (70, 55, 45, 255))  # jacket
    px(d, 36, 18, 26, 24, (140, 140, 135, 255))
    px(d, 58, 24, 16, 8, (160, 160, 155, 255))  # snout
    px(d, 68, 18, 8, 16, (90, 90, 88, 255))  # horn
    px(d, 42, 26, 6, 6, (20, 20, 20, 255))
    px(d, 52, 26, 6, 6, (20, 20, 20, 255))
    # shotgun held close
    px(d, 18, 48, 22, 7, (40, 40, 38, 255))
    px(d, 14, 46, 8, 10, (70, 55, 40, 255))
    px(d, 22, 42, 10, 8, (90, 70, 50, 255))  # satchel
    return bob(im, dy)


def bunny_frame(dy: int) -> Image.Image:
    im, d = canvas()
    px(d, 28, 78, 16, 8, (40, 30, 30, 255))
    px(d, 52, 78, 16, 8, (40, 30, 30, 255))
    px(d, 24, 42, 48, 38, (230, 225, 215, 255))  # bulk
    px(d, 28, 48, 40, 20, (200, 195, 185, 255))
    px(d, 32, 22, 32, 26, (235, 230, 220, 255))
    # ears
    px(d, 34, 4, 10, 22, (230, 225, 215, 255))
    px(d, 52, 4, 10, 22, (230, 225, 215, 255))
    px(d, 36, 8, 6, 14, (210, 160, 160, 255))
    px(d, 54, 8, 6, 14, (210, 160, 160, 255))
    px(d, 40, 30, 6, 6, (180, 20, 30, 255))
    px(d, 50, 30, 6, 6, (180, 20, 30, 255))
    px(d, 28, 72, 10, 8, (120, 30, 30, 255))  # stained paw
    return bob(im, dy)


def reptile_frame(dy: int) -> Image.Image:
    im, d = canvas()
    px(d, 32, 80, 12, 6, (40, 80, 50, 255))
    px(d, 52, 80, 12, 6, (180, 40, 90, 255))  # glam boot
    px(d, 34, 50, 28, 32, (40, 130, 70, 255))
    px(d, 32, 38, 32, 16, (200, 50, 110, 255))  # sequin jacket
    px(d, 36, 16, 24, 24, (50, 150, 80, 255))
    px(d, 32, 12, 8, 10, (40, 110, 60, 255))  # crest
    px(d, 42, 24, 5, 5, (240, 240, 80, 255))
    px(d, 50, 24, 5, 5, (240, 240, 80, 255))
    px(d, 58, 42, 6, 18, (30, 30, 30, 255))  # mic
    px(d, 56, 36, 10, 10, (80, 80, 80, 255))
    return bob(im, dy)


def naga_frame(dy: int) -> Image.Image:
    im, d = canvas()
    # coil
    px(d, 22, 64, 52, 18, (50, 90, 70, 255))
    px(d, 18, 70, 20, 12, (70, 120, 90, 255))
    px(d, 58, 70, 22, 10, (40, 80, 60, 255))
    px(d, 70, 58, 12, 16, (90, 40, 40, 255))  # stripe
    # torso
    px(d, 36, 34, 24, 32, (210, 180, 140, 255))
    px(d, 34, 38, 28, 10, (40, 50, 70, 255))  # athletic strap
    px(d, 38, 14, 22, 22, (210, 180, 140, 255))
    px(d, 36, 10, 26, 8, (30, 30, 30, 255))  # goggles
    px(d, 42, 12, 6, 4, (80, 200, 220, 255))
    px(d, 52, 12, 6, 4, (80, 200, 220, 255))
    px(d, 44, 24, 4, 4, (20, 20, 20, 255))
    px(d, 52, 24, 4, 4, (20, 20, 20, 255))
    return bob(im, dy)


def idle(make) -> list[Image.Image]:
    return [make(0), make(-2), make(0), make(2)]


def circus_floor() -> None:
    size = 1024
    im = Image.new("RGB", (size, size), (28, 14, 18))
    d = ImageDraw.Draw(im)
    cx = cy = size // 2
    # tent stripes
    for i in range(0, 360, 12):
        color = (120, 28, 40) if (i // 12) % 2 == 0 else (160, 110, 40)
        r = 520
        a0 = math.radians(i - 6)
        a1 = math.radians(i + 6)
        d.polygon(
            [
                (cx, cy),
                (cx + r * math.cos(a0), cy + r * math.sin(a0)),
                (cx + r * math.cos(a1), cy + r * math.sin(a1)),
            ],
            fill=color,
        )
    # sawdust ring
    d.ellipse([cx - 280, cy - 280, cx + 280, cy + 280], fill=(150, 120, 70))
    d.ellipse([cx - 220, cy - 220, cx + 220, cy + 220], fill=(120, 90, 50))
    d.ellipse([cx - 40, cy - 40, cx + 40, cy + 40], fill=(50, 30, 24))
    # bleachers vignette
    overlay = Image.new("RGB", (size, size), (10, 6, 8))
    mask = Image.new("L", (size, size), 0)
    md = ImageDraw.Draw(mask)
    md.ellipse([80, 80, size - 80, size - 80], fill=255)
    mask = mask.filter(ImageFilter.GaussianBlur(40))
    im = Image.composite(im, overlay, mask)
    dest = ROOT / "floors" / "4.jpg"
    dest.parent.mkdir(parents=True, exist_ok=True)
    im.save(dest, quality=88)


def main() -> None:
    circus_floor()
    sheet_gif(idle(clown_frame), ROOT / "sprites/mobs/clown.gif")
    sheet_gif(idle(weasel_frame), ROOT / "sprites/mobs/weasel.gif")
    sheet_gif(idle(rhino_frame), ROOT / "sprites/races/rhino.gif")
    sheet_gif(idle(bunny_frame), ROOT / "sprites/races/bunny.gif")
    sheet_gif(idle(reptile_frame), ROOT / "sprites/races/reptile.gif")
    sheet_gif(idle(naga_frame), ROOT / "sprites/races/naga.gif")
    print("wrote circus art")


if __name__ == "__main__":
    main()
