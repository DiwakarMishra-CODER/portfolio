// The stand-in's moves, as ordinary keyframe tracks on the bone names in
// rig.ts: the same AnimationMixer path a Mixamo GLB's clips take, so the
// engine never knows which model it's driving. Angles in radians; the hips
// rest at y = 7 (the top of the legs).
import { AnimationClip, Euler, NumberKeyframeTrack, Quaternion, QuaternionKeyframeTrack, VectorKeyframeTrack } from "three";
import type { ClipName } from "../rig";

type Rot = [x: number, y: number, z: number];

/** A rotation track: times in seconds, Euler angles per key. */
function rot(bone: string, times: number[], eulers: Rot[]) {
  const q = new Quaternion();
  const values = eulers.flatMap(([x, y, z]) => q.setFromEuler(new Euler(x, y, z)).toArray());
  return new QuaternionKeyframeTrack(`${bone}.quaternion`, times, values);
}
const pos = (bone: string, times: number[], ys: number[], x = 0, z = 0) =>
  new VectorKeyframeTrack(`${bone}.position`, times, ys.flatMap((y) => [x, y, z]));
const scaleY = (bone: string, times: number[], ys: number[]) =>
  new VectorKeyframeTrack(`${bone}.scale`, times, ys.flatMap((y) => [1 + (1 - y) * 0.5, y, 1 + (1 - y) * 0.5]));
const clip = (name: ClipName, duration: number, tracks: (QuaternionKeyframeTrack | VectorKeyframeTrack | NumberKeyframeTrack)[]) =>
  new AnimationClip(name, duration, tracks);

const Z: Rot = [0, 0, 0];

export function voxelClips() {
  return {
    // Breathing, a slow sway: alive without asking for attention.
    idle: clip("idle", 3.2, [
      pos("hips", [0, 1.6, 3.2], [7, 7.12, 7]),
      rot("chest", [0, 1.6, 3.2], [Z, [0.03, 0, 0], Z]),
      rot("head", [0, 0.8, 1.6, 2.4, 3.2], [Z, [0, 0, 0.03], Z, [0, 0, -0.03], Z]),
      rot("armL", [0, 1.6, 3.2], [[0, 0, -0.04], [0, 0, -0.08], [0, 0, -0.04]]),
      rot("armR", [0, 1.6, 3.2], [[0, 0, 0.04], [0, 0, 0.08], [0, 0, 0.04]]),
    ]),
    wave: clip("wave", 1.6, [
      rot("armR", [0, 0.25, 0.5, 0.75, 1.0, 1.25, 1.6], [Z, [0, 0, 2.5], [0, 0, 2.15], [0, 0, 2.6], [0, 0, 2.15], [0, 0, 2.5], Z]),
      rot("head", [0, 0.4, 1.2, 1.6], [Z, [0, 0, -0.08], [0, 0, -0.08], Z]),
    ]),
    // Points to his right (the viewer's left), where the page's text is.
    point: clip("point", 1.4, [
      rot("armL", [0, 0.25, 1.1, 1.4], [Z, [0, 0.3, -1.45], [0, 0.3, -1.45], Z]),
      rot("head", [0, 0.25, 1.1, 1.4], [Z, [0, -0.35, 0], [0, -0.35, 0], Z]),
    ]),
    // Pushes his glasses up.
    think: clip("think", 1.6, [
      rot("armR", [0, 0.35, 1.2, 1.6], [Z, [-2.5, 0, 0.55], [-2.5, 0, 0.55], Z]),
      rot("head", [0, 0.35, 1.2, 1.6], [Z, [0.12, 0, 0], [0.12, 0, 0], Z]),
    ]),
    surprised: clip("surprised", 0.9, [
      pos("hips", [0, 0.18, 0.42, 0.9], [7, 8.4, 7, 7]),
      rot("armL", [0, 0.18, 0.6, 0.9], [Z, [0, 0, -0.8], [0, 0, -0.5], Z]),
      rot("armR", [0, 0.18, 0.6, 0.9], [Z, [0, 0, 0.8], [0, 0, 0.5], Z]),
      rot("head", [0, 0.18, 0.6, 0.9], [Z, [-0.18, 0, 0], [-0.1, 0, 0], Z]),
    ]),
    // Dangling while carried: arms out and up (straight up hides them behind
    // the head), legs kicking a little.
    held: clip("held", 0.8, [
      rot("armL", [0, 0.4, 0.8], [[0, 0, -2.0], [0, 0, -2.2], [0, 0, -2.0]]),
      rot("armR", [0, 0.4, 0.8], [[0, 0, 2.0], [0, 0, 2.2], [0, 0, 2.0]]),
      rot("legL", [0, 0.2, 0.4, 0.6, 0.8], [[0.35, 0, 0], [-0.25, 0, 0], [0.35, 0, 0], [-0.25, 0, 0], [0.35, 0, 0]]),
      rot("legR", [0, 0.2, 0.4, 0.6, 0.8], [[-0.25, 0, 0], [0.35, 0, 0], [-0.25, 0, 0], [0.35, 0, 0], [-0.25, 0, 0]]),
    ]),
    fall: clip("fall", 0.6, [
      rot("armL", [0, 0.6], [[0, 0, -1.8], [0, 0, -2.1]]),
      rot("armR", [0, 0.6], [[0, 0, 1.8], [0, 0, 2.1]]),
      rot("legL", [0, 0.6], [[0.4, 0, 0], [0.2, 0, 0]]),
      rot("legR", [0, 0.6], [[-0.3, 0, 0], [-0.1, 0, 0]]),
    ]),
    // A squash on landing, then upright: fast, then a hard stop.
    land: clip("land", 0.5, [
      pos("hips", [0, 0.08, 0.3, 0.5], [7, 6.2, 7.15, 7]),
      scaleY("chest", [0, 0.08, 0.3, 0.5], [1, 0.86, 1.03, 1]),
      rot("armL", [0, 0.08, 0.5], [[0, 0, -0.9], [0, 0, -0.9], Z]),
      rot("armR", [0, 0.08, 0.5], [[0, 0, 0.9], [0, 0, 0.9], Z]),
    ]),
    walk: clip("walk", 0.6, [
      pos("hips", [0, 0.15, 0.3, 0.45, 0.6], [7, 7.35, 7, 7.35, 7]),
      rot("legL", [0, 0.3, 0.6], [[0.5, 0, 0], [-0.5, 0, 0], [0.5, 0, 0]]),
      rot("legR", [0, 0.3, 0.6], [[-0.5, 0, 0], [0.5, 0, 0], [-0.5, 0, 0]]),
      rot("armL", [0, 0.3, 0.6], [[-0.4, 0, -0.05], [0.4, 0, -0.05], [-0.4, 0, -0.05]]),
      rot("armR", [0, 0.3, 0.6], [[0.4, 0, 0.05], [-0.4, 0, 0.05], [0.4, 0, 0.05]]),
    ]),
    sit: clip("sit", 1, [
      pos("hips", [0, 1], [3.6, 3.6]),
      rot("legL", [0, 1], [[-1.5, 0, 0], [-1.5, 0, 0]]),
      rot("legR", [0, 1], [[-1.5, 0, 0], [-1.5, 0, 0]]),
      rot("armL", [0, 1], [[-0.3, 0, -0.1], [-0.3, 0, -0.1]]),
      rot("armR", [0, 1], [[-0.3, 0, 0.1], [-0.3, 0, 0.1]]),
    ]),
  };
}
