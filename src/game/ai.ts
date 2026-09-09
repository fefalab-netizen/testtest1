import {
  BONUS_IDS,
  FLOOR_META,
  type GiftId,
  type RaceId,
} from "./floors";
import {
  type Cell,
  type GameState,
  crawlerNeeded,
  dist,
  feedsReady,
  bagOf,
  itemCap,
  legalMoves,
  neighbors,
  occupants,
  pvpOn,
  sameCell,
  stairsReady,
  stationAt,
  trapAt,
  mobsAt,
  wrapOn,
} from "./model";

function wouldHelp(state: GameState, crawlerIndex: number, loc: ReturnType<typeof stationAt>): number {
  if (!loc || loc === "ingress") return 0;
  const c = state.crawlers[crawlerIndex];
  let score = 0;
  for (const beat of c.beats) {
    if (beat.type === "visit" && beat.loc === loc) score += 220;
    if (beat.type === "seq" && beat.locs[beat.step] === loc) {
      score += beat.step + 1 === beat.locs.length ? 240 : 160;
    }
    if (beat.type === "any" && !beat.got.includes(loc)) {
      score += beat.got.length + 1 >= beat.need ? 200 : 90;
    }
    if (beat.type === "kill" && loc === "den") score += 120;
  }
  return score;
}

export function pickMove(state: GameState): Cell {
  const me = state.crawlers[state.current];
  const roll = state.roll ?? 1;
  const legal = legalMoves(state, me.pos, roll);
  const needed = crawlerNeeded(me);
  const wantsKill = me.beats.some((b) => b.type === "kill") || FLOOR_META[state.floor].winBy === "boss";
  const boss =
    state.mobs.find((m) => m.kind === "executive") ?? state.mobs.find((m) => m.kind === "boss");
  let best = legal[0];
  let bestScore = -Infinity;
  for (const cell of legal) {
    const loc = stationAt(state, cell);
    let s = wouldHelp(state, state.current, loc);
    if (!pvpOn(state) && me.hp <= 1 && loc === "saferoom") s += 260;
    if (bagOf(me).length < itemCap(state.floor) && loc === "kiosk") s += 70;
    if (!pvpOn(state) && me.hp < me.maxHp && loc === "saferoom") s += 40;
    if (needed.length && FLOOR_META[state.floor].winBy === "beats") {
      const d = Math.min(...needed.map((id) => dist(state, cell, state.locPos[id])));
      s -= d * 6;
    }
    if (stairsReady(state, state.current) && loc === "stairs") s += 420;
    if (state.floor === 5 && !state.enraged) {
      const exec = state.mobs.find((m) => m.kind === "executive");
      for (const feed of state.feeds.filter((f) => !f.cut)) {
        const watched = exec && dist(state, exec.pos, { r: feed.r, c: feed.c }) <= 1;
        if (sameCell(cell, feed) && !watched) s += 280;
        else if (!watched) s -= dist(state, cell, feed) * 10;
      }
      if (exec && dist(state, cell, exec.pos) <= 1) s -= 40;
    }
    if (boss && me.hp > 1 && (state.enraged || feedsReady(state) || boss.kind !== "executive")) {
      s -= dist(state, cell, boss.pos) * 8;
    }
    const trap = trapAt(state, cell);
    if (trap?.sprung) s -= 35;
    const mobs = mobsAt(state, cell);
    if (mobs.length) {
      if (me.hp <= 1) s -= 80;
      else s += wantsKill || loc === "den" || mobs.some((m) => m.kind === "boss" || m.kind === "executive") ? 90 : 10;
    }
    const others = occupants(state, cell, me.id);
    if (others.length) {
      if (pvpOn(state)) {
        const prey = others[0];
        s += me.hp >= prey.hp ? 220 : 40;
      } else {
        const leader = Math.max(...state.crawlers.map((c) => c.career + c.finished));
        if (others.some((o) => o.career + o.finished >= leader && o.finished >= me.finished)) s += 28;
        else s += 8;
      }
    }
    if (pvpOn(state)) {
      const prey = state.crawlers.filter((c) => !c.out && c.id !== me.id);
      if (prey.length) {
        const nearest = Math.min(...prey.map((c) => dist(state, cell, c.pos)));
        s -= nearest * 12;
      }
    }
    s += Math.random() * 4;
    if (s > bestScore) {
      bestScore = s;
      best = cell;
    }
  }
  return best;
}

export function pickBumpVictim(state: GameState): string {
  const me = state.crawlers[state.current];
  const others = occupants(state, me.pos, me.id);
  return [...others].sort((a, b) => b.career + b.finished - (a.career + a.finished))[0]?.id ?? others[0].id;
}

export function pickBumpDir(state: GameState): Cell {
  const victim = state.crawlers.find((c) => c.id === state.bumpVictimId);
  if (!victim) return { r: 0, c: 0 };
  const needed = crawlerNeeded(victim);
  const options = neighbors(victim.pos, wrapOn(state));
  let best = options[0];
  let bestScore = -Infinity;
  for (const cell of options) {
    let s = Math.random();
    if (needed.length) {
      const d = Math.min(...needed.map((id) => dist(state, cell, state.locPos[id])));
      s += d * 4;
    }
    const loc = stationAt(state, cell);
    if (loc && loc !== "ingress") s -= 6;
    if (trapAt(state, cell) && !trapAt(state, cell)?.sprung) s += 20;
    if (mobsAt(state, cell).length) s += 16;
    if (s > bestScore) {
      bestScore = s;
      best = cell;
    }
  }
  return best;
}

export function wantStim(state: GameState): boolean {
  const me = state.crawlers[state.current];
  return bagOf(me).includes("stim") && me.hp <= 1;
}

export function wantReroll(state: GameState): boolean {
  const me = state.crawlers[state.current];
  return Boolean(me.featured && state.roll != null && state.roll <= 2);
}

export function pickBonus(state: GameState): GiftId {
  const me = state.crawlers[state.bonusPicker ?? 0];
  if (!me) return BONUS_IDS[0];
  if (state.giftKind === "race") return pickRace(me);
  if (me.maxHp <= 3) return "iron";
  if (me.atkBonus < 1) return "loaded";
  if (me.moveBonus < 1) return "pace";
  if (me.hp < me.maxHp) return "iron";
  return "clip";
}

function pickRace(me: GameState["crawlers"][number]): RaceId {
  if (me.hp <= 2 || me.maxHp <= 3) return "bunny";
  if (me.atkBonus < 1) return "rhino";
  if (me.moveBonus < 1) return "naga";
  return "reptile";
}
