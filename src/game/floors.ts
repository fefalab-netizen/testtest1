export type FloorId = 1 | 2 | 3 | 4 | 5 | 6 | 7;
export type MobKind =
  | "spider"
  | "brood"
  | "llama"
  | "llama-brute"
  | "boss"
  | "clown"
  | "weasel"
  | "executive"
  | "drone"
  | "hound";
export type BonusId = "iron" | "loaded" | "pace" | "clip";
export type RaceId = "rhino" | "bunny" | "reptile" | "naga";
export type GiftId = BonusId | RaceId;
export type GiftKind = "gift" | "race";
export type FloorWin = "beats" | "boss" | "pvp";

export const PLAYABLE_FLOORS = 7;
export const PLANNED_FLOORS = 7;
export const FLOOR_MS = 8 * 60 * 1000;
export const FINISH_TARGET = 3;

export const MOB_INFO: Record<
  MobKind,
  { name: string; bonus: number; hp: number; hunts: boolean; speed: number }
> = {
  spider: { name: "Web-thing", bonus: 0, hp: 1, hunts: true, speed: 1 },
  brood: { name: "Broodmother", bonus: 2, hp: 1, hunts: false, speed: 1 },
  llama: { name: "Stash Llama", bonus: 1, hp: 1, hunts: true, speed: 1 },
  "llama-brute": { name: "Corner Llama", bonus: 2, hp: 1, hunts: true, speed: 1 },
  boss: { name: "The Recap", bonus: 2, hp: 2, hunts: true, speed: 1 },
  clown: { name: "Dead Clown", bonus: 1, hp: 3, hunts: true, speed: 1 },
  weasel: { name: "Dead Weasel", bonus: 0, hp: 1, hunts: true, speed: 3 },
  executive: { name: "The Executive", bonus: 2, hp: 5, hunts: true, speed: 1 },
  drone: { name: "Ping Drone", bonus: 1, hp: 1, hunts: true, speed: 2 },
  hound: { name: "Hardlight Hound", bonus: 2, hp: 2, hunts: true, speed: 1 },
};

export const BONUSES: Record<BonusId, { name: string; blurb: string }> = {
  iron: { name: "Iron Skin", blurb: "Permanent +1 max HP." },
  loaded: { name: "Loaded Spike", blurb: "Permanent +1 on every swing." },
  pace: { name: "Live Boots", blurb: "Permanent +1 to every move." },
  clip: { name: "Highlight Reel", blurb: "Permanent +1 career quest. Ratings bump." },
};

export const BONUS_IDS: BonusId[] = ["iron", "loaded", "pace", "clip"];

export const RACES: Record<RaceId, { name: string; blurb: string }> = {
  rhino: {
    name: "Rhinoceromorphos Shotgun Messenger",
    blurb: "Race form. Permanent +2 on every swing.",
  },
  bunny: {
    name: "Big Fluffy Bunny of Death",
    blurb: "Race form. Permanent +2 max HP.",
  },
  reptile: {
    name: "Reptilian Popstar",
    blurb: "Race form. Permanent +2 career quests.",
  },
  naga: {
    name: "Naga Speedster",
    blurb: "Race form. Permanent +2 to every move.",
  },
};

export const RACE_IDS: RaceId[] = ["rhino", "bunny", "reptile", "naga"];

export function isBonusId(id: string): id is BonusId {
  return (BONUS_IDS as string[]).includes(id);
}

export function isRaceId(id: string): id is RaceId {
  return (RACE_IDS as string[]).includes(id);
}

export type FloorMeta = {
  id: FloorId;
  name: string;
  tag: string;
  blurb: string;
  openLine: string;
  rule: string;
  bg: string;
  accent: "web" | "stash" | "recap" | "circus" | "booth" | "uplink" | "arena";
  streetKinds: MobKind[];
  streetCap: number;
  gate: MobKind | null;
  stairsOpen: boolean;
  traps: number;
  feeds: number;
  wrap: boolean;
  pvp: boolean;
  clearBeats: number;
  winBy: FloorWin;
};

export const FLOOR_META: Record<FloorId, FloorMeta> = {
  1: {
    id: 1,
    name: "The Webbed Block",
    tag: "Floor One · Spiders",
    blurb: "Dead neighborhood, restaged. Webs in the walls. Broodmother sits the stairs.",
    openLine: "FLOOR ONE IS LIVE. Webs in the drywall. Eight minutes. Feed the cameras.",
    rule: "Three quests after the Broodmother falls. Stairs when you want.",
    bg: "/floors/1.jpg",
    accent: "web",
    streetKinds: ["spider", "spider"],
    streetCap: 2,
    gate: "brood",
    stairsOpen: false,
    traps: 4,
    feeds: 0,
    wrap: false,
    pvp: false,
    clearBeats: 3,
    winBy: "beats",
  },
  2: {
    id: 2,
    name: "The Stash Block",
    tag: "Floor Two · Llamas",
    blurb: "Syndicated crack block. Two llamas work the corners. Stairs are already open.",
    openLine: "FLOOR TWO. The llamas brought product. Stairs are open. Do not pet them.",
    rule: "Three quests. Stairs are open — take them when you want.",
    bg: "/floors/2.jpg",
    accent: "stash",
    streetKinds: ["llama", "llama-brute"],
    streetCap: 2,
    gate: null,
    stairsOpen: true,
    traps: 3,
    feeds: 0,
    wrap: false,
    pvp: false,
    clearBeats: 3,
    winBy: "beats",
  },
  3: {
    id: 3,
    name: "The Recap",
    tag: "Floor Three · Boss",
    blurb: "One camera. One beast. It follows. Kill it, and the circus is next.",
    openLine: "FLOOR THREE. The Recap is live and it hunts. Two hits. The circus is waiting.",
    rule: "Kill The Recap. Two hits.",
    bg: "/floors/3.jpg",
    accent: "recap",
    streetKinds: [],
    streetCap: 0,
    gate: "boss",
    stairsOpen: true,
    traps: 2,
    feeds: 0,
    wrap: false,
    pvp: false,
    clearBeats: 0,
    winBy: "boss",
  },
  4: {
    id: 4,
    name: "Deadly Circus",
    tag: "Floor Four · Circus",
    blurb: "The tent is still selling tickets. A clown that will not die. A weasel that will not walk.",
    openLine: "FLOOR FOUR. Deadly circus. Clown eats hits. Weasel eats distance. Eight minutes.",
    rule: "Three quests. Clown tanks. Weasel runs. Stairs when you want.",
    bg: "/floors/4.jpg",
    accent: "circus",
    streetKinds: ["clown", "weasel"],
    streetCap: 2,
    gate: null,
    stairsOpen: true,
    traps: 3,
    feeds: 0,
    wrap: false,
    pvp: false,
    clearBeats: 3,
    winBy: "beats",
  },
  5: {
    id: 5,
    name: "The Control Booth",
    tag: "Floor Five · Director",
    blurb: "Production came down to the floor. The Executive will not bleed on camera.",
    openLine: "FLOOR FIVE. The Executive has five hearts. It will not bleed until you cut three live feeds. Do not cut one while it is on your shoulder.",
    rule: "Cut three live feeds. Stay off its shoulder. Then five wounds.",
    bg: "/floors/5.jpg",
    accent: "booth",
    streetKinds: [],
    streetCap: 0,
    gate: "executive",
    stairsOpen: true,
    traps: 2,
    feeds: 3,
    wrap: false,
    pvp: false,
    clearBeats: 0,
    winBy: "boss",
  },
  6: {
    id: 6,
    name: "The Uplink Sprawl",
    tag: "Floor Six · Wrap",
    blurb: "Neon stack. The grid loops. Walk off one edge, step on from the other.",
    openLine: "FLOOR SIX. New rule: the board wraps. Ping drones and hardlight hounds. Three quests.",
    rule: "The grid loops. Edges wrap. Three quests. Stairs when you want.",
    bg: "/floors/6.jpg",
    accent: "uplink",
    streetKinds: ["drone", "hound"],
    streetCap: 2,
    gate: null,
    stairsOpen: true,
    traps: 3,
    feeds: 0,
    wrap: true,
    pvp: false,
    clearBeats: 3,
    winBy: "beats",
  },
  7: {
    id: 7,
    name: "The Face-Off",
    tag: "Floor Seven · PvP",
    blurb: "No more monsters. Production wants crawler on crawler. Last one standing takes the hour.",
    openLine: "FLOOR SEVEN. Face-off. Land on a crawler and you swing. Saferoom is just a room. Zero HP is out. Last crawler standing.",
    rule: "Land on them. Swing. Saferoom will not save you. Last crawler standing.",
    bg: "/floors/7.jpg",
    accent: "arena",
    streetKinds: [],
    streetCap: 0,
    gate: null,
    stairsOpen: true,
    traps: 2,
    feeds: 0,
    wrap: false,
    pvp: true,
    clearBeats: 0,
    winBy: "pvp",
  },
};

export function isFloorId(n: number): n is FloorId {
  return n >= 1 && n <= 7;
}
