import {
  BONUSES,
  FINISH_TARGET,
  FLOOR_META,
  FLOOR_MS,
  MOB_INFO,
  PLAYABLE_FLOORS,
  RACES,
  isBonusId,
  isFloorId,
  isRaceId,
  type BonusId,
  type FloorId,
  type GiftId,
  type GiftKind,
  type MobKind,
  type RaceId,
} from "./floors";
import { CHEAT, isCheat, mobDie, playerDie } from "./cheat";

export { FINISH_TARGET, FLOOR_MS };
export const SIZE = 5;
export const MATCH_MS = FLOOR_MS;
export const HAND_SIZE = 2;
export const MAX_HP = 3;

export type LocId =
  | "ingress"
  | "saferoom"
  | "kiosk"
  | "camera"
  | "den"
  | "stairs";

export type Cell = { r: number; c: number };

export type ItemId = "stim" | "spike" | "ward" | "boots";

export type Beat =
  | {
      id: string;
      title: string;
      flavor: string;
      type: "visit";
      loc: LocId;
    }
  | {
      id: string;
      title: string;
      flavor: string;
      type: "seq";
      locs: LocId[];
      step: number;
    }
  | {
      id: string;
      title: string;
      flavor: string;
      type: "any";
      need: number;
      got: LocId[];
    }
  | {
      id: string;
      title: string;
      flavor: string;
      type: "kill";
      need: number;
      got: number;
    };

export type Crawler = {
  id: string;
  name: string;
  seat: 0 | 1 | 2 | 3;
  isHuman: boolean;
  pos: Cell;
  beats: Beat[];
  finished: number;
  career: number;
  hp: number;
  maxHp: number;
  item: ItemId | null;
  items: ItemId[];
  spike: boolean;
  ward: boolean;
  featured: boolean;
  boots: boolean;
  atkBonus: number;
  moveBonus: number;
  race: RaceId | null;
  out: boolean;
  kills: number;
  steps: number;
  awards: Award[];
};

export type Mob = {
  id: string;
  kind: MobKind;
  pos: Cell;
  hp: number;
  rest: number;
};

export type Trap = { r: number; c: number; sprung: boolean };

export type Feed = { r: number; c: number; cut: boolean };

export type Phase =
  | "roll"
  | "move"
  | "stay-ask"
  | "stairs-ask"
  | "bump-pick"
  | "bump-dir"
  | "combat"
  | "handoff"
  | "bonus"
  | "over";

export type AwardId = "annihilator" | "pacifist" | "traveler" | "sour";

export type Award = { id: AwardId; name: string; pts: number };

export const AWARD_INFO: Record<AwardId, { name: string; pts: number; blurb: string }> = {
  annihilator: { name: "Annihilator", pts: 2, blurb: "Most mobs killed." },
  pacifist: { name: "Pacifist", pts: 2, blurb: "No mobs killed." },
  traveler: { name: "Traveler", pts: 1, blurb: "Most steps walked." },
  sour: { name: "Sour Loser", pts: 1, blurb: "Fewest quests." },
};

export type Combat = {
  foeId: string;
  foeKind: "mob" | "crawler";
  crawlerIndex: number;
  resume: "landing" | "mobs";
  atk: number | null;
  def: number | null;
  result: "win" | "lose" | "tie" | null;
};

export type LogLine = { id: number; text: string };

export type GameState = {
  locAt: (LocId | null)[][];
  locPos: Record<LocId, Cell>;
  crawlers: Crawler[];
  current: number;
  phase: Phase;
  roll: number | null;
  deck: Beat[];
  log: LogLine[];
  viewers: number;
  remainingMs: number;
  winnerId: string | null;
  bumpVictimId: string | null;
  humanCount: number;
  lastFrom: Cell | null;
  mobs: Mob[];
  traps: Trap[];
  feeds: Feed[];
  enraged: boolean;
  stairsOpen: boolean;
  combat: Combat | null;
  floor: FloorId;
  bonusPicker: number | null;
  giftKind: GiftKind;
  winWhy: "beats" | "clock" | "boss" | "pvp" | null;
  streetDelay: number;
};

export const STATIONS: { id: LocId; label: string; short: string }[] = [
  { id: "ingress", label: "Ingress", short: "IN" },
  { id: "saferoom", label: "Saferoom", short: "SAFE" },
  { id: "kiosk", label: "Loot Kiosk", short: "LOOT" },
  { id: "camera", label: "Camera Nest", short: "CAM" },
  { id: "den", label: "Mob Den", short: "DEN" },
  { id: "stairs", label: "Stairwell", short: "STAIR" },
];

export const STATION_LABEL: Record<LocId, string> = Object.fromEntries(
  STATIONS.map((s) => [s.id, s.label]),
) as Record<LocId, string>;

export const STATION_BLURB: Record<LocId, string> = {
  ingress: "Drop-in. Zero HP dumps you here and knocks two quests off your total — except the Face-Off, where it cuts you.",
  saferoom: "Heal 1 if you are hurt. Stay to heal again. Mobs will not hunt you here.",
  kiosk: "Spits an item. One slot on floors 1–3, two slots from Floor Four on. Stay to pull again.",
  camera: "Locks featured. Burn it to reroll a move. Stay to lock it again.",
  den: "Trash hatches here. Kill one and the den waits a turn.",
  stairs: "Walk on when you have enough quests. Drop is your call.",
};

export const ITEM_INFO: Record<ItemId, { name: string; blurb: string }> = {
  stim: { name: "Stim", blurb: "Heal 1 on your roll." },
  spike: { name: "Spike", blurb: "+2 on the next swing." },
  ward: { name: "Ward", blurb: "Ignore the next trap." },
  boots: { name: "Boots", blurb: "+1 to your next move." },
};

const ITEM_BAG: ItemId[] = ["stim", "spike", "ward", "boots"];

export function itemCap(floor: number): number {
  return floor >= 4 ? 2 : 1;
}

export function bagOf(c: Pick<Crawler, "item" | "items">): ItemId[] {
  if (c.items?.length) return c.items;
  return c.item ? [c.item] : [];
}

function syncGear(c: Crawler, items: ItemId[]): Crawler {
  return {
    ...c,
    items,
    item: items[0] ?? null,
    spike: items.includes("spike"),
    ward: items.includes("ward"),
    boots: items.includes("boots"),
  };
}

function dropOne(items: ItemId[], id: ItemId): ItemId[] {
  const i = items.indexOf(id);
  if (i < 0) return items;
  return [...items.slice(0, i), ...items.slice(i + 1)];
}

const BOT_NAMES = ["Vex", "Noll", "Ives", "Marrow", "Quill", "Sable", "Pike", "Rowan"];

type BeatSeed =
  | { type: "visit"; loc: LocId; title: string; flavor: string }
  | { type: "seq"; locs: LocId[]; title: string; flavor: string }
  | { type: "any"; need: number; title: string; flavor: string }
  | { type: "kill"; need: number; title: string; flavor: string };

const BEAT_TEMPLATES: BeatSeed[] = [
  {
    type: "visit",
    loc: "saferoom",
    title: "Crash in the Saferoom",
    flavor: "Sit. Pretend this is rest.",
  },
  {
    type: "visit",
    loc: "camera",
    title: "Feed the Camera Nest",
    flavor: "Look up. Pretend you have a personality.",
  },
  {
    type: "visit",
    loc: "kiosk",
    title: "Crack the Loot Kiosk",
    flavor: "The machine hates you. Take something anyway.",
  },
  {
    type: "visit",
    loc: "den",
    title: "Clear the Mob Den",
    flavor: "Make a mess. Ratings love a mess.",
  },
  {
    type: "visit",
    loc: "stairs",
    title: "Tag the Stairwell",
    flavor: "If it is locked, unlock it with a corpse.",
  },
  {
    type: "any",
    need: 2,
    title: "Two Stations, One Take",
    flavor: "Hit any two different stations.",
  },
  {
    type: "seq",
    locs: ["den", "camera"],
    title: "Blood Then B-Roll",
    flavor: "Mob Den, then Camera Nest.",
  },
  {
    type: "seq",
    locs: ["kiosk", "saferoom"],
    title: "Grab and Hole Up",
    flavor: "Loot Kiosk, then Saferoom.",
  },
  {
    type: "kill",
    need: 1,
    title: "Make a Corpse",
    flavor: "Put a thing down. Anywhere.",
  },
];

let logSeq = 1;
let beatSeq = 1;
let mobSeq = 1;

export function manh(a: Cell, b: Cell): number {
  return Math.abs(a.r - b.r) + Math.abs(a.c - b.c);
}

export function wrapCoord(n: number): number {
  return ((n % SIZE) + SIZE) % SIZE;
}

export function wrapOn(state: Pick<GameState, "floor">): boolean {
  return FLOOR_META[state.floor].wrap;
}

export function pvpOn(state: Pick<GameState, "floor">): boolean {
  return FLOOR_META[state.floor].pvp;
}

export function dist(state: Pick<GameState, "floor">, a: Cell, b: Cell): number {
  if (!wrapOn(state)) return manh(a, b);
  const dr = Math.min(Math.abs(a.r - b.r), SIZE - Math.abs(a.r - b.r));
  const dc = Math.min(Math.abs(a.c - b.c), SIZE - Math.abs(a.c - b.c));
  return dr + dc;
}

export function wrapDelta(from: number, to: number): number {
  let d = to - from;
  if (d > SIZE / 2) d -= SIZE;
  if (d < -SIZE / 2) d += SIZE;
  return d;
}

export function inBounds(cell: Cell): boolean {
  return cell.r >= 0 && cell.c >= 0 && cell.r < SIZE && cell.c < SIZE;
}

export function neighbors(cell: Cell, wrap = false): Cell[] {
  const raw = [
    { r: cell.r - 1, c: cell.c },
    { r: cell.r + 1, c: cell.c },
    { r: cell.r, c: cell.c - 1 },
    { r: cell.r, c: cell.c + 1 },
  ];
  if (!wrap) return raw.filter(inBounds);
  return raw.map((n) => ({ r: wrapCoord(n.r), c: wrapCoord(n.c) }));
}

export function sameCell(a: Cell, b: Cell): boolean {
  return a.r === b.r && a.c === b.c;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function d6(): number {
  return mobDie();
}

function crawlerDie(): number {
  return playerDie();
}

function cloneBeat(template: BeatSeed): Beat {
  const id = `beat-${beatSeq++}`;
  if (template.type === "visit") {
    return { id, type: "visit", loc: template.loc, title: template.title, flavor: template.flavor };
  }
  if (template.type === "seq") {
    return { id, type: "seq", locs: template.locs, step: 0, title: template.title, flavor: template.flavor };
  }
  if (template.type === "kill") {
    return { id, type: "kill", need: template.need, got: 0, title: template.title, flavor: template.flavor };
  }
  return { id, type: "any", need: template.need, got: [], title: template.title, flavor: template.flavor };
}

function buildDeck(): Beat[] {
  const copies: Beat[] = [];
  for (let n = 0; n < 3; n++) {
    for (const t of BEAT_TEMPLATES) copies.push(cloneBeat(t));
  }
  return shuffle(copies);
}

function placeLocations(): { locAt: (LocId | null)[][]; locPos: Record<LocId, Cell> } {
  const locAt: (LocId | null)[][] = Array.from({ length: SIZE }, () =>
    Array<LocId | null>(SIZE).fill(null),
  );
  const locPos = {} as Record<LocId, Cell>;
  const ingress: Cell = { r: SIZE - 1, c: 2 };
  locAt[ingress.r][ingress.c] = "ingress";
  locPos.ingress = ingress;

  const rest: LocId[] = ["saferoom", "kiosk", "camera", "den", "stairs"];
  const taken: Cell[] = [ingress];
  const candidates: Cell[] = [];
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (!(r === ingress.r && c === ingress.c)) candidates.push({ r, c });
    }
  }

  for (const loc of rest) {
    let best: Cell = candidates[0];
    let bestScore = -Infinity;
    for (const cell of candidates) {
      if (taken.some((t) => sameCell(t, cell))) continue;
      const min = Math.min(...taken.map((t) => manh(t, cell)));
      const score = min * 10 + Math.random();
      if (score > bestScore) {
        bestScore = score;
        best = cell;
      }
    }
    locAt[best.r][best.c] = loc;
    locPos[loc] = best;
    taken.push(best);
  }
  return { locAt, locPos };
}

function neededLocs(beat: Beat): LocId[] {
  if (beat.type === "visit") return [beat.loc];
  if (beat.type === "seq") return [beat.locs[beat.step]];
  if (beat.type === "kill") return ["den"];
  const stations: LocId[] = ["saferoom", "kiosk", "camera", "den", "stairs"];
  return stations.filter((id) => !beat.got.includes(id));
}

export function crawlerNeeded(c: Crawler): LocId[] {
  const set = new Set<LocId>();
  for (const b of c.beats) for (const l of neededLocs(b)) set.add(l);
  return [...set];
}

export function stationAt(state: GameState, cell: Cell): LocId | null {
  return state.locAt[cell.r][cell.c];
}

export function occupants(state: GameState, cell: Cell, exceptId?: string): Crawler[] {
  return state.crawlers.filter((c) => !c.out && sameCell(c.pos, cell) && c.id !== exceptId);
}

export function mobsAt(state: GameState, cell: Cell): Mob[] {
  return state.mobs.filter((m) => sameCell(m.pos, cell));
}

export function trapAt(state: GameState, cell: Cell): Trap | undefined {
  return state.traps.find((t) => t.r === cell.r && t.c === cell.c);
}

export function legalMoves(state: GameState, from: Cell, roll: number): Cell[] {
  const out: Cell[] = [];
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const cell = { r, c };
      const d = dist(state, from, cell);
      if (d >= 1 && d <= roll) out.push(cell);
    }
  }
  return out;
}

export function feedsReady(state: GameState): boolean {
  if (!state.feeds.length) return true;
  return state.feeds.every((f) => f.cut);
}

export function feedAt(state: GameState, cell: Cell): Feed | undefined {
  return state.feeds.find((f) => f.r === cell.r && f.c === cell.c);
}

function isStation(loc: LocId | null): loc is Exclude<LocId, "ingress"> {
  return loc !== null && loc !== "ingress";
}

function progressBeat(beat: Beat, loc: LocId): { beat: Beat; completed: boolean } {
  if (beat.type === "kill") return { beat, completed: false };
  if (!isStation(loc)) return { beat, completed: false };
  if (beat.type === "visit") return { beat, completed: beat.loc === loc };
  if (beat.type === "seq") {
    if (beat.locs[beat.step] !== loc) return { beat, completed: false };
    const step = beat.step + 1;
    if (step >= beat.locs.length) return { beat: { ...beat, step }, completed: true };
    return { beat: { ...beat, step }, completed: false };
  }
  if (beat.got.includes(loc)) return { beat, completed: false };
  const got = [...beat.got, loc];
  return { beat: { ...beat, got }, completed: got.length >= beat.need };
}

function pushLog(state: GameState, text: string): GameState {
  return {
    ...state,
    log: [{ id: logSeq++, text }, ...state.log].slice(0, 14),
  };
}

export function formatTime(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}

export function formatViewers(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${Math.round(n / 100) / 10}K`;
  return String(Math.round(n));
}

const LINES = {
  roll6: ["Six. Production just sat up.", "A clean six. Don't waste it walking into teeth."],
  complete: [
    "Quest closed. The box office liked the panic in your shoulders.",
    "That's a wrap on that quest. Keep moving before the audience changes the channel.",
  ],
  bump: ["You walked into someone. That's called content.", "Shoulder check, live."],
  win: ["Broadcast over. Someone actually finished the assignment."],
  clock: ["Clock's dead. We score what we have."],
  loot: ["Kiosk spat something ugly. Keep it."],
  trap: ["Floor bit you. That's a trap. We put it there on purpose."],
  ward: ["Ward ate the trap. Cute. It's gone now."],
  heal: ["Saferoom clocked. You are slightly less dead."],
  cam: ["Camera Nest locked. You're featured. Try not to waste the reroll."],
  kill: ["It drops. The cheap seats are screaming."],
  broodWin: ["Broodmother lens goes dark. Stairwell is a station now."],
  bossHit: ["The Recap staggers. One more and the hour is yours."],
  bossWin: ["The Recap dies on camera. That's the season."],
  hit: ["It hit you. Smile — that's the money shot."],
  ko: ["You died on camera. Ingress. Two quests off the board."],
  glance: ["Glancing blow. Nobody committed. Boring."],
  survive: ["Floor closed. Survivors pick a gift. It stays with you."],
  racePick: ["The Recap is dead. Pick a race. The circus wants a costume."],
  circus: ["Canvas, sawdust, and things that used to sell popcorn."],
  edited: ["Edited out. It never aired. Cut the feeds."],
  feedCut: ["Live feed goes dark."],
  feedWatch: ["Too close. The Executive is watching this relay."],
  enrage: ["The feeds are dead. It can bleed now. It is also faster."],
  execHit: ["The Executive staggers. Production hates this."],
  execWin: ["The Executive dies on its own show. That's the hour."],
  wrap: ["You stepped off the world and came in the other side."],
  pvpWin: ["Last crawler standing. The bowl is yours."],
  pvpKo: ["That's a cut. They are out of the bowl."],
  pvpOut: ["You dropped in the bowl. That's elimination, not Ingress."],
  denWait: ["The den goes quiet. Walk while it is empty."],
};

function pick(list: string[]): string {
  return list[Math.floor(Math.random() * list.length)];
}

function makeMob(kind: MobKind, pos: Cell): Mob {
  return {
    id: `m-${mobSeq++}`,
    kind,
    pos: { ...pos },
    hp: MOB_INFO[kind].hp,
    rest: 0,
  };
}

function emptyCells(state: Pick<GameState, "locAt">): Cell[] {
  const out: Cell[] = [];
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (!state.locAt[r][c]) out.push({ r, c });
    }
  }
  return out;
}

function spawnSpot(locAt: (LocId | null)[][], locPos: Record<LocId, Cell>, taken: Cell[]): Cell {
  const den = locPos.den;
  const adj = neighbors(den).filter(
    (n) => locAt[n.r][n.c] !== "saferoom" && !taken.some((t) => sameCell(t, n)),
  );
  if (adj.length) return adj[0];
  if (!taken.some((t) => sameCell(t, den))) return den;
  const empties = emptyCells({ locAt }).filter((c) => !taken.some((t) => sameCell(t, c)));
  return empties[0] ?? den;
}

function spawnFloorEntities(
  floor: FloorId,
  locAt: (LocId | null)[][],
  locPos: Record<LocId, Cell>,
): { traps: Trap[]; mobs: Mob[]; stairsOpen: boolean; feeds: Feed[] } {
  const meta = FLOOR_META[floor];
  const empties = shuffle(emptyCells({ locAt }));
  const traps: Trap[] = empties.slice(0, meta.traps).map((c) => ({ ...c, sprung: false }));
  const used = new Set(traps.map((t) => `${t.r},${t.c}`));
  const mobs: Mob[] = [];
  const taken: Cell[] = [];
  for (const kind of meta.streetKinds) {
    const pos = spawnSpot(locAt, locPos, taken);
    mobs.push(makeMob(kind, pos));
    taken.push(pos);
  }
  if (meta.gate === "brood") {
    mobs.push(makeMob("brood", locPos.stairs));
  }
  if (meta.gate === "boss" || meta.gate === "executive") {
    const mid: Cell = { r: 2, c: 2 };
    const blocked = locAt[mid.r][mid.c] === "saferoom";
    const pos = blocked ? (empties[0] ?? locPos.den) : mid;
    mobs.push(makeMob(meta.gate, pos));
    taken.push(pos);
  }
  const feeds: Feed[] = [];
  const feedPool = empties.filter((c) => !used.has(`${c.r},${c.c}`) && !taken.some((t) => sameCell(t, c)));
  for (const cell of feedPool) {
    if (feeds.length >= meta.feeds) break;
    if (feeds.some((f) => manh(f, cell) < 2)) continue;
    feeds.push({ r: cell.r, c: cell.c, cut: false });
  }
  while (feeds.length < meta.feeds && feedPool.length) {
    const cell = feedPool.pop()!;
    if (feeds.some((f) => f.r === cell.r && f.c === cell.c)) continue;
    feeds.push({ r: cell.r, c: cell.c, cut: false });
  }
  return { traps, mobs, stairsOpen: meta.stairsOpen, feeds };
}

function mapCrawler(state: GameState, index: number, fn: (c: Crawler) => Crawler): GameState {
  return {
    ...state,
    crawlers: state.crawlers.map((c, i) => (i === index ? fn(c) : c)),
  };
}

function drawToHand(state: GameState, crawlerIndex: number): GameState {
  const crawlers = state.crawlers.map((c) => ({ ...c, beats: [...c.beats] }));
  const c = crawlers[crawlerIndex];
  let deck = [...state.deck];
  while (c.beats.length < HAND_SIZE && deck.length) {
    c.beats.push(deck.pop()!);
  }
  return { ...state, crawlers, deck };
}

export function startFloor(state: GameState, floor: FloorId): GameState {
  const { locAt, locPos } = placeLocations();
  const { traps, mobs, stairsOpen, feeds } = spawnFloorEntities(floor, locAt, locPos);
  const deck = buildDeck();
  const crawlers = state.crawlers.map((c) => {
    const items = bagOf(c).slice(0, itemCap(floor));
    return {
      ...syncGear(c, items),
      pos: { ...locPos.ingress },
      finished: 0,
      featured: false,
      beats: [] as Beat[],
      out: false,
    };
  });
  let next: GameState = {
    ...state,
    floor,
    locAt,
    locPos,
    traps,
    feeds,
    enraged: false,
    mobs,
    stairsOpen,
    deck,
    crawlers,
    current: 0,
    phase: "roll",
    roll: null,
    bumpVictimId: null,
    lastFrom: null,
    combat: null,
    bonusPicker: null,
    remainingMs: FLOOR_MS,
    winnerId: null,
    winWhy: null,
    streetDelay: 0,
  };
  for (let i = 0; i < next.crawlers.length; i++) next = drawToHand(next, i);
  next = pushLog(next, FLOOR_META[floor].openLine);
  return next;
}

export function createMatch(opts: {
  total: number;
  humans: number;
  handles: string[];
}): GameState {
  const total = Math.min(4, Math.max(2, opts.total));
  const humans = Math.min(total, Math.max(1, opts.humans));
  const names = shuffle(BOT_NAMES);
  const crawlers: Crawler[] = [];
  for (let i = 0; i < total; i++) {
    const isHuman = i < humans;
    const name = isHuman
      ? opts.handles[i]?.trim() || (i === 0 ? "Crawler" : `Crawler ${i + 1}`)
      : names[i];
    crawlers.push({
      id: `c-${i}`,
      name,
      seat: i as 0 | 1 | 2 | 3,
      isHuman,
      pos: { r: 0, c: 0 },
      beats: [],
      finished: 0,
      career: 0,
      hp: MAX_HP,
      maxHp: MAX_HP,
      item: null,
      items: [],
      spike: false,
      ward: false,
      featured: false,
      boots: false,
      atkBonus: 0,
      moveBonus: 0,
      race: null,
      out: false,
      kills: 0,
      steps: 0,
      awards: [],
    });
  }
  const skeleton: GameState = {
    locAt: [],
    locPos: {} as Record<LocId, Cell>,
    crawlers,
    current: 0,
    phase: "roll",
    roll: null,
    deck: [],
    log: [],
    viewers: 1_180_000 + Math.floor(Math.random() * 40000),
    remainingMs: FLOOR_MS,
    winnerId: null,
    bumpVictimId: null,
    humanCount: humans,
    lastFrom: null,
    mobs: [],
    traps: [],
    feeds: [],
    enraged: false,
    stairsOpen: false,
    combat: null,
    floor: 1,
    bonusPicker: null,
    giftKind: "gift",
    winWhy: null,
    streetDelay: 0,
  };
  return startFloor(skeleton, 1);
}

function closeBeats(
  state: GameState,
  crawlerIndex: number,
  pred: (b: Beat) => { beat: Beat; completed: boolean },
): GameState {
  const crawlers = state.crawlers.map((c) => ({
    ...c,
    beats: c.beats.map((b) => ({ ...b }) as Beat),
  }));
  const c = crawlers[crawlerIndex];
  const kept: Beat[] = [];
  let closed = 0;
  for (const beat of c.beats) {
    const { beat: next, completed } = pred(beat);
    if (completed) {
      c.finished += 1;
      closed += 1;
    } else kept.push(next);
  }
  c.beats = kept;
  let next: GameState = {
    ...state,
    crawlers,
    viewers: state.viewers + closed * (8000 + Math.floor(Math.random() * 12000)),
  };
  if (closed) {
    next = pushLog(next, `${c.name}: ${pick(LINES.complete)}`);
    next = drawToHand(next, crawlerIndex);
  }
  return next;
}

export function stairsReady(state: GameState, crawlerIndex: number): boolean {
  if (pvpOn(state)) return false;
  if (!state.stairsOpen) return false;
  if (FLOOR_META[state.floor].winBy !== "beats") return false;
  return state.crawlers[crawlerIndex].finished >= FINISH_TARGET;
}

export function canTakeStairs(state: GameState, crawlerIndex: number): boolean {
  if (!stairsReady(state, crawlerIndex)) return false;
  return stationAt(state, state.crawlers[crawlerIndex].pos) === "stairs";
}

function afterFloor(state: GameState): GameState {
  const upcoming = state.floor + 1;
  if (!isFloorId(upcoming) || upcoming > PLAYABLE_FLOORS) {
    return endMatch(state, "beats");
  }
  return beginBonus(state);
}

function resolveVisit(state: GameState, crawlerIndex: number): GameState {
  const loc = stationAt(state, state.crawlers[crawlerIndex].pos);
  if (!loc || loc === "ingress") return state;
  if (loc === "stairs" && !state.stairsOpen) return state;
  return closeBeats(state, crawlerIndex, (beat) => progressBeat(beat, loc));
}

function creditKill(state: GameState, crawlerIndex: number): GameState {
  const next = mapCrawler(state, crawlerIndex, (c) => ({ ...c, kills: (c.kills ?? 0) + 1 }));
  return closeBeats(next, crawlerIndex, (beat) => {
    if (beat.type !== "kill") return { beat, completed: false };
    const got = beat.got + 1;
    return { beat: { ...beat, got }, completed: got >= beat.need };
  });
}

export function applyAchievements(state: GameState): GameState {
  const pack = state.crawlers;
  const maxKills = Math.max(0, ...pack.map((c) => c.kills ?? 0));
  const maxSteps = Math.max(0, ...pack.map((c) => c.steps ?? 0));
  const minQuests = Math.min(...pack.map((c) => (c.career ?? 0) + (c.finished ?? 0)));
  const crawlers = pack.map((c) => {
    const kills = c.kills ?? 0;
    const steps = c.steps ?? 0;
    const quests = (c.career ?? 0) + (c.finished ?? 0);
    const awards: Award[] = [];
    if (maxKills > 0 && kills === maxKills) {
      awards.push({ id: "annihilator", name: AWARD_INFO.annihilator.name, pts: AWARD_INFO.annihilator.pts });
    }
    if (kills === 0) {
      awards.push({ id: "pacifist", name: AWARD_INFO.pacifist.name, pts: AWARD_INFO.pacifist.pts });
    }
    if (maxSteps > 0 && steps === maxSteps) {
      awards.push({ id: "traveler", name: AWARD_INFO.traveler.name, pts: AWARD_INFO.traveler.pts });
    }
    if (quests === minQuests) {
      awards.push({ id: "sour", name: AWARD_INFO.sour.name, pts: AWARD_INFO.sour.pts });
    }
    const bonus = awards.reduce((n, a) => n + a.pts, 0);
    return { ...c, kills, steps, awards, career: (c.career ?? 0) + bonus };
  });
  return { ...state, crawlers };
}

function endMatch(state: GameState, why: "beats" | "clock" | "boss" | "pvp", winnerId?: string): GameState {
  const scored = applyAchievements(state);
  const id = winnerId ?? scoreWinner(scored);
  const line =
    why === "clock"
      ? pick(LINES.clock)
      : why === "boss"
        ? pick(LINES.bossWin)
        : why === "pvp"
          ? pick(LINES.pvpWin)
          : pick(LINES.win);
  return pushLog(
    {
      ...scored,
      phase: "over",
      winnerId: id,
      winWhy: why,
      roll: null,
      bumpVictimId: null,
      combat: null,
      bonusPicker: null,
    },
    line,
  );
}

export function scoreWinner(state: GameState): string {
  const ranked = [...state.crawlers].sort((a, b) => {
    if (a.out !== b.out) return a.out ? 1 : -1;
    const ca = a.career + a.finished;
    const cb = b.career + b.finished;
    if (cb !== ca) return cb - ca;
    if (b.hp !== a.hp) return b.hp - a.hp;
    const da = dist(state, a.pos, state.locPos.stairs);
    const db = dist(state, b.pos, state.locPos.stairs);
    if (da !== db) return da - db;
    return 0;
  });
  return ranked[0].id;
}

export function knockOut(state: GameState, crawlerIndex: number): GameState {
  if (pvpOn(state)) {
    let next = mapCrawler(state, crawlerIndex, (c) => ({
      ...syncGear(c, []),
      hp: 0,
      out: true,
      featured: false,
    }));
    next = pushLog(next, `${state.crawlers[crawlerIndex].name}: ${pick(LINES.pvpOut)}`);
    next = { ...next, viewers: next.viewers + 14000 };
    return maybePvpWin(next);
  }
  let next = mapCrawler(state, crawlerIndex, (c) => {
    let cut = 2;
    const floorPts = Math.max(0, c.finished ?? 0);
    const fromFloor = Math.min(cut, floorPts);
    cut -= fromFloor;
    const fromCareer = Math.min(cut, Math.max(0, c.career ?? 0));
    return {
      ...syncGear(c, []),
      hp: c.maxHp,
      pos: { ...state.locPos.ingress },
      featured: false,
      finished: floorPts - fromFloor,
      career: Math.max(0, (c.career ?? 0) - fromCareer),
    };
  });
  next = drawToHand(next, crawlerIndex);
  next = pushLog(next, `${state.crawlers[crawlerIndex].name}: ${pick(LINES.ko)}`);
  return { ...next, viewers: next.viewers + 9000 };
}

function maybePvpWin(state: GameState): GameState {
  if (!pvpOn(state) || state.phase === "over") return state;
  const alive = state.crawlers.filter((c) => !c.out);
  if (alive.length <= 1) {
    return endMatch(state, "pvp", alive[0]?.id);
  }
  return state;
}

function springTrap(state: GameState, cell: Cell, crawlerIndex: number): GameState {
  const trap = trapAt(state, cell);
  if (!trap || trap.sprung) return state;
  const traps = state.traps.map((t) =>
    t.r === cell.r && t.c === cell.c ? { ...t, sprung: true } : t,
  );
  let next: GameState = { ...state, traps };
  const c = next.crawlers[crawlerIndex];
  if (c.ward) {
    next = mapCrawler(next, crawlerIndex, (x) => syncGear(x, dropOne(bagOf(x), "ward")));
    return pushLog(next, pick(LINES.ward));
  }
  next = mapCrawler(next, crawlerIndex, (x) => ({ ...x, hp: x.hp - 1 }));
  next = pushLog(next, pick(LINES.trap));
  next = { ...next, viewers: next.viewers + 4000 };
  if (next.crawlers[crawlerIndex].hp <= 0) next = knockOut(next, crawlerIndex);
  return next;
}

function grantItem(state: GameState, crawlerIndex: number, forced?: ItemId): GameState {
  const item = forced ?? ITEM_BAG[Math.floor(Math.random() * ITEM_BAG.length)];
  const cap = itemCap(state.floor);
  const bag = bagOf(state.crawlers[crawlerIndex]);
  const dropped = bag.length >= cap ? bag[0] : null;
  const items = bag.length < cap ? [...bag, item] : [...bag.slice(1), item];
  let next = mapCrawler(state, crawlerIndex, (c) => syncGear(c, items));
  next = pushLog(
    next,
    dropped
      ? `Dropped ${ITEM_INFO[dropped].name}. ${ITEM_INFO[item].name}. ${pick(LINES.loot)}`
      : `${ITEM_INFO[item].name}. ${pick(LINES.loot)}`,
  );
  return next;
}

function stationFx(state: GameState, crawlerIndex: number): GameState {
  if (pvpOn(state)) return state;
  const loc = stationAt(state, state.crawlers[crawlerIndex].pos);
  if (loc === "kiosk") return grantItem(state, crawlerIndex);
  if (loc === "saferoom") {
    const c = state.crawlers[crawlerIndex];
    if (c.hp >= c.maxHp) return state;
    let next = mapCrawler(state, crawlerIndex, (x) => ({ ...x, hp: Math.min(x.maxHp, x.hp + 1) }));
    return pushLog(next, pick(LINES.heal));
  }
  if (loc === "camera") {
    let next = mapCrawler(state, crawlerIndex, (x) => ({ ...x, featured: true }));
    next = { ...next, viewers: next.viewers + 11000 };
    return pushLog(next, pick(LINES.cam));
  }
  return state;
}

function beginCombat(
  state: GameState,
  crawlerIndex: number,
  foe: Mob,
  resume: Combat["resume"],
): GameState {
  return {
    ...state,
    phase: "combat",
    combat: {
      foeId: foe.id,
      foeKind: "mob",
      crawlerIndex,
      resume,
      atk: null,
      def: null,
      result: null,
    },
  };
}

function beginPvP(
  state: GameState,
  crawlerIndex: number,
  foe: Crawler,
  resume: Combat["resume"],
): GameState {
  return {
    ...state,
    phase: "combat",
    combat: {
      foeId: foe.id,
      foeKind: "crawler",
      crawlerIndex,
      resume,
      atk: null,
      def: null,
      result: null,
    },
  };
}

function ensureGate(state: GameState): GameState {
  const gate = FLOOR_META[state.floor].gate;
  if (!gate) return state;
  if (gate === "brood" && state.stairsOpen) return state;
  if (state.mobs.some((m) => m.kind === gate)) return state;
  const pos =
    gate === "brood"
      ? state.locPos.stairs
      : state.mobs[0]?.pos ?? { r: 2, c: 2 };
  return { ...state, mobs: [...state.mobs, makeMob(gate, pos)] };
}

function landingCombat(state: GameState, crawlerIndex: number): Mob | null {
  const pos = state.crawlers[crawlerIndex].pos;
  const loc = stationAt(state, pos);
  if (loc === "saferoom" && !pvpOn(state)) return null;
  const here = mobsAt(state, pos);
  return here[0] ?? null;
}

function tryCutFeed(state: GameState, crawlerIndex: number): GameState {
  const pos = state.crawlers[crawlerIndex].pos;
  const feed = feedAt(state, pos);
  if (!feed || feed.cut) return state;
  const exec = state.mobs.find((m) => m.kind === "executive");
  if (exec && dist(state, exec.pos, pos) <= 1) {
    return pushLog(state, pick(LINES.feedWatch));
  }
  const feeds = state.feeds.map((f) =>
    f.r === pos.r && f.c === pos.c ? { ...f, cut: true } : f,
  );
  let next: GameState = pushLog({ ...state, feeds }, pick(LINES.feedCut));
  next = { ...next, viewers: next.viewers + 8000 };
  if (feeds.every((f) => f.cut) && !next.enraged) {
    next = { ...next, enraged: true };
    next = pushLog(next, pick(LINES.enrage));
  }
  return next;
}

function resolveLanding(state: GameState, crawlerIndex: number): GameState {
  const pos = state.crawlers[crawlerIndex].pos;
  let next = springTrap(state, pos, crawlerIndex);
  if (next.phase === "over" || next.phase === "bonus") return next;
  next = tryCutFeed(next, crawlerIndex);
  next = stationFx(next, crawlerIndex);
  next = ensureGate(next);
  const foe = landingCombat(next, crawlerIndex);
  if (foe) return beginCombat(next, crawlerIndex, foe, "landing");
  next = resolveVisit(next, crawlerIndex);
  if (next.phase === "bonus" || next.phase === "over") return next;
  if (canTakeStairs(next, crawlerIndex)) return { ...next, phase: "stairs-ask" };
  return finishTurn(next);
}

function afterMoveCleanup(state: GameState): GameState {
  const me = state.crawlers[state.current];
  const loc = stationAt(state, me.pos);
  const others = occupants(state, me.pos, me.id).filter(
    (o) => pvpOn(state) || stationAt(state, o.pos) !== "saferoom",
  );
  if (others.length && (pvpOn(state) || loc !== "saferoom")) {
    if (pvpOn(state)) {
      if (others.length === 1) return beginPvP(state, state.current, others[0], "landing");
      return { ...state, phase: "bump-pick", bumpVictimId: null, viewers: state.viewers + 3500 };
    }
    if (others.length === 1) {
      return { ...state, phase: "bump-dir", bumpVictimId: others[0].id, viewers: state.viewers + 3500 };
    }
    return { ...state, phase: "bump-pick", bumpVictimId: null };
  }
  return resolveLanding(state, state.current);
}

function nextIndex(state: GameState): number {
  const n = state.crawlers.length;
  for (let k = 1; k <= n; k++) {
    const i = (state.current + k) % n;
    if (!state.crawlers[i].out) return i;
  }
  return state.current;
}

function stepToward(state: GameState, from: Cell, to: Cell): Cell {
  const dr = wrapOn(state) ? wrapDelta(from.r, to.r) : to.r - from.r;
  const dc = wrapOn(state) ? wrapDelta(from.c, to.c) : to.c - from.c;
  if (Math.abs(dr) >= Math.abs(dc) && dr !== 0) {
    return { r: wrapCoord(from.r + Math.sign(dr)), c: from.c };
  }
  if (dc !== 0) {
    return { r: from.r, c: wrapCoord(from.c + Math.sign(dc)) };
  }
  return from;
}

function refillStreet(state: GameState): GameState {
  const meta = FLOOR_META[state.floor];
  if (meta.streetCap <= 0) return state;
  let next = state;
  const taken = [
    ...next.mobs.map((m) => m.pos),
    ...next.crawlers.filter((c) => !c.out).map((c) => c.pos),
  ];
  for (const kind of meta.streetKinds) {
    const have = next.mobs.filter((m) => m.kind === kind).length;
    const want = meta.streetKinds.filter((k) => k === kind).length;
    if (have >= want) continue;
    const pos = spawnSpot(next.locAt, next.locPos, taken);
    next = { ...next, mobs: [...next.mobs, makeMob(kind, pos)] };
    taken.push(pos);
  }
  return next;
}

function restMob(state: GameState, foeId: string): GameState {
  if (!state.mobs.some((m) => m.id === foeId)) return state;
  const wait = Math.max(1, state.crawlers.filter((c) => !c.out).length);
  return {
    ...state,
    mobs: state.mobs.map((m) =>
      m.id === foeId ? { ...m, rest: Math.max(m.rest, wait) } : m,
    ),
  };
}

function stepMobs(state: GameState): GameState {
  let next = state;
  const saferoom = next.locPos.saferoom;
  for (let i = 0; i < next.mobs.length; i++) {
    const mob = next.mobs[i];
    const info = MOB_INFO[mob.kind];
    if (mob.rest > 0) {
      next = {
        ...next,
        mobs: next.mobs.map((m, j) => (j === i ? { ...m, rest: m.rest - 1 } : m)),
      };
      continue;
    }
    if (!info.hunts) continue;
    const prey = next.crawlers.filter(
      (c) => !c.out && (pvpOn(next) || !sameCell(c.pos, saferoom)),
    );
    if (!prey.length) continue;
    let pos = mob.pos;
    const steps = Math.max(1, mob.kind === "executive" && next.enraged ? 2 : info.speed);
    for (let s = 0; s < steps; s++) {
      const target = [...prey].sort((a, b) => dist(next, pos, a.pos) - dist(next, pos, b.pos))[0];
      const dest = stepToward(next, pos, target.pos);
      if (!pvpOn(next) && stationAt(next, dest) === "saferoom") break;
      pos = dest;
      const hit = next.crawlers.find(
        (c) => !c.out && sameCell(c.pos, pos) && (pvpOn(next) || stationAt(next, c.pos) !== "saferoom"),
      );
      if (hit) {
        const mobs = next.mobs.map((m, j) => (j === i ? { ...m, pos } : m));
        const idx = next.crawlers.findIndex((c) => c.id === hit.id);
        return beginCombat({ ...next, mobs }, idx, { ...mob, pos }, "mobs");
      }
    }
    next = { ...next, mobs: next.mobs.map((m, j) => (j === i ? { ...m, pos } : m)) };
  }
  return next;
}

function passTurn(state: GameState): GameState {
  if (state.phase === "over" || state.phase === "bonus") return state;
  const ni = nextIndex(state);
  const nxt = state.crawlers[ni];
  const cur = state.crawlers[state.current];
  const needHandoff = cur.isHuman && nxt.isHuman && state.humanCount > 1;
  return {
    ...state,
    current: ni,
    phase: needHandoff ? "handoff" : "roll",
    roll: null,
    bumpVictimId: null,
    lastFrom: null,
    combat: null,
  };
}

function finishTurn(state: GameState): GameState {
  if (state.phase === "over" || state.phase === "bonus") return state;
  let next = stepMobs({ ...state, combat: null, phase: "roll" });
  if (next.phase === "combat" || next.phase === "over" || next.phase === "bonus") return next;
  return passTurn(next);
}

function separateFoe(state: GameState, foeId: string, from: Cell): GameState {
  const foe = state.mobs.find((m) => m.id === foeId);
  if (!foe || !sameCell(foe.pos, from)) return state;
  const dest = neighbors(foe.pos, wrapOn(state)).find(
    (n) =>
      stationAt(state, n) !== "saferoom" &&
      !mobsAt(state, n).length &&
      !occupants(state, n).length,
  );
  if (!dest) return state;
  return { ...state, mobs: state.mobs.map((m) => (m.id === foeId ? { ...m, pos: dest } : m)) };
}

function beginBonus(state: GameState): GameState {
  const upcoming = state.floor + 1;
  const giftKind: GiftKind = upcoming === 4 ? "race" : "gift";
  const crawlers = state.crawlers.map((c) => ({
    ...c,
    career: c.career + c.finished,
    hp: Math.min(c.maxHp, c.hp + 1),
  }));
  return pushLog(
    {
      ...state,
      crawlers,
      phase: "bonus",
      bonusPicker: 0,
      giftKind,
      roll: null,
      bumpVictimId: null,
      combat: null,
    },
    giftKind === "race" ? pick(LINES.racePick) : pick(LINES.survive),
  );
}

export function applyBonus(state: GameState, id: GiftId): GameState {
  if (state.phase !== "bonus" || state.bonusPicker == null) return state;
  const i = state.bonusPicker;
  if (state.giftKind === "race") {
    if (!isRaceId(id)) return state;
    let next = mapCrawler(state, i, (c) => {
      if (id === "rhino") return { ...c, race: id, atkBonus: c.atkBonus + 2 };
      if (id === "bunny") {
        const maxHp = c.maxHp + 2;
        return { ...c, race: id, maxHp, hp: Math.min(maxHp, c.hp + 2) };
      }
      if (id === "naga") return { ...c, race: id, moveBonus: c.moveBonus + 2 };
      return { ...c, race: id, career: c.career + 2 };
    });
    next = pushLog(next, `${state.crawlers[i].name} becomes ${RACES[id].name}.`);
    const nxt = i + 1;
    if (nxt < next.crawlers.length) return { ...next, bonusPicker: nxt };
    const upcoming = state.floor + 1;
    if (!isFloorId(upcoming) || upcoming > PLAYABLE_FLOORS) {
      return endMatch(next, "beats");
    }
    return startFloor(next, upcoming);
  }
  if (!isBonusId(id)) return state;
  let next = mapCrawler(state, i, (c) => {
    if (id === "iron") {
      const maxHp = c.maxHp + 1;
      return { ...c, maxHp, hp: Math.min(maxHp, c.hp + 1) };
    }
    if (id === "loaded") return { ...c, atkBonus: c.atkBonus + 1 };
    if (id === "pace") return { ...c, moveBonus: c.moveBonus + 1 };
    return { ...c, career: c.career + 1 };
  });
  if (id === "clip") next = { ...next, viewers: next.viewers + 18000 };
  next = pushLog(next, `${state.crawlers[i].name} takes ${BONUSES[id].name}. It stays.`);
  const nxt = i + 1;
  if (nxt < next.crawlers.length) return { ...next, bonusPicker: nxt };
  const upcoming = state.floor + 1;
  if (!isFloorId(upcoming) || upcoming > PLAYABLE_FLOORS) {
    return endMatch(next, "beats");
  }
  return startFloor(next, upcoming);
}

export function applyRoll(state: GameState): GameState {
  if (state.phase !== "roll") return state;
  let primed: GameState = state;
  if (primed.streetDelay > 0) {
    primed = { ...primed, streetDelay: primed.streetDelay - 1 };
  } else {
    primed = refillStreet(primed);
  }
  const me = primed.crawlers[primed.current];
  let n = crawlerDie() + me.moveBonus;
  let crawlers = primed.crawlers;
  if (me.boots) {
    n += 1;
    crawlers = crawlers.map((c, i) =>
      i === primed.current ? syncGear(c, dropOne(bagOf(c), "boots")) : c,
    );
  }
  n = Math.min(9, n);
  let next: GameState = { ...primed, crawlers, roll: n, phase: "move" };
  if (n >= 6) {
    next = pushLog(next, pick(LINES.roll6));
    next = { ...next, viewers: next.viewers + 2200 };
  }
  return next;
}

export function applyReroll(state: GameState): GameState {
  if (state.phase !== "move") return state;
  const me = state.crawlers[state.current];
  if (!me.featured) return state;
  const n = Math.min(9, crawlerDie() + me.moveBonus);
  let next = mapCrawler(state, state.current, (c) => ({ ...c, featured: false }));
  next = { ...next, roll: n };
  next = pushLog(next, `Reroll: ${n}. Featured burned.`);
  return next;
}

export function applyUseItem(state: GameState): GameState {
  if (state.phase !== "roll") return state;
  const me = state.crawlers[state.current];
  if (!bagOf(me).includes("stim") || me.hp >= me.maxHp) return state;
  let next = mapCrawler(state, state.current, (c) => ({
    ...syncGear(c, dropOne(bagOf(c), "stim")),
    hp: Math.min(c.maxHp, c.hp + 1),
  }));
  return pushLog(next, `${me.name} cracks a stim.`);
}

export function applyMove(state: GameState, dest: Cell): GameState {
  if (state.phase !== "move" || state.roll == null) return state;
  const me = state.crawlers[state.current];
  const legal = legalMoves(state, me.pos, state.roll);
  if (!legal.some((c) => sameCell(c, dest))) return state;
  const walked = dist(state, me.pos, dest);
  const crawlers = state.crawlers.map((c, i) =>
    i === state.current ? { ...c, pos: dest, steps: (c.steps ?? 0) + walked } : c,
  );
  return afterMoveCleanup({
    ...state,
    crawlers,
    lastFrom: me.pos,
    viewers: state.viewers + 400,
  });
}

export function beginStayAsk(state: GameState): GameState {
  if (state.phase !== "move" || state.roll == null) return state;
  return { ...state, phase: "stay-ask" };
}

export function applyStay(state: GameState, stay: boolean): GameState {
  if (state.phase !== "stay-ask") return state;
  if (!stay) return { ...state, phase: "move" };
  const me = state.crawlers[state.current];
  const loc = stationAt(state, me.pos);
  const line =
    loc && loc !== "ingress"
      ? `${me.name} holds ${STATION_LABEL[loc]}. It pays out.`
      : `${me.name} holds the tile.`;
  return resolveLanding(pushLog({ ...state, combat: null }, line), state.current);
}

export function applyStairs(state: GameState, take: boolean): GameState {
  if (state.phase !== "stairs-ask") return state;
  const me = state.crawlers[state.current];
  if (take) {
    if (!canTakeStairs(state, state.current)) return finishTurn(state);
    return afterFloor(pushLog(state, `${me.name} takes the stairs.`));
  }
  return finishTurn(pushLog(state, `${me.name} stays on the floor. More quests.`));
}

export function applyBumpPick(state: GameState, id: string): GameState {
  if (state.phase !== "bump-pick") return state;
  const me = state.crawlers[state.current];
  const ok = occupants(state, me.pos, me.id).some((c) => c.id === id);
  if (!ok) return state;
  if (pvpOn(state)) {
    const foe = state.crawlers.find((c) => c.id === id);
    if (!foe) return state;
    return beginPvP(state, state.current, foe, "landing");
  }
  return { ...state, bumpVictimId: id, phase: "bump-dir" };
}

export function applyBumpDir(state: GameState, dest: Cell): GameState {
  if (state.phase !== "bump-dir" || !state.bumpVictimId) return state;
  const victim = state.crawlers.find((c) => c.id === state.bumpVictimId);
  if (!victim) return state;
  if (!neighbors(victim.pos, wrapOn(state)).some((n) => sameCell(n, dest))) return state;
  const idx = state.crawlers.findIndex((c) => c.id === victim.id);
  const crawlers = state.crawlers.map((c) => (c.id === victim.id ? { ...c, pos: dest } : c));
  let next: GameState = pushLog(
    { ...state, crawlers, viewers: state.viewers + 5000 },
    pick(LINES.bump),
  );
  next = springTrap(next, dest, idx);
  return resolveLanding(next, next.current);
}

export function applyFight(state: GameState): GameState {
  if (state.phase !== "combat" || !state.combat || state.combat.result) return state;
  const { crawlerIndex, foeId, foeKind } = state.combat;
  const crawler = state.crawlers[crawlerIndex];
  if (foeKind === "crawler") {
    const other = state.crawlers.find((c) => c.id === foeId);
    if (!other || other.out) return { ...state, phase: "roll", combat: null };
    const atk = crawlerDie() + (crawler.spike ? 2 : 0) + crawler.atkBonus;
    const def = crawlerDie() + other.atkBonus;
    let result: Combat["result"] = "tie";
    if (atk > def) result = "win";
    else if (atk < def) result = "lose";
    let next: GameState = mapCrawler(state, crawlerIndex, (c) =>
      syncGear(c, dropOne(bagOf(c), "spike")),
    );
    next = {
      ...next,
      combat: { ...state.combat, atk, def, result },
      viewers: next.viewers + 9000,
    };
    if (result === "tie") next = pushLog(next, pick(LINES.glance));
    if (result === "win") next = pushLog(next, `${crawler.name} tags ${other.name}.`);
    if (result === "lose") next = pushLog(next, `${other.name} tags ${crawler.name}.`);
    return next;
  }
  const foe = state.mobs.find((m) => m.id === foeId);
  if (!foe) return { ...state, phase: "roll", combat: null };
  const atk = crawlerDie() + (crawler.spike ? 2 : 0) + crawler.atkBonus;
  const execBonus = foe.kind === "executive" && state.enraged ? 3 : MOB_INFO[foe.kind].bonus;
  const def = d6() + execBonus;
  let result: Combat["result"] = "tie";
  if (atk > def) result = "win";
  else if (atk < def) result = "lose";
  let next: GameState = mapCrawler(state, crawlerIndex, (c) =>
    syncGear(c, dropOne(bagOf(c), "spike")),
  );
  next = {
    ...next,
    combat: { ...state.combat, atk, def, result },
    viewers: next.viewers + 6000,
  };
  if (result === "tie") next = pushLog(next, pick(LINES.glance));
  if (result === "win") {
    if (foe.kind === "executive" && !state.enraged) next = pushLog(next, pick(LINES.edited));
    else if (foe.kind === "executive" && foe.hp > 1) next = pushLog(next, pick(LINES.execHit));
    else if (foe.kind === "executive") next = pushLog(next, pick(LINES.execWin));
    else if (foe.kind === "boss" && foe.hp > 1) next = pushLog(next, pick(LINES.bossHit));
    else if (foe.kind === "brood") next = pushLog(next, pick(LINES.broodWin));
    else if (foe.kind === "boss") next = pushLog(next, pick(LINES.bossWin));
    else next = pushLog(next, pick(LINES.kill));
  }
  if (result === "lose") next = pushLog(next, pick(LINES.hit));
  return next;
}

export function applyCombatEnd(state: GameState): GameState {
  if (state.phase !== "combat" || !state.combat || !state.combat.result) return state;
  const { crawlerIndex, foeId, foeKind, result, resume } = state.combat;
  let next: GameState = { ...state };

  if (foeKind === "crawler") {
    const otherIdx = next.crawlers.findIndex((c) => c.id === foeId);
    if (result === "win" && otherIdx >= 0) {
      next = mapCrawler(next, otherIdx, (c) => ({ ...c, hp: c.hp - 1 }));
      if (next.crawlers[otherIdx].hp <= 0) {
        next = knockOut(next, otherIdx);
        next = creditKill(next, crawlerIndex);
        if (next.phase !== "over") next = pushLog(next, pick(LINES.pvpKo));
      }
    }
    if (result === "lose") {
      next = mapCrawler(next, crawlerIndex, (c) => ({ ...c, hp: c.hp - 1 }));
      if (next.crawlers[crawlerIndex].hp <= 0) next = knockOut(next, crawlerIndex);
    }
    if (next.phase === "over" || next.phase === "bonus") return next;
    next = { ...next, combat: null };
    if (next.crawlers[crawlerIndex].out) return finishTurn(next);
    if (resume === "landing") {
      next = resolveVisit(next, crawlerIndex);
      if (next.phase === "bonus" || next.phase === "over") return next;
      return finishTurn(next);
    }
    return passTurn(next);
  }

  const foe = next.mobs.find((m) => m.id === foeId);
  if (result === "win" && foe) {
    const blocked = foe.kind === "executive" && !next.enraged;
    if (blocked) {
      next = separateFoe(next, foeId, next.crawlers[crawlerIndex].pos);
    } else {
      const hp = foe.hp - 1;
      if (hp <= 0) {
        next = { ...next, mobs: next.mobs.filter((m) => m.id !== foeId) };
        if (foe.kind === "brood") next = { ...next, stairsOpen: true };
        if (foe.kind === "llama") {
          const c = next.crawlers[crawlerIndex];
          if (bagOf(c).length < itemCap(next.floor)) next = grantItem(next, crawlerIndex, "stim");
        }
        next = creditKill(next, crawlerIndex);
        if (FLOOR_META[next.floor].streetKinds.includes(foe.kind)) {
          const living = next.crawlers.filter((c) => !c.out).length;
          const wait = Math.max(1, living - 1);
          const quiet = next.streetDelay === 0;
          next = { ...next, streetDelay: Math.max(next.streetDelay, wait) };
          if (quiet) next = pushLog(next, pick(LINES.denWait));
        }
        if (foe.kind === "boss") {
          next = mapCrawler(next, crawlerIndex, (c) => ({ ...c, career: c.career + 2 }));
          next = { ...next, combat: null };
          next = pushLog(next, "The Recap dies on camera. Costume change. The circus is next.");
          return beginBonus(next);
        }
        if (foe.kind === "executive") {
          next = mapCrawler(next, crawlerIndex, (c) => ({ ...c, career: c.career + 3 }));
          next = { ...next, combat: null };
          next = pushLog(next, "The Executive is off the air. The uplink is next.");
          return beginBonus(next);
        }
      } else {
        next = {
          ...next,
          mobs: next.mobs.map((m) => (m.id === foeId ? { ...m, hp } : m)),
        };
        next = separateFoe(next, foeId, next.crawlers[crawlerIndex].pos);
      }
    }
  }
  if (result === "lose") {
    next = mapCrawler(next, crawlerIndex, (c) => ({ ...c, hp: c.hp - 1 }));
    if (next.crawlers[crawlerIndex].hp <= 0) next = knockOut(next, crawlerIndex);
    else if (foe) next = separateFoe(next, foeId, next.crawlers[crawlerIndex].pos);
  }
  if (result === "tie" && foe) {
    next = separateFoe(next, foeId, next.crawlers[crawlerIndex].pos);
  }
  if (next.mobs.some((m) => m.id === foeId)) next = restMob(next, foeId);
  if (next.phase === "over" || next.phase === "bonus") return next;
  next = { ...next, combat: null };
  if (next.crawlers[crawlerIndex]?.out) return finishTurn(next);
  if (resume === "landing") {
    next = resolveVisit(next, crawlerIndex);
    if (next.phase === "bonus" || next.phase === "over") return next;
    return finishTurn(next);
  }
  return passTurn(next);
}

export function applyHandoff(state: GameState): GameState {
  if (state.phase !== "handoff") return state;
  return { ...state, phase: "roll" };
}

export function recoverCombat(state: GameState): GameState {
  if (state.phase !== "combat") return state;
  if (state.combat?.result) return applyCombatEnd(state);
  if (state.combat) return state;
  return finishTurn({ ...state, combat: null });
}

export function applyTick(state: GameState, ms: number): GameState {
  if (
    state.phase === "over" ||
    state.phase === "handoff" ||
    state.phase === "combat" ||
    state.phase === "bonus"
  ) {
    return state;
  }
  const remainingMs = state.remainingMs - (isCheat() ? ms * CHEAT.clockMul : ms);
  if (remainingMs <= 0) {
    const timed = { ...state, remainingMs: 0 };
    if (state.floor < PLAYABLE_FLOORS) return beginBonus(timed);
    return endMatch(timed, "clock");
  }
  return { ...state, remainingMs };
}

export function beatHint(beat: Beat): string {
  if (beat.type === "visit") return `Stand on ${STATION_LABEL[beat.loc]}.`;
  if (beat.type === "seq") {
    const nxt = STATION_LABEL[beat.locs[beat.step]];
    const all = beat.locs.map((l) => STATION_LABEL[l]).join(" → ");
    return `${all}. Next: ${nxt}.`;
  }
  if (beat.type === "kill") return `Kill ${beat.need} thing${beat.need > 1 ? "s" : ""}.`;
  const have = beat.got.map((l) => STATION_LABEL[l]).join(", ");
  return have
    ? `${beat.got.length}/${beat.need} — already ${have}.`
    : `Any ${beat.need} different stations.`;
}

export function floorClearHint(state: GameState): string {
  const meta = FLOOR_META[state.floor];
  if (meta.winBy === "pvp") return "Last crawler standing. Saferoom will not save you.";
  if (state.floor === 5) {
    const cut = state.feeds.filter((f) => f.cut).length;
    const exec = state.mobs.find((m) => m.kind === "executive");
    if (!state.enraged) return `Cut ${cut}/3 live feeds. Stay off its shoulder. Then five wounds.`;
    return `Feeds are dead. ${exec ? exec.hp : 0} wounds left in The Executive.`;
  }
  if (meta.winBy === "boss") return "Kill The Recap. Two hits. Then the circus.";
  if (state.floor === 1 && !state.stairsOpen) {
    return `${FINISH_TARGET} quests, after the Broodmother falls. Then take the stairs when you want.`;
  }
  if (meta.winBy === "beats") {
    return `${FINISH_TARGET} quests to open the drop. Stairs are your call — hang and farm if you want.`;
  }
  return `${FINISH_TARGET} quests this floor.`;
}
