#!/usr/bin/env python3
"""Build-time floors 5–7 sprites and backdrops."""

from __future__ import annotations

import base64
import json
import os
import sys
import urllib.request
from pathlib import Path

API = "https://api.x.ai/v1/images/generations"
MODEL = "grok-imagine-image-2.0"
ROOT = Path("/workspace")

PROMPTS: dict[str, tuple[str, str]] = {
    "executive": (
        "sprite",
        "A 2x2 sprite sheet of a dungeon-crawler production executive monster idle loop, exactly four equal cells with no borders. Three-quarter view from slightly above, full body, painterly clean HD game miniature. A hulking suited horror in a ruined gold-and-charcoal executive suit, a cracked director visor over too many teeth, a clipboard fused into one forearm, expensive shoes caked in studio dust. Predatory, expensive, ugly. Subtle idle: visor tilt, suit breathe, clipboard twitch, settle. Solid flat #FF00FF magenta background. Same identity, same scale, same feet line. Entire body stays inside the central 60 percent of each cell with generous magenta margin; nothing crosses a cell edge. No text, no labels, no UI, no ground shadow.",
    ),
    "drone": (
        "sprite",
        "A 2x2 sprite sheet of a futuristic ping drone idle loop, exactly four equal cells with no borders. Three-quarter view from slightly above, painterly clean HD game miniature. A small chrome-and-cyan hovering security drone, one red optic, short antenna, compact disc body, no limbs. Subtle idle: hover bob, optic blink, antenna twitch, settle. Solid flat #FF00FF magenta background. Same identity, same scale. Entire drone stays inside the central 60 percent of each cell with generous magenta margin; nothing crosses a cell edge. No text, no labels, no UI, no ground shadow.",
    ),
    "hound": (
        "sprite",
        "A 2x2 sprite sheet of a hardlight wolf idle loop, exactly four equal cells with no borders. Three-quarter view from slightly above, full body, painterly clean HD game miniature. A translucent cyan-magenta holographic wolf made of hard light, visible wireframe ribs, glowing edges, lean hunting pose. Subtle idle: pace in place, ear flick, light pulse, settle. Solid flat #FF00FF magenta background. Same identity, same scale, same feet line. Entire body and tail stay inside the central 60 percent of each cell with generous magenta margin; nothing crosses a cell edge. No text, no labels, no UI, no ground shadow.",
    ),
    "feed": (
        "sprite",
        "A 2x2 sprite sheet of a live broadcast relay camera idle loop, exactly four equal cells with no borders. Three-quarter view from slightly above, painterly clean HD game miniature. A compact tripod camera gimbal with a glowing red LIVE lamp, battered studio metal, a small dish, no operator. Subtle idle: lamp pulse, gimbal tick, dish bob, settle. Solid flat #FF00FF magenta background. Same identity, same scale. Entire prop stays inside the central 60 percent of each cell with generous magenta margin; nothing crosses a cell edge. No text, no letters, no UI, no ground shadow.",
    ),
    "floor5": (
        "floor",
        "A cinematic painterly game-board backdrop of a ruined television control booth overlooking a dungeon city at night. Walls of dead CRT monitors, a cracked director glass, gold-and-teal studio light, cables like vines, an empty chair facing a ruined neighborhood below. Moody, grimy illustrated board-game city, aerial enough that a 5x5 board can sit on the floor. No people, no readable text, no logos, no UI. Square composition.",
    ),
    "floor6": (
        "floor",
        "A cinematic painterly game-board backdrop of a futuristic neon megacity rooftop grid in rain. Cyan and magenta signage, wet hardlight streets looping in a ring, holographic lanes, collapsed skybridges, a square plaza in the center for a game board. Night, rainy, grimy dungeon-crawler sci-fi, not a photo. No people, no readable text, no logos, no UI. Square composition, looking down.",
    ),
    "floor7": (
        "floor",
        "A cinematic painterly game-board backdrop of a crawler arena: a circular floodlit pit in a ruined stadium, sand and broken bleachers, mixed debris from a circus tent, neon wreckage, and old city brick. Looking down into the bowl so a game board can sit in the sand. Harsh white floodlights, blood-dark shadows, grimy illustrated board-game style, not a photo. No people, no readable text, no logos, no UI. Square composition.",
    ),
}


def dest_for(name: str, kind: str) -> Path:
    if kind == "floor":
        n = name.replace("floor", "")
        return ROOT / "assets" / "floors" / f"{n}-raw.jpg"
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
    with urllib.request.urlopen(req, timeout=180) as res:
        payload = json.loads(res.read().decode())
    return base64.b64decode(payload["data"][0]["b64_json"])


def main() -> None:
    names = sys.argv[1:] or list(PROMPTS)
    for name in names:
        kind, prompt = PROMPTS[name]
        dest = dest_for(name, kind)
        dest.parent.mkdir(parents=True, exist_ok=True)
        print(f"generating {name} -> {dest}", flush=True)
        blob = generate(prompt)
        dest.write_bytes(blob)
        print(f"  wrote {len(blob)} bytes", flush=True)


if __name__ == "__main__":
    main()
