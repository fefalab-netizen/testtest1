import {
  BedDouble,
  Bug,
  ChevronsUp,
  DoorOpen,
  Gift,
  Video,
} from "lucide-react";
import type { LocId } from "@/game/model";
import type { LucideIcon } from "lucide-react";

export const LOC_ICON: Record<LocId, LucideIcon> = {
  ingress: DoorOpen,
  saferoom: BedDouble,
  kiosk: Gift,
  camera: Video,
  den: Bug,
  stairs: ChevronsUp,
};
