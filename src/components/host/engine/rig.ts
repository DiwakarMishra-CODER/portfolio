// The contract every host model meets: today the voxel stand-in, later the
// owner's real model (a GLB rigged in Mixamo). The engine only ever talks to
// a HostRig, so swapping models never touches the animations, the look-at or
// the tricks.
import type { AnimationClip, Object3D } from "three";

export const BONES = ["hips", "chest", "neck", "head", "armL", "armR", "legL", "legR"] as const;
export type BoneName = (typeof BONES)[number];

export const CLIPS = ["idle", "wave", "point", "think", "surprised", "held", "fall", "land", "walk", "run", "sit", "bump", "glasses", "watch", "stretch", "look", "shift", "nod", "sleep", "snore", "dizzy", "hold", "soar", "crank", "carry", "mount", "windup", "dive", "sit", "munch", "clap", "reveal"] as const;
export type ClipName = (typeof CLIPS)[number];

/** A model missing a clip plays its stand-in instead (or nothing: the small
 *  additive moves, fidgets to sleep, simply don't happen on a model without them). */
export const CLIP_FALLBACK: Partial<Record<ClipName, ClipName>> = {
  point: "wave",
  run: "walk",
  bump: "surprised",
  think: "idle",
  surprised: "wave",
  sit: "idle",
  walk: "idle",
  held: "fall",
};

export interface HostRig {
  /** Feet at y = 0, facing +z. */
  object: Object3D;
  bones: Partial<Record<BoneName, Object3D>> & { head: Object3D };
  clips: Partial<Record<ClipName, AnimationClip>> & { idle: AnimationClip };
  /** Total height in scene units (the camera frames this). */
  height: number;
  /** Pupils, -1 (his right) .. 1: the stand-in moves them a voxel; a GLB may use a morph. */
  eyes?: (dx: number) => void;
  blink?: (closed: boolean) => void;
  /** Recolour (and re-weigh) the outline: ink on light pages, a pale edge in dark rooms. */
  outline?: (color: string, width?: number) => void;
  dispose(): void;
}
