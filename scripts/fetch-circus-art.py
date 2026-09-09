#!/usr/bin/env python3
"""Build-time circus sprites. Imagine tools generate but cannot persist files here."""

from __future__ import annotations

import base64
import json
import os
import sys
import urllib.error
import urllib.request
from pathlib import Path

API = "https://api.x.ai/v1/images/generations"
MODEL = "grok-imagine-image-2.0"
ROOT = Path("/workspace")

PROMPTS: dict[str, tuple[str, str]] = {
    "clown": (
        "sprite",
        "A 2x2 sprite sheet of an undead circus clown idle loop, exactly four equal cells with no borders or divider lines. Three-quarter view from slightly above, full body, painterly clean HD game miniature, grimy dungeon-crawler board-game style. Rotting carnival clown in a tattered red-and-cream striped suit, filthy ruff collar, cracked white greasepaint, empty black eye sockets, a painted red grin over a torn mouth, tufts of faded crimson hair, oversized muddy shoes. Subtle idle: weight shift left, ruff bob, head tilt, settle. Solid flat #FF00FF magenta background filling every pixel outside the clown. Same identity, same scale, same feet line in every cell. Entire body stays inside the central 65 percent of each cell with generous magenta margin; no limb, ruff, or hair crossing a cell edge. No text, no labels, no UI, no ground shadow.",
    ),
    "weasel": (
        "sprite",
        "A 2x2 sprite sheet of an undead circus weasel idle loop, exactly four equal cells with no borders or divider lines. Three-quarter view from slightly above, full body, painterly clean HD game miniature, grimy dungeon-crawler board-game style. Emaciated rotting weasel standing on hind legs, matted brown-grey fur, visible ribs, yellowed fangs, one milky eye, a torn red circus collar, a limp striped tail. Hungry and twitchy. Subtle idle: lean forward, snout snap, tail flick, settle. Solid flat #FF00FF magenta background filling every pixel outside the weasel. Same identity, same scale, same feet line in every cell. Entire body including tail stays inside the central 65 percent of each cell with generous magenta margin; nothing crosses a cell edge. No text, no labels, no UI, no ground shadow.",
    ),
    "rhino": (
        "sprite",
        "A 2x2 sprite sheet of a rhinoceros-headed crawler idle loop, exactly four equal cells with no borders. Three-quarter view from slightly above, full body, painterly clean HD game miniature matching a visored dungeon-crawler survivor. Thick grey rhino body in a battered teal courier jacket and dark cargo pants, a heavy horn, a close-held pump shotgun against the torso, a worn messenger satchel. Grim, stocky, readable silhouette. Subtle idle: weight shift, horn dip, satchel settle, breath. Solid flat #FF00FF magenta background filling every pixel outside the figure. Same identity, same scale, same feet line in every cell. Entire body and shotgun stay inside the central 65 percent of each cell with generous magenta margin; nothing crosses a cell edge. No muzzle flash, no detached FX, no text, no labels, no UI, no ground shadow.",
    ),
    "bunny": (
        "sprite",
        "A 2x2 sprite sheet of a huge fluffy death-bunny crawler idle loop, exactly four equal cells with no borders. Three-quarter view from slightly above, full body, painterly clean HD game miniature, grimy dungeon-crawler board-game style. Massive cream-white rabbit with dense fur, long ears, blood-stained front paws, small angry red eyes, a torn dark jacket stretched over the bulk. Cute and lethal. Subtle idle: ear twitch, fur breathe, one paw flex, settle. Solid flat #FF00FF magenta background filling every pixel outside the bunny. Same identity, same scale, same feet line in every cell. Entire body and ears stay inside the central 65 percent of each cell with generous magenta margin; nothing crosses a cell edge. No text, no labels, no UI, no ground shadow.",
    ),
    "reptile": (
        "sprite",
        "A 2x2 sprite sheet of a reptilian popstar crawler idle loop, exactly four equal cells with no borders. Three-quarter view from slightly above, full body, painterly clean HD game miniature, grimy dungeon-crawler board-game style. Green scaled lizard-person in a sequined magenta stage jacket, one glam boot, a handheld mic held close to the chest, a short crest of spines, bright yellow eyes. Show-off stance. Subtle idle: hip shift, crest flick, mic tap, settle. Solid flat #FF00FF magenta background filling every pixel outside the figure. Same identity, same scale, same feet line in every cell. Entire body and mic stay inside the central 65 percent of each cell with generous magenta margin; nothing crosses a cell edge. No stage lights, no detached FX, no text, no labels, no UI, no ground shadow.",
    ),
    "naga": (
        "sprite",
        "A 2x2 sprite sheet of a naga speedster crawler idle loop, exactly four equal cells with no borders. Three-quarter view from slightly above, full body, painterly clean HD game miniature, grimy dungeon-crawler board-game style. Humanoid upper body with a coiled snake lower body, athletic teal racing straps, dark goggles on the forehead, olive-green scales, a lean coiled tail. Built for speed. Subtle idle: coil compress, goggles bounce, tail tip flick, settle. Solid flat #FF00FF magenta background filling every pixel outside the figure. Same identity, same scale, same feet line in every cell. Entire body and tail stay inside the central 65 percent of each cell with generous magenta margin; nothing crosses a cell edge. No motion lines, no detached FX, no text, no labels, no UI, no ground shadow.",
    ),
    "floor4": (
        "floor",
        "A cinematic painterly game-board backdrop of a deadly circus staged in a ruined city block at dusk. A collapsed red-and-gold striped circus tent dominates the square, ripped canvas, a sawdust ring, wrecked bleachers, carnival lights dead or sputtering, mud and ash. Distant ruined brick towers and overpasses like a grim dungeon-crawler city. Moody teal-pink dusk light, no people, no readable text, no logos, no UI. Square composition, top-down-ish aerial looking into the tent floor so a game board can sit on top. Matches a grimy illustrated board-game city, not a photo.",
    ),
}


def dest_for(name: str, kind: str) -> Path:
    if kind == "floor":
        return ROOT / "assets" / "floors" / "4-raw.jpg"
    return ROOT / "assets" / "sprites" / name / "raw-sheet.jpg"


def generate(prompt: str) -> bytes:
    key = os.environ.get("XAI_API_KEY")
    if not key:
        raise SystemExit("XAI_API_KEY missing")
    body = json.dumps(
        {
            "model": MODEL,
            "prompt": prompt,
            "n": 1,
            "aspect_ratio": "1:1",
            "resolution": "1k",
            "response_format": "b64_json",
        }
    ).encode()
    req = urllib.request.Request(
        API,
        data=body,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {key}",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=180) as res:
            payload = json.loads(res.read().decode())
    except urllib.error.HTTPError as e:
        err = e.read().decode(errors="replace")[:800]
        raise SystemExit(f"HTTP {e.code}: {err}") from e
    data = payload.get("data") or []
    if not data:
        raise SystemExit(f"empty response keys={list(payload.keys())}")
    item = data[0]
    if item.get("b64_json"):
        return base64.b64decode(item["b64_json"])
    url = item.get("url")
    if not url:
        raise SystemExit(f"no image payload keys={list(item.keys())}")
    with urllib.request.urlopen(url, timeout=60) as img:
        return img.read()


def main() -> None:
    names = sys.argv[1:] or list(PROMPTS)
    for name in names:
        if name not in PROMPTS:
            raise SystemExit(f"unknown asset {name}")
        kind, prompt = PROMPTS[name]
        dest = dest_for(name, kind)
        dest.parent.mkdir(parents=True, exist_ok=True)
        print(f"generating {name} -> {dest}", flush=True)
        blob = generate(prompt)
        dest.write_bytes(blob)
        print(f"  wrote {len(blob)} bytes", flush=True)


if __name__ == "__main__":
    main()
