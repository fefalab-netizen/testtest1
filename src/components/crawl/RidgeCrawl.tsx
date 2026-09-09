import { useEffect, useMemo, useReducer, useRef, useState, type ReactNode } from "react";
import { Gauge, Heart, Volume2, VolumeX } from "lucide-react";
import { Board } from "./Board";
import { DiceThrow, Die } from "./Dice";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import {
  pickBonus,
  pickBumpDir,
  pickBumpVictim,
  pickMove,
  wantReroll,
  wantStim,
} from "@/game/ai";
import {
  BONUSES,
  BONUS_IDS,
  FLOOR_META,
  FLOOR_MS,
  MOB_INFO,
  PLANNED_FLOORS,
  PLAYABLE_FLOORS,
  RACES,
  RACE_IDS,
  isFloorId,
  type FloorId,
  type GiftId,
} from "@/game/floors";
import {
  ITEM_INFO,
  applyBonus,
  applyBumpDir,
  applyBumpPick,
  applyCombatEnd,
  applyFight,
  applyHandoff,
  applyMove,
  applyReroll,
  applyRoll,
  applyStay,
  applyStairs,
  applyTick,
  applyUseItem,
  beatHint,
  beginStayAsk,
  createMatch,
  floorClearHint,
  formatTime,
  formatViewers,
  legalMoves,
  occupants,
  pvpOn,
  recoverCombat,
  sameCell,
  stairsReady,
  startFloor,
  wrapOn,
  type Cell,
  type GameState,
  STATION_BLURB,
  STATIONS,
  bagOf,
} from "@/game/model";
import { CHEAT, loadCheat, setCheat as persistCheat } from "@/game/cheat";
import {
  cancelWalk,
  diffsFrom,
  snapshotPos,
  walkPieces,
  type PosMap,
} from "@/game/motion";
import { SPRITES, crawlerArt } from "@/game/sprites";
import { sfx, unlockAudio } from "@/sfx";
import { crawlMusic } from "@/game/music";

type Screen = "title" | "play";
type Busy = null | "dice" | "walk";
type DiceShow = { values: number[]; bonus?: string; where: "board" | "combat" };

type Action =
  | { type: "boot"; state: GameState }
  | { type: "roll" }
  | { type: "reroll" }
  | { type: "use-item" }
  | { type: "move"; cell: Cell }
  | { type: "stay-ask" }
  | { type: "stay"; stay: boolean }
  | { type: "stairs"; take: boolean }
  | { type: "bump-pick"; id: string }
  | { type: "bump-dir"; cell: Cell }
  | { type: "fight" }
  | { type: "combat-end" }
  | { type: "handoff" }
  | { type: "bonus"; id: GiftId }
  | { type: "tick"; ms: number };

function reduce(state: GameState | null, action: Action): GameState | null {
  if (action.type === "boot") return action.state;
  if (!state) return state;
  if (action.type === "roll") return applyRoll(state);
  if (action.type === "reroll") return applyReroll(state);
  if (action.type === "use-item") return applyUseItem(state);
  if (action.type === "move") return applyMove(state, action.cell);
  if (action.type === "stay-ask") return beginStayAsk(state);
  if (action.type === "stay") return applyStay(state, action.stay);
  if (action.type === "stairs") return applyStairs(state, action.take);
  if (action.type === "bump-pick") return applyBumpPick(state, action.id);
  if (action.type === "bump-dir") return applyBumpDir(state, action.cell);
  if (action.type === "fight") return applyFight(state);
  if (action.type === "combat-end") return applyCombatEnd(state);
  if (action.type === "handoff") return applyHandoff(state);
  if (action.type === "bonus") return applyBonus(state, action.id);
  return applyTick(state, action.ms);
}

function dieFaces(n: number): { values: number[]; bonus?: string } {
  if (n >= 7) return { values: [6], bonus: `+${n - 6}` };
  return { values: [Math.max(1, Math.min(6, n))] };
}

function Panel({
  children,
  className,
  size = "md",
}: {
  children: ReactNode;
  className?: string;
  size?: "sm" | "md";
}) {
  return <div className={cn(size === "sm" ? "ui-box-sm" : "ui-box", className)}>{children}</div>;
}

function QuestMark({ finished, need }: { finished: number; need: number }) {
  const prev = useRef(finished);
  const [flash, setFlash] = useState<number | null>(null);
  useEffect(() => {
    const delta = finished - prev.current;
    prev.current = finished;
    if (delta > 0) setFlash(delta);
  }, [finished]);
  return (
    <span className="relative inline-flex items-center">
      <span className="font-mono tabular-nums">{need ? `${finished}/${need}` : "—"}</span>
      {flash != null ? (
        <span key={`${finished}-${flash}`} className="quest-pop" onAnimationEnd={() => setFlash(null)}>
          +{flash}
        </span>
      ) : null}
    </span>
  );
}

function HowTo({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg/80 p-3">
      <Panel className="max-h-[82dvh] w-full max-w-lg overflow-y-auto p-4">
        <p className="hud-kicker">Broadcast brief</p>
        <h2 className="hud-chrome mt-1 font-display text-2xl font-semibold uppercase tracking-tight">
          How the crawl works
        </h2>
        <div className="mt-4 space-y-3 text-sm leading-relaxed text-muted">
          <p>
            Seven floors. Eight minutes a piece. Roll, walk or stay — staying still pays the
            tile. Close quests even when a floor does not need them. Three quests lets you take
            the stairs. Combat is d6 vs d6. One item on floors 1–3, two from Floor Four on. Zero
            HP dumps you at Ingress and knocks two quests off your total, except the last floor,
            where it cuts you.
          </p>
          <p>
            End of the crawl, before the winner: Annihilator (most kills) +2, Pacifist (no kills)
            +2, Traveler (most steps) +1, Sour Loser (fewest quests) +1.
          </p>
        </div>
        <p className="mt-5 font-mono text-[11px] uppercase tracking-[0.16em] text-accent">Stations</p>
        <ul className="mt-2 grid gap-2 sm:grid-cols-2">
          {STATIONS.map((s) => (
            <li key={s.id} className="ui-box-sm flex items-start gap-2 p-2">
              <img src={SPRITES.stations[s.id]} alt="" className="sprite size-9 shrink-0 object-contain" />
              <div>
                <p className="text-sm font-medium text-fg">{s.label}</p>
                <p className="mt-0.5 text-xs leading-snug text-muted">{STATION_BLURB[s.id]}</p>
              </div>
            </li>
          ))}
        </ul>
        <Button className="mt-5 w-full" onClick={onClose}>
          Back to the feed
        </Button>
      </Panel>
    </div>
  );
}

type Setup = { total: number; humans: number; handles: string[] };

function Title({
  onStart,
  onHow,
}: {
  onStart: (opts: Setup) => void;
  onHow: () => void;
}) {
  const [total, setTotal] = useState(3);
  const [humans, setHumans] = useState(1);
  const [handles, setHandles] = useState(["Crawler", "Crawler 2", "Crawler 3", "Crawler 4"]);

  const setHandle = (i: number, value: string) => {
    setHandles((prev) => prev.map((h, n) => (n === i ? value.slice(0, 16) : h)));
  };

  return (
    <div className="title-shell min-h-dvh">
    <main className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col justify-between px-5 py-8 sm:py-12">
      <header>
        <p className="hud-kicker">As seen on the feed · Operators standing by</p>
        <h1 className="hud-chrome mt-4 font-display text-6xl font-semibold uppercase leading-none tracking-tight sm:text-7xl">
          Xpress Crawl
        </h1>
        <p className="mt-4 max-w-md text-base leading-relaxed text-muted">
          Seven floors. Eight minutes a piece. Survive, take a gift that stays, drop. Tonight only.
        </p>
      </header>

      <Panel className="mt-10 p-5">
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-accent">The basics</p>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          Roll a six. Walk that far, or tap yourself to stay — the tile still pays out. Close
          quests even on floors that do not need them. One item until Floor Four, then two. Zero HP
          dumps you at Ingress and costs two quests, except the last floor, where it cuts you.
        </p>
      </Panel>

      <Panel className="mt-10 space-y-5 p-5">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-faint">Crawlers</p>
            <div className="mt-2 flex gap-1">
              {[2, 3, 4].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => {
                    setTotal(n);
                    setHumans((h) => Math.min(h, n));
                  }}
                  className={cn(
                    "ui-chip h-11 flex-1 text-sm",
                    total === n ? "ui-chip-on text-fg" : "text-muted",
                  )}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-faint">Humans</p>
            <div className="mt-2 flex gap-1">
              {Array.from({ length: total }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setHumans(n)}
                  className={cn(
                    "ui-chip h-11 flex-1 text-sm",
                    humans === n ? "ui-chip-on text-fg" : "text-muted",
                  )}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className={cn("grid gap-3", humans > 1 && "sm:grid-cols-2")}>
          {Array.from({ length: humans }, (_, i) => (
            <label key={i} className="block">
              <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-faint">
                {humans === 1 ? "Handle" : `Handle ${i + 1}`}
              </span>
              <input
                value={handles[i]}
                onChange={(e) => setHandle(i, e.target.value)}
                className="ui-chip mt-2 h-11 w-full px-3 text-sm text-fg outline-none"
                maxLength={16}
                autoComplete="off"
              />
            </label>
          ))}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            type="button"
            className="hud-cta w-full sm:flex-1"
            onClick={() =>
              onStart({ total, humans: Math.min(humans, total), handles: handles.slice(0, humans) })
            }
          >
            Enter floor one now
          </Button>
          <Button type="button" variant="secondary" className="w-full sm:w-auto" onClick={onHow}>
            Briefing
          </Button>
        </div>
      </Panel>
    </main>
    </div>
  );
}

function CheatRail({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <div className="fixed left-0 top-[28%] z-50">
      <button
        type="button"
        data-testid="cheat-switch"
        aria-pressed={on}
        onClick={onToggle}
        className={cn(
          "ui-chip flex flex-col items-center gap-2 px-2 py-3 font-mono text-[10px] uppercase tracking-[0.18em]",
          on ? "ui-chip-on text-fg" : "text-muted",
        )}
      >
        <Gauge className="size-4" />
        <span>Cheat</span>
        <span>{on ? "On" : "Off"}</span>
      </button>
    </div>
  );
}

function MusicRail({ muted, onToggle }: { muted: boolean; onToggle: () => void }) {
  return (
    <div className="fixed left-0 top-[52%] z-50">
      <button
        type="button"
        aria-pressed={!muted}
        onClick={onToggle}
        className={cn(
          "ui-chip flex flex-col items-center gap-2 px-2 py-3 font-mono text-[10px] uppercase tracking-[0.18em]",
          !muted ? "ui-chip-on text-fg" : "text-muted",
        )}
      >
        {muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
        <span>Bed</span>
        <span>{muted ? "Off" : "On"}</span>
      </button>
    </div>
  );
}

function FeedTicker() {
  const line =
    "Live on the crawl · Operators are standing by · Roll now · Three quests and you drop · As seen on the feed · Limited time offer · Ratings through the roof · Don't touch that dial · ";
  return (
    <div className="hud-ticker shrink-0" aria-hidden>
      <div className="hud-ticker-track">
        <span>{line}</span>
        <span>{line}</span>
      </div>
    </div>
  );
}

function FloorStrip({ floor }: { floor: number }) {
  return (
    <ol className="flex items-center gap-1">
      {Array.from({ length: PLANNED_FLOORS }, (_, i) => {
        const n = i + 1;
        const live = n <= PLAYABLE_FLOORS;
        const current = n === floor;
        return (
          <li
            key={n}
            className={cn(
              "flex size-6 items-center justify-center rounded-sm font-mono text-[10px]",
              current && "bg-accent text-accent-fg",
              live && !current && "bg-raised text-muted",
              !live && "bg-bg text-faint ring-1 ring-border",
            )}
            title={FLOOR_META[n as FloorId]?.name ?? `Floor ${n}`}
          >
            {n}
          </li>
        );
      })}
    </ol>
  );
}

function Prompt({
  state,
  busy,
  onRoll,
  onReroll,
  onStim,
  onFight,
  onEnd,
  onStayYes,
  onStayNo,
  onStairsYes,
  onStairsNo,
}: {
  state: GameState;
  busy: Busy;
  onRoll: () => void;
  onReroll: () => void;
  onStim: () => void;
  onFight: () => void;
  onEnd: () => void;
  onStayYes: () => void;
  onStayNo: () => void;
  onStairsYes: () => void;
  onStairsNo: () => void;
}) {
  const me = state.crawlers[state.current];
  if (busy === "dice") {
    return <p className="text-sm text-muted">Die in the air. Clicks wait.</p>;
  }
  if (busy === "walk") {
    return <p className="text-sm text-muted">On the move. Clicks wait until they arrive.</p>;
  }
  if (state.phase === "roll") {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-[11px] leading-snug text-muted">
          <span className="text-fg">{me.name}</span>
          {me.isHuman ? " — roll." : " is lining up a roll."}
        </p>
        {me.isHuman ? (
          <div className="flex gap-1">
            {bagOf(me).includes("stim") && me.hp < me.maxHp ? (
              <Button variant="secondary" className="h-9 px-2 text-xs" onClick={onStim}>
                Stim
              </Button>
            ) : null}
            <Button onClick={onRoll} className="hud-cta h-9 flex-1 text-xs">
              Roll now
            </Button>
          </div>
        ) : null}
      </div>
    );
  }
  if (state.phase === "move") {
    return (
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted">
          Rolled <span className="font-mono text-fg tabular-nums">{state.roll}</span>.{" "}
          {me.isHuman ? "Tap a ringed tile, or tap yourself to stay — the tile still pays out." : "Choosing a line…"}
        </p>
        {me.isHuman && me.featured ? (
          <Button variant="secondary" onClick={onReroll}>
            Burn featured
          </Button>
        ) : null}
      </div>
    );
  }
  if (state.phase === "stay-ask") {
    return (
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted">
          Stay on this tile? It pays out. The roll is spent. Mobs still hunt.
        </p>
        {me.isHuman ? (
          <div className="flex gap-2">
            <Button variant="secondary" onClick={onStayNo}>
              Keep moving
            </Button>
            <Button onClick={onStayYes}>Stay</Button>
          </div>
        ) : null}
      </div>
    );
  }
  if (state.phase === "stairs-ask") {
    return (
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted">
          Stairs are live. Drop now, or hang and close more quests.
        </p>
        {me.isHuman ? (
          <div className="flex gap-2">
            <Button variant="secondary" onClick={onStairsNo}>
              Keep crawling
            </Button>
            <Button onClick={onStairsYes}>Take the stairs</Button>
          </div>
        ) : null}
      </div>
    );
  }
  if (state.phase === "bump-pick") {
    return (
      <p className="text-sm text-muted">
        {me.isHuman
          ? pvpOn(state)
            ? "Pick a crawler to swing on."
            : "Pick a crawler to shove."
          : "Picking a body."}
      </p>
    );
  }
  if (state.phase === "bump-dir") {
    return <p className="text-sm text-muted">{me.isHuman ? "Tap a neighbor. They move one." : "Shoving."}</p>;
  }
  if (state.phase === "combat") {
    const combat = state.combat;
    const actor = combat ? state.crawlers[combat.crawlerIndex] : null;
    const canAct = Boolean(actor?.isHuman) && busy !== "dice";
    return (
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted">Fight on camera.</p>
        {canAct ? (
          <Button onClick={combat?.result ? onEnd : onFight} className="sm:flex-none">
            {combat?.result ? "Keep crawling" : "Swing"}
          </Button>
        ) : !combat ? (
          <Button onClick={onEnd} className="sm:flex-none">
            Keep crawling
          </Button>
        ) : null}
      </div>
    );
  }
  if (state.phase === "bonus") {
    return (
      <p className="text-sm text-muted">
        {state.giftKind === "race"
          ? "Costume change. Pick a race. The +2 stays."
          : "Floor gift. Pick before the drop. The +1 stays."}
      </p>
    );
  }
  return null;
}

function Beats({ state }: { state: GameState }) {
  const me = state.crawlers[state.current];
  const meta = FLOOR_META[state.floor];
  const need = meta.clearBeats;
  const ready = stairsReady(state, state.current);
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Panel size="sm" className="flex min-h-0 flex-1 flex-col p-2">
        <p className="hud-kicker flex items-center gap-1">
          Quests · <QuestMark finished={me.finished} need={need} />
        </p>
        {ready ? (
          <p className="mt-1 text-[11px] leading-snug text-accent">Stairs ready. Take them when you want.</p>
        ) : (
          <p className="mt-1 text-[11px] leading-snug text-muted">{floorClearHint(state)}</p>
        )}
        <div className="play-col-scroll mt-2 space-y-1.5">
          {me.beats.length ? (
            me.beats.map((b) => (
              <div key={b.id} className="rounded-sm bg-raised/80 px-2 py-1.5">
                <p className="text-xs font-medium leading-tight text-fg">{b.title}</p>
                <p className="mt-0.5 text-[10px] leading-snug text-muted">{beatHint(b)}</p>
              </div>
            ))
          ) : (
            <p className="text-[11px] text-faint">{need ? "No open quests." : "No quests this floor."}</p>
          )}
        </div>
      </Panel>
    </div>
  );
}

function Roster({ state }: { state: GameState }) {
  const meta = FLOOR_META[state.floor];
  const need = meta.clearBeats;
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Panel size="sm" className="flex min-h-0 flex-1 flex-col p-2">
        <p className="hud-kicker">Crawlers</p>
        <ul className="play-col-scroll mt-1.5 space-y-1">
          {state.crawlers.map((c, i) => (
            <li
              key={c.id}
              className={cn(
                "flex items-center justify-between gap-1 rounded-sm px-1.5 py-1 text-xs",
                i === state.current ? "bg-raised" : "",
              )}
            >
              <span className="flex min-w-0 items-center gap-1.5">
                <img
                  src={crawlerArt(c).src}
                  alt=""
                  className={cn("sprite size-6 shrink-0 object-contain", c.out && "opacity-30")}
                  style={{ filter: crawlerArt(c).filter }}
                />
                <span className={cn("truncate text-fg", c.out && "text-faint line-through")}>{c.name}</span>
                <span className="flex items-center gap-0.5 text-[10px] text-danger">
                  <Heart className="size-2.5" />
                  {c.hp}
                </span>
              </span>
              <QuestMark finished={c.finished} need={need} />
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}

function CurrentActor({
  state,
  busy,
  locked,
  bumpTargets,
  onRoll,
  onReroll,
  onStim,
  onFight,
  onEnd,
  onStayYes,
  onStayNo,
  onStairsYes,
  onStairsNo,
  onBump,
}: {
  state: GameState;
  busy: Busy;
  locked: boolean;
  bumpTargets: GameState["crawlers"];
  onRoll: () => void;
  onReroll: () => void;
  onStim: () => void;
  onFight: () => void;
  onEnd: () => void;
  onStayYes: () => void;
  onStayNo: () => void;
  onStairsYes: () => void;
  onStairsNo: () => void;
  onBump: (id: string) => void;
}) {
  const me = state.crawlers[state.current];
  const art = crawlerArt(me);
  return (
    <Panel size="sm" className="flex min-h-0 flex-1 flex-col p-2">
      <p className="hud-kicker">Now</p>
      <div className="mt-1 flex min-h-0 flex-1 flex-col items-center">
        <img
          src={art.src}
          alt=""
          className="hud-hero sprite size-14 object-contain sm:size-16"
          style={{ filter: art.filter }}
        />
        <p className="mt-1 truncate text-sm font-medium text-fg">{me.name}</p>
        <p className="flex items-center gap-1 text-[11px] text-danger">
          <Heart className="size-3" />
          {me.hp}/{me.maxHp}
        </p>
        {me.race || me.atkBonus || me.moveBonus ? (
          <p className="mt-0.5 line-clamp-1 text-center text-[10px] leading-snug text-muted">
            {me.race ? RACES[me.race].name : null}
            {me.atkBonus ? ` · +${me.atkBonus} swing` : ""}
            {me.moveBonus ? ` · +${me.moveBonus} move` : ""}
          </p>
        ) : null}
        {bagOf(me).length ? (
          <p className="mt-0.5 flex flex-wrap items-center justify-center gap-1 text-[10px] text-muted">
            {bagOf(me).map((id, i) => (
              <span key={`${id}-${i}`} className="inline-flex items-center gap-0.5">
                <img src={SPRITES.items[id]} alt="" className="sprite size-4 object-contain" />
                {ITEM_INFO[id].name}
              </span>
            ))}
          </p>
        ) : null}
        <div className="mt-auto w-full pt-2">
          <Prompt
            state={state}
            busy={busy}
            onRoll={onRoll}
            onReroll={onReroll}
            onStim={onStim}
            onFight={onFight}
            onEnd={onEnd}
            onStayYes={onStayYes}
            onStayNo={onStayNo}
            onStairsYes={onStairsYes}
            onStairsNo={onStairsNo}
          />
          {state.phase === "bump-pick" && me.isHuman && !locked ? (
            <div className="mt-2 flex flex-col gap-1">
              {bumpTargets.map((c) => (
                <Button key={c.id} variant="secondary" className="h-9 w-full text-xs" onClick={() => onBump(c.id)}>
                  {pvpOn(state) ? `Swing at ${c.name}` : `Shove ${c.name}`}
                </Button>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </Panel>
  );
}

function FloorBestiary({ state }: { state: GameState }) {
  const meta = FLOOR_META[state.floor];
  const kinds = [...new Set([...(meta.streetKinds ?? []), meta.gate].filter(Boolean))] as (keyof typeof MOB_INFO)[];
  return (
    <Panel size="sm" className="flex min-h-0 flex-1 flex-col p-2">
      <p className="hud-kicker">Floor mobs</p>
      <ul className="play-col-scroll mt-1.5 space-y-1.5">
        {kinds.length ? (
          kinds.map((kind) => {
            const info = MOB_INFO[kind];
            const live = state.mobs.filter((m) => m.kind === kind);
            const hp = live[0]?.hp ?? info.hp;
            return (
              <li key={kind} className="flex items-center gap-2">
                <img src={SPRITES.mobs[kind]} alt="" className="sprite size-8 shrink-0 object-contain" />
                <div className="min-w-0">
                  <p className="truncate text-xs text-fg">{info.name}</p>
                  <p className="font-mono text-[10px] tabular-nums text-muted">
                    Spd {info.speed} · HP {hp}/{info.hp}
                    {live.length ? ` · ${live.length}` : ""}
                  </p>
                </div>
              </li>
            );
          })
        ) : (
          <p className="text-[11px] text-faint">No mobs. Crawler on crawler.</p>
        )}
      </ul>
    </Panel>
  );
}

function Combat({
  state,
  dice,
  throwId,
  locked,
  onFight,
  onEnd,
  onDiceDone,
}: {
  state: GameState;
  dice: DiceShow | null;
  throwId: number;
  locked: boolean;
  onFight: () => void;
  onEnd: () => void;
  onDiceDone: () => void;
}) {
  const combat = state.combat;
  if (!combat) return null;
  const crawler = state.crawlers[combat.crawlerIndex];
  const rival = combat.foeKind === "crawler" ? state.crawlers.find((c) => c.id === combat.foeId) : null;
  const foe = combat.foeKind === "mob" ? state.mobs.find((m) => m.id === combat.foeId) : null;
  const human = crawler.isHuman;
  const info = foe ? MOB_INFO[foe.kind] : null;
  const throwing = dice?.where === "combat";
  const atk = throwing ? dice.values[0] : combat.atk;
  const def = throwing ? dice.values[1] : combat.def;
  const showDice = throwing || atk != null;
  const foeName = rival?.name ?? info?.name ?? "Thing";
  const edited = foe?.kind === "executive" && !state.enraged;
  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-bg/80 p-4"
      data-testid="combat-overlay"
    >
      <Panel className="flex max-h-[min(88dvh,36rem)] w-full max-w-sm flex-col overflow-hidden">
        <div className="overflow-y-auto p-6">
          <p className="hud-kicker">
            {rival ? "Face-off live" : "Fight live"}
          </p>
          <div className="mt-4 flex items-end justify-between gap-4">
            <div className="flex flex-1 flex-col items-center">
              <img src={crawlerArt(crawler).src} alt="" className="sprite h-20 w-20 object-contain" style={{ filter: crawlerArt(crawler).filter }} />
              <p className="mt-2 text-sm text-fg">{crawler.name}</p>
            </div>
            <p className="font-display text-2xl text-muted">vs</p>
            <div className="flex flex-1 flex-col items-center">
              {rival ? (
                <img src={crawlerArt(rival).src} alt="" className="sprite h-20 w-20 object-contain" style={{ filter: crawlerArt(rival).filter }} />
              ) : foe ? (
                <img
                  src={SPRITES.mobs[foe.kind]}
                  alt=""
                  className={cn(
                    "sprite object-contain",
                    foe.kind === "boss" || foe.kind === "executive" ? "h-24 w-24" : "h-20 w-20",
                  )}
                />
              ) : null}
              <p className="mt-2 text-sm text-fg">{foeName}</p>
              {foe && foe.hp > 1 ? (
                <p className="font-mono text-[10px] uppercase tracking-wider text-faint">{foe.hp} hp</p>
              ) : rival ? (
                <p className="font-mono text-[10px] uppercase tracking-wider text-faint">{rival.hp} hp</p>
              ) : null}
            </div>
          </div>
          {throwing ? (
            <div className="mt-4">
              <DiceThrow values={dice.values} throwId={throwId} onDone={onDiceDone} size={68} />
            </div>
          ) : showDice ? (
            <div className="mt-4 flex items-end justify-center gap-8">
              <div className="flex flex-col items-center">
                <Die face={atk ?? 1} size={72} />
                <p className="mt-1 font-mono text-lg tabular-nums text-fg">{atk}</p>
              </div>
              <div className="flex flex-col items-center">
                <Die face={def ?? 1} size={72} />
                <p className="mt-1 font-mono text-lg tabular-nums text-fg">{def}</p>
              </div>
            </div>
          ) : null}
          {combat.result && !throwing ? (
            <p className="mt-4 text-center text-sm text-muted">
              {combat.result === "win"
                ? rival
                  ? "They eat it."
                  : edited
                    ? "Edited out."
                    : foe && foe.hp > 1
                      ? "It staggers."
                      : "It drops."
                : combat.result === "lose"
                  ? rival
                    ? "You eat it."
                    : "You eat the hit."
                  : "Nobody committed."}
            </p>
          ) : (
            <p className="mt-4 text-center text-sm text-muted">
              {throwing
                ? "Dice in the air."
                : `Swing. Higher d6 wins. Spike is +2.${crawler.atkBonus ? ` You carry +${crawler.atkBonus}.` : ""}${
                    rival && rival.atkBonus ? ` They carry +${rival.atkBonus}.` : ""
                  }${info && (foe?.kind === "executive" && state.enraged ? 3 : info.bonus) ? ` It rolls +${foe?.kind === "executive" && state.enraged ? 3 : info.bonus}.` : ""}${
                    edited ? " It will not bleed until the feeds are dead." : ""
                  }`}
            </p>
          )}
        </div>
        {human ? (
          <div className="border-t border-border p-4">
            <Button className="w-full" disabled={locked} onClick={combat.result ? onEnd : onFight}>
              {combat.result ? "Keep crawling" : "Swing"}
            </Button>
          </div>
        ) : (
          <p className="border-t border-border p-4 text-center font-mono text-xs uppercase tracking-[0.16em] text-faint">
            Simulating
          </p>
        )}
      </Panel>
    </div>
  );
}

function BonusPick({
  state,
  onPick,
}: {
  state: GameState;
  onPick: (id: GiftId) => void;
}) {
  const i = state.bonusPicker ?? 0;
  const crawler = state.crawlers[i];
  if (!crawler) return null;
  const race = state.giftKind === "race";
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-bg/80 p-4 sm:items-center">
      <Panel className="w-full max-w-md p-6">
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-accent">
          Survived {FLOOR_META[state.floor].name}
        </p>
        <h2 className="mt-2 font-display text-3xl font-semibold uppercase tracking-tight">
          {crawler.name} picks {race ? "a race" : "a gift"}
        </h2>
        <p className="mt-2 text-sm text-muted">
          {race
            ? "Everyone healed 1. Pick a body. The bonus is +2 and it stays."
            : "Everyone healed 1. Pick a gift. It is +1 and it stays for the rest of the run."}
        </p>
        {crawler.isHuman ? (
          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            {(race ? RACE_IDS : BONUS_IDS).map((id) => {
              const info = race ? RACES[id as keyof typeof RACES] : BONUSES[id as keyof typeof BONUSES];
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => onPick(id)}
                  className="ui-box-sm p-3 text-left hover:brightness-110"
                >
                  {race ? (
                    <img
                      src={SPRITES.races[id as keyof typeof SPRITES.races]}
                      alt=""
                      className="sprite mb-2 h-14 w-14 object-contain"
                    />
                  ) : null}
                  <p className="text-sm font-medium text-fg">{info.name}</p>
                  <p className="mt-1 text-xs text-muted">{info.blurb}</p>
                </button>
              );
            })}
          </div>
        ) : (
          <p className="mt-5 text-center font-mono text-xs uppercase tracking-[0.16em] text-faint">
            {crawler.name} is grabbing loot
          </p>
        )}
      </Panel>
    </div>
  );
}

function Over({ state, onAgain }: { state: GameState; onAgain: () => void }) {
  const winner = state.crawlers.find((c) => c.id === state.winnerId);
  const line =
    state.winWhy === "pvp"
      ? "takes the bowl"
      : state.winWhy === "boss"
        ? "dropped the boss"
        : state.winWhy === "clock"
          ? "outlasted the clock"
          : "takes the hour";
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-bg/80 p-4 sm:items-center">
      <Panel className="w-full max-w-md p-6">
        <p className="hud-kicker">Feed complete</p>
        <h2 className="hud-chrome mt-2 font-display text-4xl font-semibold uppercase tracking-tight">
          {winner?.name ?? "A crawler"} {line}
        </h2>
        <p className="mt-3 text-sm text-muted">
          Career {(winner?.career ?? 0) + (winner?.finished ?? 0)} quests. Box office{" "}
          <span className="font-mono text-fg tabular-nums">{formatViewers(state.viewers)}</span>.
        </p>
        <ul className="mt-5 space-y-2">
          {state.crawlers
            .slice()
            .sort((a, b) => b.career + b.finished - (a.career + a.finished))
            .map((c) => (
              <li key={c.id} className="flex flex-col gap-0.5 text-sm">
                <span className="flex justify-between">
                  <span className="text-fg">{c.name}</span>
                  <span className="font-mono tabular-nums text-muted">
                    {c.career + c.finished} · {c.hp}hp
                  </span>
                </span>
                {c.awards.length ? (
                  <span className="text-xs text-accent">
                    {c.awards.map((a) => `${a.name} +${a.pts}`).join(" · ")}
                  </span>
                ) : null}
              </li>
            ))}
        </ul>
        <Button className="mt-6 w-full" onClick={onAgain}>
          Run it back
        </Button>
      </Panel>
    </div>
  );
}

export function RidgeCrawl() {
  const [screen, setScreen] = useState<Screen>("title");
  const [how, setHow] = useState(false);
  const [state, dispatch] = useReducer(reduce, null);
  const [setup, setSetup] = useState<Setup>({
    total: 3,
    humans: 1,
    handles: ["Crawler"],
  });
  const [busy, setBusy] = useState<Busy>(null);
  const [display, setDisplay] = useState<PosMap | null>(null);
  const [dice, setDice] = useState<DiceShow | null>(null);
  const [cheatOn, setCheatOnState] = useState(false);
  const [musicMuted, setMusicMuted] = useState(false);
  const [throwSeq, setThrowSeq] = useState(0);

  const busyRef = useRef<Busy>(null);
  const stateRef = useRef(state);
  const pendingRef = useRef<GameState | null>(null);
  const cheatRef = useRef(false);
  busyRef.current = busy;
  stateRef.current = state;
  cheatRef.current = cheatOn;

  useEffect(() => {
    const v = loadCheat();
    setCheatOnState(v);
    persistCheat(v);
    setMusicMuted(crawlMusic.loadMuted());
    crawlMusic.preload();
    crawlMusic.arm();
  }, []);

  useEffect(() => {
    if (screen === "play" && state?.floor) crawlMusic.setFloor(state.floor);
  }, [screen, state?.floor]);

  const setMusicOn = (on: boolean) => {
    const muted = !on;
    crawlMusic.setMuted(muted);
    setMusicMuted(muted);
  };

  const setCheatOn = (on: boolean) => {
    persistCheat(on);
    cheatRef.current = on;
    setCheatOnState(on);
  };

  const lock = (kind: Exclude<Busy, null>) => {
    busyRef.current = kind;
    setBusy(kind);
  };

  const unlock = () => {
    busyRef.current = null;
    setBusy(null);
    setDisplay(null);
    setDice(null);
    pendingRef.current = null;
  };

  const commitPending = () => {
    const next = pendingRef.current;
    pendingRef.current = null;
    if (next) dispatch({ type: "boot", state: next });
  };

  const followThrough = (before: PosMap, after: GameState, skip: Set<string>) => {
    const moves = diffsFrom(before, after, skip);
    if (!moves.length) {
      unlock();
      return;
    }
    setDisplay({
      crawlers: {
        ...before.crawlers,
        ...Object.fromEntries(
          after.crawlers.filter((c) => skip.has(c.id)).map((c) => [c.id, { ...c.pos }]),
        ),
      },
      mobs: { ...before.mobs },
    });
    lock("walk");
    walkPieces(moves, {
      setDisplay,
      onStep: () => sfx.step(),
      onDone: unlock,
      msPerTile: cheatRef.current ? CHEAT.walkMs : 155,
    });
  };

  const playDice = (next: GameState, show: DiceShow) => {
    pendingRef.current = next;
    lock("dice");
    sfx.dice();
    setThrowSeq((n) => n + 1);
    setDice(show);
  };

  const onDiceDone = () => {
    sfx.land();
    commitPending();
    unlock();
  };

  const playWalk = (fromState: GameState, next: GameState, moverId: string, from: Cell, to: Cell) => {
    const before = snapshotPos(fromState);
    pendingRef.current = next;
    lock("walk");
    setDisplay(before);
    walkPieces([{ bucket: "crawlers", id: moverId, from, to, wrap: wrapOn(fromState) }], {
      setDisplay,
      onStep: () => sfx.step(),
      onDone: () => {
        const landed = pendingRef.current ?? next;
        pendingRef.current = null;
        dispatch({ type: "boot", state: landed });
        if (landed.phase === "combat" || landed.phase === "bonus" || landed.phase === "over") {
          unlock();
          return;
        }
        followThrough(before, landed, new Set([moverId]));
      },
      msPerTile: cheatRef.current ? CHEAT.walkMs : 155,
    });
  };

  const start = (opts: Setup) => {
    unlockAudio();
    void crawlMusic.start();
    crawlMusic.setFloor(1);
    cancelWalk();
    unlock();
    setSetup(opts);
    dispatch({ type: "boot", state: createMatch(opts) });
    setScreen("play");
  };

  useEffect(() => {
    const w = window as unknown as {
      __gotoFloor?: (n: number) => void;
      __racePick?: () => void;
      __setRace?: (id: string) => void;
      __forceCombat?: () => void;
      __setCheat?: (on: boolean) => void;
      __unlock?: () => void;
    };
    w.__gotoFloor = (n: number) => {
      const s = stateRef.current;
      if (!s || !isFloorId(n)) return;
      cancelWalk();
      unlock();
      dispatch({ type: "boot", state: startFloor(s, n) });
    };
    w.__racePick = () => {
      const s = stateRef.current;
      if (!s) return;
      cancelWalk();
      unlock();
      dispatch({
        type: "boot",
        state: {
          ...s,
          phase: "bonus",
          giftKind: "race",
          bonusPicker: 0,
          combat: null,
          roll: null,
        },
      });
    };
    w.__setRace = (id: string) => {
      const s = stateRef.current;
      if (!s) return;
      dispatch({
        type: "boot",
        state: applyBonus(
          { ...s, phase: "bonus", giftKind: "race", bonusPicker: 0, floor: 3 },
          id as GiftId,
        ),
      });
    };
    w.__forceCombat = () => {
      const s = stateRef.current;
      if (!s) return;
      const foe = s.mobs[0];
      if (!foe) return;
      cancelWalk();
      unlock();
      dispatch({
        type: "boot",
        state: {
          ...s,
          phase: "combat",
          combat: {
            foeId: foe.id,
            foeKind: "mob",
            crawlerIndex: s.current,
            resume: "landing",
            atk: null,
            def: null,
            result: null,
          },
        },
      });
    };
    w.__setCheat = (on: boolean) => setCheatOn(on);
    w.__unlock = () => {
      cancelWalk();
      const pending = pendingRef.current;
      if (pending) {
        pendingRef.current = null;
        dispatch({ type: "boot", state: pending });
      }
      unlock();
    };
    return () => {
      delete w.__gotoFloor;
      delete w.__racePick;
      delete w.__setRace;
      delete w.__forceCombat;
      delete w.__setCheat;
      delete w.__unlock;
    };
  }, []);

  useEffect(() => {
    if (screen !== "play" || !state) return;
    if (
      state.phase === "over" ||
      state.phase === "handoff" ||
      state.phase === "combat" ||
      state.phase === "bonus"
    ) {
      return;
    }
    let last = performance.now();
    let id = 0;
    const loop = (now: number) => {
      const dt = Math.min(100, now - last);
      last = now;
      dispatch({ type: "tick", ms: dt });
      id = requestAnimationFrame(loop);
    };
    id = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(id);
  }, [screen, state?.phase]);

  useEffect(() => {
    const snap = stateRef.current;
    if (!snap || screen !== "play") return;
    if (busyRef.current) return;
    const me = snap.crawlers[snap.current];
    const combatActor = snap.combat ? snap.crawlers[snap.combat.crawlerIndex] : me;
    const bonusActor = snap.bonusPicker != null ? snap.crawlers[snap.bonusPicker] : me;
    const botTurn =
      snap.phase === "combat"
        ? !combatActor.isHuman
        : snap.phase === "bonus"
          ? !bonusActor.isHuman
          : !me.isHuman;
    if (!botTurn || snap.phase === "over" || snap.phase === "handoff") return;
    const t = window.setTimeout(() => {
      const s = stateRef.current;
      if (!s || busyRef.current) return;
      if (s.phase === "roll") {
        if (wantStim(s)) {
          dispatch({ type: "use-item" });
          return;
        }
        const next = applyRoll(s);
        playDice(next, { ...dieFaces(next.roll ?? 1), where: "board" });
      } else if (s.phase === "move") {
        if (wantReroll(s)) {
          const next = applyReroll(s);
          playDice(next, { ...dieFaces(next.roll ?? 1), where: "board" });
          return;
        }
        const dest = pickMove(s);
        const actor = s.crawlers[s.current];
        const next = applyMove(s, dest);
        if (next === s) return;
        sfx.move();
        playWalk(s, next, actor.id, actor.pos, dest);
      } else if (s.phase === "stay-ask") {
        dispatch({ type: "stay", stay: false });
      } else if (s.phase === "stairs-ask") {
        dispatch({ type: "stairs", take: true });
      } else if (s.phase === "bump-pick") {
        dispatch({ type: "bump-pick", id: pickBumpVictim(s) });
      } else if (s.phase === "bump-dir") {
        const dest = pickBumpDir(s);
        const victim = s.crawlers.find((c) => c.id === s.bumpVictimId);
        const next = applyBumpDir(s, dest);
        if (!victim || next === s) return;
        sfx.bump();
        playWalk(s, next, victim.id, victim.pos, dest);
      } else if (s.phase === "combat" && s.combat && !s.combat.result) {
        const next = applyFight(s);
        const atk = next.combat?.atk ?? 1;
        const def = next.combat?.def ?? 1;
        sfx.hit();
        playDice(next, { values: [atk, def], where: "combat" });
      } else if (s.phase === "combat" && s.combat?.result) {
        const before = snapshotPos(s);
        const next = applyCombatEnd(s);
        dispatch({ type: "boot", state: next });
        followThrough(before, next, new Set());
      } else if (s.phase === "combat") {
        const next = recoverCombat(s);
        if (next !== s) dispatch({ type: "boot", state: next });
      } else if (s.phase === "bonus") {
        sfx.complete();
        dispatch({ type: "bonus", id: pickBonus(s) });
      }
    }, cheatRef.current
      ? snap.phase === "combat"
        ? CHEAT.botCombatMs
        : CHEAT.botMs
      : snap.phase === "combat"
        ? 700
        : 380);
    return () => clearTimeout(t);
  }, [
    screen,
    busy,
    state?.phase,
    state?.current,
    state?.roll,
    state?.bumpVictimId,
    state?.combat?.result,
    state?.combat?.foeId,
    state?.bonusPicker,
    state?.crawlers[state?.current ?? 0]?.item,
  ]);

  useEffect(() => {
    if (!state) return;
    const onKey = (e: KeyboardEvent) => {
      if (busyRef.current) return;
      if (e.code === "Space" && state.phase === "roll" && state.crawlers[state.current].isHuman) {
        e.preventDefault();
        const next = applyRoll(state);
        playDice(next, { ...dieFaces(next.roll ?? 1), where: "board" });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [state, busy]);

  useEffect(() => {
    if (!busy) return;
    const ms = busy === "dice" ? (cheatRef.current ? 700 : 2500) : cheatRef.current ? 1400 : 5000;
    const t = window.setTimeout(() => {
      if (!busyRef.current) return;
      cancelWalk();
      const pending = pendingRef.current;
      if (pending) {
        pendingRef.current = null;
        dispatch({ type: "boot", state: pending });
      }
      unlock();
    }, ms);
    return () => clearTimeout(t);
  }, [busy]);

  useEffect(() => {
    if (!state || state.phase !== "combat") return;
    if (state.combat) return;
    dispatch({ type: "boot", state: recoverCombat(state) });
  }, [state]);

  const urgent = (state?.remainingMs ?? FLOOR_MS) < 60_000;

  const onCell = (cell: Cell) => {
    if (!state || busyRef.current) return;
    const me = state.crawlers[state.current];
    if (!me.isHuman) return;
    if (state.phase === "move") {
      if (state.roll == null) return;
      if (sameCell(cell, me.pos)) {
        dispatch({ type: "stay-ask" });
        return;
      }
      if (!legalMoves(state, me.pos, state.roll).some((c) => sameCell(c, cell))) return;
      const next = applyMove(state, cell);
      if (next === state) return;
      sfx.move();
      playWalk(state, next, me.id, me.pos, cell);
    } else if (state.phase === "bump-dir") {
      const victim = state.crawlers.find((c) => c.id === state.bumpVictimId);
      const next = applyBumpDir(state, cell);
      if (!victim || next === state) return;
      sfx.bump();
      playWalk(state, next, victim.id, victim.pos, cell);
    } else if (state.phase === "bump-pick") {
      const hit = occupants(state, me.pos, me.id).find((c) => sameCell(c.pos, cell) || sameCell(me.pos, cell));
      if (hit) dispatch({ type: "bump-pick", id: hit.id });
    }
  };

  const bumpTargets = useMemo(() => {
    if (!state || state.phase !== "bump-pick") return [];
    const me = state.crawlers[state.current];
    return occupants(state, me.pos, me.id);
  }, [state]);

  if (screen === "title" || !state) {
    return (
      <>
        <CheatRail on={cheatOn} onToggle={() => setCheatOn(!cheatOn)} />
        <MusicRail muted={musicMuted} onToggle={() => setMusicOn(musicMuted)} />
        <Title onStart={start} onHow={() => setHow(true)} />
        {how ? <HowTo onClose={() => setHow(false)} /> : null}
      </>
    );
  }

  const me = state.crawlers[state.current];
  const meta = FLOOR_META[state.floor];
  const locked = busy != null;

  const fight = () => {
    if (!state) return;
    if (busyRef.current === "dice") return;
    if (busyRef.current === "walk") {
      cancelWalk();
      unlock();
    }
    const next = applyFight(state);
    const atk = next.combat?.atk ?? 1;
    const def = next.combat?.def ?? 1;
    sfx.hit();
    playDice(next, { values: [atk, def], where: "combat" });
  };

  const fightEnd = () => {
    if (!state) return;
    if (busyRef.current === "dice") return;
    if (busyRef.current === "walk") {
      cancelWalk();
      unlock();
    }
    if (!state.combat) {
      dispatch({ type: "boot", state: recoverCombat(state) });
      return;
    }
    const before = snapshotPos(state);
    const next = applyCombatEnd(state);
    dispatch({ type: "boot", state: next });
    followThrough(before, next, new Set());
  };

  return (
    <div className="play-shell bg-bg text-fg" data-floor={state.floor} data-cheat={cheatOn ? "on" : "off"}>
      <header className="play-header flex shrink-0 items-center justify-between gap-2 border-b border-border px-3 py-2">
        <div className="min-w-0">
          <p className="hud-onair">On air · {meta.tag}</p>
          <p className="hud-chrome mt-0.5 truncate whitespace-nowrap font-display text-base uppercase leading-none sm:text-xl">
            Xpress Crawl
          </p>
        </div>
        <FloorStrip floor={state.floor} />
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="hud-kicker">Viewers</p>
            <p className="font-mono text-xs tabular-nums text-fg">{formatViewers(state.viewers)}</p>
          </div>
          <div className="text-right">
            <p className="hud-kicker">Clock</p>
            <p className={cn("font-mono text-xs tabular-nums", urgent ? "text-danger" : "text-chrome")}>
              {formatTime(state.remainingMs)}
            </p>
          </div>
          <button
            type="button"
            data-testid="cheat-switch"
            aria-pressed={cheatOn}
            onClick={() => setCheatOn(!cheatOn)}
            className={cn(
              "ui-chip h-8 px-2 font-mono text-[9px] uppercase tracking-[0.14em]",
              cheatOn ? "ui-chip-on text-fg" : "text-muted",
            )}
          >
            {cheatOn ? "Cheat on" : "Cheat"}
          </button>
          <button
            type="button"
            aria-pressed={!musicMuted}
            onClick={() => setMusicOn(musicMuted)}
            className={cn(
              "ui-chip flex h-8 items-center gap-1 px-2 font-mono text-[9px] uppercase tracking-[0.14em]",
              !musicMuted ? "ui-chip-on text-fg" : "text-muted",
            )}
          >
            {musicMuted ? <VolumeX className="size-3" /> : <Volume2 className="size-3" />}
            {musicMuted ? "Muted" : "Bed"}
          </button>
        </div>
      </header>
      <FeedTicker />

      <div className="play-hud">
        <div className="play-col">
          <CurrentActor
            state={state}
            busy={busy}
            locked={locked}
            bumpTargets={bumpTargets}
            onRoll={() => {
              if (busyRef.current) return;
              const next = applyRoll(state);
              playDice(next, { ...dieFaces(next.roll ?? 1), where: "board" });
            }}
            onReroll={() => {
              if (busyRef.current) return;
              const next = applyReroll(state);
              playDice(next, { ...dieFaces(next.roll ?? 1), where: "board" });
            }}
            onStim={() => {
              if (busyRef.current) return;
              dispatch({ type: "use-item" });
            }}
            onFight={fight}
            onEnd={fightEnd}
            onStayYes={() => dispatch({ type: "stay", stay: true })}
            onStayNo={() => dispatch({ type: "stay", stay: false })}
            onStairsYes={() => dispatch({ type: "stairs", take: true })}
            onStairsNo={() => dispatch({ type: "stairs", take: false })}
            onBump={(id) => dispatch({ type: "bump-pick", id })}
          />
          <FloorBestiary state={state} />
          <div className="flex shrink-0 gap-1">
            <Button variant="secondary" className="h-9 flex-1 px-2 text-xs" onClick={() => setHow(true)}>
              Briefing
            </Button>
            <Button
              variant="ghost"
              className="h-9 flex-1 px-2 text-xs"
              onClick={() => {
                cancelWalk();
                unlock();
                crawlMusic.stop();
                setScreen("title");
              }}
            >
              Abort
            </Button>
          </div>
        </div>

        <div className="play-col min-h-0">
          <Panel size="sm" className="shrink-0 px-2.5 py-1.5">
            <p className="hud-kicker">Control</p>
            <p className="mt-0.5 line-clamp-2 text-xs leading-snug text-fg">{state.log[0]?.text}</p>
          </Panel>
          <div className="flex min-h-0 flex-1 items-center justify-center">
            <Board
              className="aspect-square h-auto max-h-full w-full max-w-full landscape:h-full landscape:w-auto"
              state={state}
              onCell={onCell}
              locked={locked}
              display={display}
              overlay={
                dice?.where === "board" ? (
                  <div className="absolute inset-0 z-30 flex items-center justify-center bg-bg/45">
                    <DiceThrow values={dice.values} bonus={dice.bonus} throwId={throwSeq} onDone={onDiceDone} />
                  </div>
                ) : null
              }
            />
          </div>
        </div>

        <div className="play-col">
          <Beats state={state} />
          <Roster state={state} />
        </div>
      </div>

      {state.phase === "combat" ? (
        <Combat
          state={state}
          dice={dice?.where === "combat" ? dice : null}
          throwId={throwSeq}
          locked={busy === "dice"}
          onDiceDone={onDiceDone}
          onFight={fight}
          onEnd={fightEnd}
        />
      ) : null}

      {state.phase === "bonus" && !locked ? (
        <BonusPick
          state={state}
          onPick={(id) => {
            sfx.complete();
            dispatch({ type: "bonus", id });
          }}
        />
      ) : null}

      {state.phase === "handoff" && !locked ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-bg/80 p-4">
          <Panel className="w-full max-w-sm p-6 text-center">
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-accent">Pass the device</p>
            <h2 className="mt-2 font-display text-3xl font-semibold uppercase">
              {state.crawlers[state.current].name}
            </h2>
            <Button className="mt-6 w-full" onClick={() => dispatch({ type: "handoff" })}>
              I have it
            </Button>
          </Panel>
        </div>
      ) : null}

      {state.phase === "stay-ask" && me.isHuman && !locked ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-bg/80 p-4">
          <Panel className="w-full max-w-sm p-6 text-center">
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-accent">Hold</p>
            <h2 className="mt-2 font-display text-3xl font-semibold uppercase">Stay put?</h2>
            <p className="mt-3 text-sm text-muted">
              Spend the roll here. You do not walk. Mobs still hunt after.
            </p>
            <div className="mt-6 flex gap-2">
              <Button variant="secondary" className="flex-1" onClick={() => dispatch({ type: "stay", stay: false })}>
                Keep moving
              </Button>
              <Button className="flex-1" onClick={() => dispatch({ type: "stay", stay: true })}>
                Stay
              </Button>
            </div>
          </Panel>
        </div>
      ) : null}

      {state.phase === "stairs-ask" && me.isHuman && !locked ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-bg/80 p-4">
          <Panel className="w-full max-w-sm p-6 text-center">
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-accent">Stairwell</p>
            <h2 className="mt-2 font-display text-3xl font-semibold uppercase">Drop?</h2>
            <p className="mt-3 text-sm text-muted">
              Take the stairs and finish the floor, or stay and close more quests.
            </p>
            <div className="mt-6 flex gap-2">
              <Button variant="secondary" className="flex-1" onClick={() => dispatch({ type: "stairs", take: false })}>
                Keep crawling
              </Button>
              <Button className="flex-1" onClick={() => dispatch({ type: "stairs", take: true })}>
                Take the stairs
              </Button>
            </div>
          </Panel>
        </div>
      ) : null}

      {state.phase === "over" ? <Over state={state} onAgain={() => start(setup)} /> : null}
      {how ? <HowTo onClose={() => setHow(false)} /> : null}
    </div>
  );
}
