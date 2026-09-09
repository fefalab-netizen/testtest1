import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { CHEAT, isCheat } from "@/game/cheat";
import { reducedMotion } from "@/game/motion";
import { SPRITES } from "@/game/sprites";

function clampFace(n: number): 1 | 2 | 3 | 4 | 5 | 6 {
  const v = Math.max(1, Math.min(6, Math.round(n)));
  return v as 1 | 2 | 3 | 4 | 5 | 6;
}

export function Die({
  face,
  tumbling,
  size = 72,
  fast = false,
}: {
  face: number;
  tumbling?: boolean;
  size?: number;
  fast?: boolean;
}) {
  const f = clampFace(face);
  return (
    <span className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <img
        src={tumbling ? SPRITES.dice.tumble : SPRITES.dice.faces[f]}
        alt={tumbling ? "Die tumbling" : `Rolled ${f}`}
        className={cn("sprite die-sprite", tumbling ? "die-tumble" : "die-land", fast && "die-fast")}
        style={{ width: size, height: size }}
        draggable={false}
      />
    </span>
  );
}

export function DiceThrow({
  values,
  bonus,
  onDone,
  size = 88,
  throwId = 0,
}: {
  values: number[];
  bonus?: string;
  onDone: () => void;
  size?: number;
  throwId?: number;
}) {
  const fast = isCheat();
  const [phase, setPhase] = useState<"tumble" | "land">("tumble");
  const done = useRef(false);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;
  const token = `${throwId}:${values.join(",")}`;

  useEffect(() => {
    done.current = false;
    const skip = reducedMotion();
    setPhase(skip ? "land" : "tumble");
    const tumble = skip ? 0 : fast ? CHEAT.tumbleMs : 740;
    const land = skip ? 0 : fast ? CHEAT.landMs : 380;
    const t1 = window.setTimeout(() => setPhase("land"), tumble);
    const t2 = window.setTimeout(() => {
      if (done.current) return;
      done.current = true;
      onDoneRef.current();
    }, tumble + land + 16);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [token, fast]);

  return (
    <div className="flex items-end justify-center gap-5" data-testid="dice-throw">
      {values.map((v, i) => (
        <div key={`${token}-${i}-${v}`} className="flex flex-col items-center">
          <Die face={v} tumbling={phase === "tumble"} size={size} fast={fast} />
          {phase === "land" ? (
            <p className="mt-1 font-mono text-lg tabular-nums text-fg">{v}</p>
          ) : (
            <p className="mt-1 h-7" />
          )}
        </div>
      ))}
      {bonus && phase === "land" ? (
        <p className="mb-7 font-mono text-sm uppercase tracking-wider text-accent">{bonus}</p>
      ) : null}
    </div>
  );
}
