import { dist, sameCell, wrapDelta, wrapOn, type Cell, type GameState } from "./model";

export type VCell = { r: number; c: number };

export type PosMap = {
  crawlers: Record<string, VCell>;
  mobs: Record<string, VCell>;
};

export type WalkMove = {
  bucket: "crawlers" | "mobs";
  id: string;
  from: Cell;
  to: Cell;
  wrap?: boolean;
};

export function snapshotPos(state: GameState): PosMap {
  return {
    crawlers: Object.fromEntries(state.crawlers.map((c) => [c.id, { r: c.pos.r, c: c.pos.c }])),
    mobs: Object.fromEntries(state.mobs.map((m) => [m.id, { r: m.pos.r, c: m.pos.c }])),
  };
}

export function orthoPath(from: Cell, to: Cell): Cell[] {
  const steps: Cell[] = [];
  let r = from.r;
  let c = from.c;
  while (r !== to.r) {
    r += Math.sign(to.r - r);
    steps.push({ r, c });
  }
  while (c !== to.c) {
    c += Math.sign(to.c - c);
    steps.push({ r, c });
  }
  return steps;
}

export function easeOutQuad(t: number): number {
  return 1 - (1 - t) * (1 - t);
}

export function reducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function wrapPath(from: Cell, to: Cell): Cell[] {
  const steps: Cell[] = [];
  let r = from.r;
  let c = from.c;
  const dr = wrapDelta(from.r, to.r);
  const dc = wrapDelta(from.c, to.c);
  const rEnd = from.r + dr;
  const cEnd = from.c + dc;
  while (r !== rEnd) {
    r += Math.sign(dr);
    steps.push({ r, c });
  }
  while (c !== cEnd) {
    c += Math.sign(dc);
    steps.push({ r, c });
  }
  return steps;
}

export function diffsFrom(before: PosMap, after: GameState, skip = new Set<string>()): WalkMove[] {
  const moves: WalkMove[] = [];
  const wrap = wrapOn(after);
  for (const c of after.crawlers) {
    if (skip.has(c.id) || c.out) continue;
    const from = before.crawlers[c.id];
    if (!from || sameCell(from, c.pos)) continue;
    if (dist(after, from, c.pos) >= 1) {
      moves.push({ bucket: "crawlers", id: c.id, from, to: c.pos, wrap });
    }
  }
  for (const m of after.mobs) {
    const from = before.mobs[m.id];
    if (!from || sameCell(from, m.pos)) continue;
    moves.push({ bucket: "mobs", id: m.id, from, to: m.pos, wrap });
  }
  return moves;
}

let walkGen = 0;

export function cancelWalk(): void {
  walkGen += 1;
}

export function walkPieces(
  moves: WalkMove[],
  opts: {
    setDisplay: (updater: (prev: PosMap | null) => PosMap | null) => void;
    onStep?: () => void;
    onDone: () => void;
    msPerTile?: number;
  },
): void {
  const gen = ++walkGen;
  const live = moves.filter((m) => !sameCell(m.from, m.to));
  let finished = false;
  const snapToEnd = () => {
    opts.setDisplay((prev) => {
      const next: PosMap = prev
        ? { crawlers: { ...prev.crawlers }, mobs: { ...prev.mobs } }
        : { crawlers: {}, mobs: {} };
      for (const m of moves) next[m.bucket][m.id] = { r: m.to.r, c: m.to.c };
      return next;
    });
  };
  const finish = () => {
    if (finished || gen !== walkGen) return;
    finished = true;
    clearTimeout(failsafe);
    snapToEnd();
    opts.onDone();
  };
  const ms = opts.msPerTile ?? 155;
  const failsafe = window.setTimeout(finish, Math.max(700, live.length * ms * 10 + 400));

  if (!live.length || reducedMotion()) {
    finish();
    return;
  }

  type Track = { move: WalkMove; path: Cell[]; i: number; t0: number };
  const tracks: Track[] = live.map((m) => ({
    move: m,
    path: [
      { r: m.from.r, c: m.from.c },
      ...(m.wrap ? wrapPath(m.from, m.to) : orthoPath(m.from, m.to)),
    ],
    i: 0,
    t0: 0,
  }));

  const apply = (updates: { bucket: WalkMove["bucket"]; id: string; pos: VCell }[]) => {
    opts.setDisplay((prev) => {
      if (!prev) return prev;
      const next: PosMap = { crawlers: { ...prev.crawlers }, mobs: { ...prev.mobs } };
      for (const u of updates) next[u.bucket][u.id] = u.pos;
      return next;
    });
  };

  opts.onStep?.();

  const tick = (now: number) => {
    if (gen !== walkGen) {
      clearTimeout(failsafe);
      return;
    }
    let allDone = true;
    const updates: { bucket: WalkMove["bucket"]; id: string; pos: VCell }[] = [];
    for (const tr of tracks) {
      const last = tr.path[tr.path.length - 1];
      if (tr.i >= tr.path.length - 1) {
        updates.push({ bucket: tr.move.bucket, id: tr.move.id, pos: last });
        continue;
      }
      allDone = false;
      if (!tr.t0) tr.t0 = now;
      const a = tr.path[tr.i];
      const b = tr.path[tr.i + 1];
      const t = Math.min(1, (now - tr.t0) / ms);
      const e = easeOutQuad(t);
      updates.push({
        bucket: tr.move.bucket,
        id: tr.move.id,
        pos: { r: a.r + (b.r - a.r) * e, c: a.c + (b.c - a.c) * e },
      });
      if (t >= 1) {
        tr.i += 1;
        tr.t0 = now;
        if (tr.i < tr.path.length - 1) opts.onStep?.();
      }
    }
    apply(updates);
    if (allDone) {
      finish();
      return;
    }
    requestAnimationFrame(tick);
  };

  requestAnimationFrame(tick);
}
