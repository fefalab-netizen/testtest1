const KEY = "ridge-crawl-cheat";

let flag = false;

export const CHEAT = {
  tumbleMs: 140,
  landMs: 60,
  walkMs: 40,
  botMs: 60,
  botCombatMs: 110,
  clockMul: 6,
} as const;

export function isCheat(): boolean {
  return flag;
}

export function setCheat(on: boolean): void {
  flag = on;
  try {
    localStorage.setItem(KEY, on ? "1" : "0");
  } catch {
    /* ignore quota / private mode */
  }
}

export function loadCheat(): boolean {
  try {
    flag = localStorage.getItem(KEY) === "1";
  } catch {
    flag = false;
  }
  return flag;
}

export function playerDie(): number {
  if (flag) return 6;
  return 1 + Math.floor(Math.random() * 6);
}

export function mobDie(): number {
  return 1 + Math.floor(Math.random() * 6);
}
