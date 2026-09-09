import type { ItemId, LocId } from "./model";
import type { FloorId, MobKind, RaceId } from "./floors";

export const SPRITES = {
  crawler: "/sprites/crawler.gif",
  trap: "/sprites/trap.gif",
  feed: "/sprites/feed.gif",
  dice: {
    tumble: "/sprites/dice/tumble.gif",
    faces: {
      1: "/sprites/dice/1.png",
      2: "/sprites/dice/2.png",
      3: "/sprites/dice/3.png",
      4: "/sprites/dice/4.png",
      5: "/sprites/dice/5.png",
      6: "/sprites/dice/6.png",
    } satisfies Record<1 | 2 | 3 | 4 | 5 | 6, string>,
  },
  floors: {
    1: "/floors/1.jpg",
    2: "/floors/2.jpg",
    3: "/floors/3.jpg",
    4: "/floors/4.jpg",
    5: "/floors/5.jpg",
    6: "/floors/6.jpg",
    7: "/floors/7.jpg",
  } satisfies Record<FloorId, string>,
  mobs: {
    spider: "/sprites/mobs/spider.gif",
    brood: "/sprites/mobs/brood.gif",
    llama: "/sprites/mobs/llama.gif",
    "llama-brute": "/sprites/mobs/llama-brute.gif",
    boss: "/sprites/mobs/boss.gif",
    clown: "/sprites/mobs/clown.gif",
    weasel: "/sprites/mobs/weasel.gif",
    executive: "/sprites/mobs/executive.gif",
    drone: "/sprites/mobs/drone.gif",
    hound: "/sprites/mobs/hound.gif",
  } satisfies Record<MobKind, string>,
  races: {
    rhino: "/sprites/races/rhino.gif",
    bunny: "/sprites/races/bunny.gif",
    reptile: "/sprites/races/reptile.gif",
    naga: "/sprites/races/naga.gif",
  } satisfies Record<RaceId, string>,
  stations: {
    ingress: "/sprites/stations/ingress.png",
    saferoom: "/sprites/stations/saferoom.png",
    kiosk: "/sprites/stations/kiosk.png",
    camera: "/sprites/stations/camera.png",
    den: "/sprites/stations/den.png",
    stairs: "/sprites/stations/stairs.png",
  } satisfies Record<LocId, string>,
  items: {
    stim: "/sprites/items/stim.png",
    spike: "/sprites/items/spike.png",
    ward: "/sprites/items/ward.png",
    boots: "/sprites/items/boots.png",
  } satisfies Record<ItemId, string>,
};

export const SEAT_FILTER: Record<number, string> = {
  0: "none",
  1: "hue-rotate(165deg) saturate(1.15)",
  2: "hue-rotate(-18deg) saturate(1.25) brightness(1.05)",
  3: "hue-rotate(88deg) saturate(1.1)",
};

export function crawlerArt(c: { race: RaceId | null; seat: number }): { src: string; filter: string } {
  if (c.race) return { src: SPRITES.races[c.race], filter: "none" };
  return { src: SPRITES.crawler, filter: SEAT_FILTER[c.seat] ?? "none" };
}
