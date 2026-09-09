import { cn } from "@/lib/cn";
import { FLOOR_META, MOB_INFO } from "@/game/floors";
import type { PosMap, VCell } from "@/game/motion";
import {
  SIZE,
  STATION_LABEL,
  type Cell,
  type Crawler,
  type GameState,
  legalMoves,
  neighbors,
  sameCell,
  stationAt,
  trapAt,
  wrapOn,
} from "@/game/model";
import { crawlerArt, SPRITES } from "@/game/sprites";
import type { ReactNode } from "react";

function Token({ crawler, walking }: { crawler: Crawler; walking: boolean }) {
  const art = crawlerArt(crawler);
  return (
    <span className={cn("relative block size-8 sm:size-9", walking && "piece-walking", crawler.out && "opacity-30")} title={`${crawler.name} · ${crawler.hp} hp`}>
      <img
        src={art.src}
        alt=""
        className="sprite size-8 object-contain sm:size-9"
        style={{ filter: art.filter }}
        draggable={false}
      />
      <span className="absolute -bottom-0.5 left-1/2 flex -translate-x-1/2 gap-px">
        {Array.from({ length: crawler.maxHp }, (_, i) => (
          <span
            key={i}
            className={cn("size-1 rounded-full", i < crawler.hp ? "bg-danger" : "bg-fg/20")}
          />
        ))}
      </span>
    </span>
  );
}

function isMoving(pos: VCell): boolean {
  return Math.abs(pos.r - Math.round(pos.r)) > 0.03 || Math.abs(pos.c - Math.round(pos.c)) > 0.03;
}

function posOf(display: PosMap | null, bucket: "crawlers" | "mobs", id: string, fallback: Cell): VCell {
  return display?.[bucket][id] ?? fallback;
}

export function Board({
  state,
  onCell,
  locked = false,
  display = null,
  overlay = null,
  className,
}: {
  state: GameState;
  onCell: (cell: Cell) => void;
  locked?: boolean;
  display?: PosMap | null;
  overlay?: ReactNode;
  className?: string;
}) {
  const me = state.crawlers[state.current];
  const moveSet =
    !locked && state.phase === "move" && state.roll != null ? legalMoves(state, me.pos, state.roll) : [];
  const bumpSet =
    !locked && state.phase === "bump-dir" && state.bumpVictimId
      ? neighbors(state.crawlers.find((c) => c.id === state.bumpVictimId)?.pos ?? me.pos, wrapOn(state))
      : [];
  const bg = FLOOR_META[state.floor].bg;
  const mePos = posOf(display, "crawlers", me.id, me.pos);

  return (
    <div className={cn("relative mx-auto aspect-square w-full max-w-[min(100%,30rem)]", className)}>
      <div className="board-stage relative size-full overflow-hidden rounded-lg ring-1 ring-border">
        <img
          src={bg}
          alt=""
          className="absolute inset-0 size-full object-cover"
          draggable={false}
        />
        <div
          className="relative grid size-full gap-1 p-1"
          style={{ gridTemplateColumns: `repeat(${SIZE}, minmax(0, 1fr))` }}
        >
          {Array.from({ length: SIZE * SIZE }, (_, i) => {
            const r = Math.floor(i / SIZE);
            const c = i % SIZE;
            const cell = { r, c };
            const loc = stationAt(state, cell);
            const trap = trapAt(state, cell);
            const feed = state.feeds.find((f) => f.r === r && f.c === c);
            const canMove = moveSet.some((m) => sameCell(m, cell));
            const canBump = bumpSet.some((m) => sameCell(m, cell));
            const isCurrent = Math.round(mePos.r) === r && Math.round(mePos.c) === c;
            const canStay =
              !locked && state.phase === "move" && state.roll != null && isCurrent;

            return (
              <button
                key={i}
                type="button"
                onClick={() => {
                  if (!locked) onCell(cell);
                }}
                className={cn(
                  "relative flex min-h-0 flex-col items-center justify-between overflow-hidden rounded-sm p-0.5 text-left transition-colors duration-150",
                  loc ? "bg-raised/50" : "bg-surface/50",
                  canMove && "ring-2 ring-accent",
                  canStay && "ring-2 ring-fg",
                  canBump && "ring-2 ring-danger",
                  isCurrent && !canMove && !canStay && "ring-1 ring-fg/40",
                  locked && "cursor-wait",
                )}
              >
                {loc ? (
                  <img
                    src={SPRITES.stations[loc]}
                    alt=""
                    className="sprite pointer-events-none absolute inset-0 m-auto size-[72%] object-contain opacity-80"
                    draggable={false}
                  />
                ) : null}
                {trap?.sprung ? (
                  <img
                    src={SPRITES.trap}
                    alt=""
                    className="sprite pointer-events-none absolute inset-x-0 bottom-0 mx-auto size-7 object-contain opacity-90 sm:size-8"
                    draggable={false}
                  />
                ) : null}
                {feed ? (
                  <img
                    src={SPRITES.feed}
                    alt=""
                    className={cn(
                      "sprite pointer-events-none absolute inset-0 m-auto size-[55%] object-contain",
                      feed.cut && "opacity-25 grayscale",
                    )}
                    draggable={false}
                  />
                ) : null}
                <span className="relative z-10 flex w-full items-center justify-between px-0.5">
                  {loc ? (
                    <span className="truncate rounded-sm bg-bg/60 px-0.5 font-mono text-[8px] uppercase tracking-wider text-fg sm:text-[9px]">
                      {STATION_LABEL[loc]}
                    </span>
                  ) : feed ? (
                    <span className="truncate rounded-sm bg-bg/60 px-0.5 font-mono text-[8px] uppercase tracking-wider text-fg sm:text-[9px]">
                      {feed.cut ? "CUT" : "LIVE"}
                    </span>
                  ) : (
                    <span />
                  )}
                </span>
                <span className="relative z-10 h-9 w-full sm:h-10" />
              </button>
            );
          })}
        </div>

        {state.mobs.map((m, idx) => {
          const pos = posOf(display, "mobs", m.id, m.pos);
          const walking = isMoving(pos);
          const stack = state.mobs
            .filter((o) => {
              const p = posOf(display, "mobs", o.id, o.pos);
              return Math.round(p.r) === Math.round(pos.r) && Math.round(p.c) === Math.round(pos.c);
            })
            .findIndex((o) => o.id === m.id);
          return (
            <div
              key={m.id}
              className={cn("board-piece", walking && "piece-walking")}
              style={{
                ["--pc" as string]: String(pos.c),
                ["--pr" as string]: String(pos.r),
                ["--ox" as string]: `${stack * 6}px`,
                ["--oy" as string]: `${stack * -4}px`,
                zIndex: 12 + Math.round(pos.r) + idx,
              }}
            >
              <span className="relative block">
                <img
                  src={SPRITES.mobs[m.kind]}
                  alt={m.kind}
                  className={cn(
                    "sprite object-contain",
                    m.kind === "boss" || m.kind === "executive" ? "size-9 sm:size-11" : "size-7 sm:size-8",
                  )}
                  draggable={false}
                />
                {m.hp > 1 ? (
                  <span className="absolute -bottom-0.5 left-1/2 flex -translate-x-1/2 gap-px">
                    {Array.from({ length: MOB_INFO[m.kind].hp }, (_, i) => (
                      <span key={i} className={cn("size-1 rounded-full", i < m.hp ? "bg-danger" : "bg-fg/20")} />
                    ))}
                  </span>
                ) : null}
              </span>
            </div>
          );
        })}

        {state.crawlers.map((cr) => {
          const pos = posOf(display, "crawlers", cr.id, cr.pos);
          const stack = state.crawlers
            .filter((o) => {
              const p = posOf(display, "crawlers", o.id, o.pos);
              return Math.round(p.r) === Math.round(pos.r) && Math.round(p.c) === Math.round(pos.c);
            })
            .findIndex((o) => o.id === cr.id);
          return (
            <div
              key={cr.id}
              className="board-piece"
              style={{
                ["--pc" as string]: String(pos.c),
                ["--pr" as string]: String(pos.r),
                ["--ox" as string]: `${stack * 8}px`,
                ["--oy" as string]: `${stack * -7}px`,
                zIndex: 20 + Math.round(pos.r) + (cr.id === me.id ? 2 : 0),
              }}
            >
              <Token crawler={cr} walking={isMoving(pos)} />
            </div>
          );
        })}

        {overlay}
      </div>
    </div>
  );
}
