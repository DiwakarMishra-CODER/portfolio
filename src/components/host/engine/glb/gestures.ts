// Small moves he makes on his own (fidgets), his nap and his dizzy sway,
// keyframed here on the ready-made character's bones. They're additive
// clips: they play on top of whatever he's doing, so his idle keeps
// breathing underneath.
//
// Each key turns a bone about the character's own axes (x: his left, y: up,
// z: towards you), applied after its parent's turn, so a move reads the way
// you'd describe it ("raise the right arm forward, then bend the elbow up"),
// whatever way each bone happens to be oriented in the file.
import { AdditiveAnimationBlendMode, AnimationClip, AnimationMixer, Euler, Quaternion, QuaternionKeyframeTrack, Vector3, type Object3D } from "three";
import type { ClipName } from "../rig";

type Turn = [number, number, number];
type Key = [t: number, turns: Record<string, Turn>];

// Bone names as three.js sees them (dots stripped).
const MOVES: Partial<Record<ClipName, Key[]>> = {
  // Pushes his glasses up the nose with the right hand.
  glasses: [
    [0, {}],
    [0.45, { UpperArmR: [-1.2, 0, 0.45], LowerArmR: [-1.9, -0.45, 0], Head: [0.14, 0, 0] }],
    [0.6, { UpperArmR: [-1.25, 0, 0.45], LowerArmR: [-2.05, -0.45, 0], Head: [0.04, 0, 0] }],
    [0.9, { UpperArmR: [-1.25, 0, 0.45], LowerArmR: [-2.05, -0.45, 0], Head: [0.02, 0, 0] }],
    [1.5, {}],
  ],
  // Lifts his left wrist and checks the time.
  watch: [
    [0, {}],
    [0.5, { UpperArmL: [-0.55, 0, -0.35], LowerArmL: [-1.3, -0.6, 0], Head: [0.38, 0.32, 0], Neck: [0.1, 0.1, 0] }],
    [1.4, { UpperArmL: [-0.55, 0, -0.35], LowerArmL: [-1.3, -0.6, 0], Head: [0.42, 0.34, 0], Neck: [0.1, 0.1, 0] }],
    [2.0, {}],
  ],
  // Arms out and up, a lean back.
  stretch: [
    [0, {}],
    [0.7, { Chest: [-0.18, 0, 0], UpperArmL: [0, 0, 1.75], UpperArmR: [0, 0, -1.75], LowerArmL: [0, 0, 0.5], LowerArmR: [0, 0, -0.5], Head: [-0.25, 0, 0] }],
    [1.3, { Chest: [-0.22, 0, 0], UpperArmL: [0, 0, 1.85], UpperArmR: [0, 0, -1.85], LowerArmL: [0, 0, 0.55], LowerArmR: [0, 0, -0.55], Head: [-0.3, 0, 0] }],
    [2.2, {}],
  ],
  // A look around the page: one side, the other, back.
  look: [
    [0, {}],
    [0.5, { Neck: [0, 0.25, 0], Head: [-0.05, 0.4, 0] }],
    [1.1, { Neck: [0, 0.25, 0], Head: [-0.05, 0.42, 0] }],
    [1.7, { Neck: [0, -0.22, 0], Head: [0.05, -0.36, 0] }],
    [2.2, { Neck: [0, -0.22, 0], Head: [0.05, -0.38, 0] }],
    [2.8, {}],
  ],
  // Shifts his weight to one side and back.
  shift: [
    [0, {}],
    [0.6, { Abdomen: [0, 0.05, -0.07], Chest: [0, 0, 0.03], Head: [0, 0, 0.05] }],
    [1.6, { Abdomen: [0, 0.05, -0.07], Chest: [0, 0, 0.03], Head: [0, 0, 0.05] }],
    [2.2, {}],
  ],
  // A nod: yes, that one (agreeing with what you picked).
  nod: [
    [0, {}],
    [0.22, { Head: [0.2, 0, 0], Neck: [0.06, 0, 0] }],
    [0.44, { Head: [-0.02, 0, 0] }],
    [0.66, { Head: [0.16, 0, 0], Neck: [0.04, 0, 0] }],
    [1.0, {}],
  ],
  // Dozes off: chin to chest, a slump. Held at the end (until he's woken).
  sleep: [
    [0, {}],
    [0.5, { Head: [0.15, 0, 0.05] }],
    [0.7, { Head: [0.05, 0, 0] }],
    [1.6, { Chest: [0.16, 0, 0], Neck: [0.16, 0, 0], Head: [0.3, 0, 0.12], UpperArmL: [0.08, 0, 0], UpperArmR: [0.08, 0, 0] }],
  ],
  // Slow breathing, on top of the slump (loops).
  snore: [
    [0, {}],
    [1.6, { Chest: [-0.05, 0, 0], Head: [-0.04, 0, 0] }],
    [3.2, {}],
  ],
  // Holds something up beside his head with his right hand (the proof
  // clipping in a room's column), glancing at it. Held at the end.
  hold: [
    [0, {}],
    [0.45, { UpperArmR: [-0.3, 0, -1.45], LowerArmR: [0, 0, -1.25], Head: [0.05, 0.22, 0.06], Neck: [0, 0.08, 0] }],
  ],
  // Flying (Nightfall): the classic superhero takeoff on top of his idle.
  // Right fist straight up, left arm down and a little back, chin up, legs
  // straight and together, trailing a little. No bent knee (from the front
  // the shoe shows end-on, like a boot) and no foot turns (the shoes are
  // skinned across the ankle and stretch up the shin). Held in the air.
  soar: [
    [0, {}],
    [0.32, {
      UpperArmR: [-0.25, 0, -2.85], LowerArmR: [0, 0, -0.05],
      UpperArmL: [0.3, 0, 0.18], LowerArmL: [-0.2, 0, 0],
      Chest: [-0.1, 0, 0], Head: [-0.28, 0, 0],
      UpperLegR: [0.12, 0, 0.05], LowerLegR: [0.18, 0, 0],
      UpperLegL: [0.12, 0, -0.05], LowerLegL: [0.18, 0, 0],
    }],
  ],
  // Cranking the projector at his right: forearm out, the hand going round
  // in a small circle (loops).
  crank: [
    [0, { UpperArmR: [-0.75, 0, -0.42], LowerArmR: [-0.85, 0, 0], Head: [0.12, -0.3, 0] }],
    [0.2, { UpperArmR: [-0.92, 0, -0.42], LowerArmR: [-0.6, 0, 0], Head: [0.12, -0.3, 0] }],
    [0.4, { UpperArmR: [-0.75, 0, -0.42], LowerArmR: [-0.35, 0, 0], Head: [0.12, -0.3, 0] }],
    [0.6, { UpperArmR: [-0.58, 0, -0.42], LowerArmR: [-0.6, 0, 0], Head: [0.12, -0.3, 0] }],
    [0.8, { UpperArmR: [-0.75, 0, -0.42], LowerArmR: [-0.85, 0, 0], Head: [0.12, -0.3, 0] }],
  ],
  // Carrying the film reel into the cinema in his right hand: the arm a
  // little out from his side and the forearm forward, so the reel rides by
  // his hip instead of swinging into his leg. Held at the end.
  carry: [
    [0, {}],
    [0.3, { UpperArmR: [-0.05, 0, -0.1], LowerArmR: [-0.22, 0, 0] }],
  ],
  // Putting the reel on the projector at his right: from the carry, he looks
  // at it, lifts the reel up onto its front arm, presses it home, and brings
  // the hand down to the crank. (HostLayer swaps the reel from his hand to the
  // projector at MOUNT_AT.)
  mount: [
    [0, { UpperArmR: [-0.05, 0, -0.1], LowerArmR: [-0.22, 0, 0] }],
    [0.25, { UpperArmR: [-0.3, 0, -0.35], LowerArmR: [-0.7, 0, 0], Head: [0.12, -0.35, 0], Neck: [0, -0.1, 0] }],
    [0.6, { UpperArmR: [-0.95, 0, -1.05], LowerArmR: [-0.55, 0, 0], Chest: [0, -0.18, 0.05], Head: [-0.05, -0.42, 0], Neck: [0, -0.12, 0] }],
    [0.78, { UpperArmR: [-1.0, 0, -1.12], LowerArmR: [-0.4, 0, 0], Chest: [0, -0.2, 0.06], Head: [-0.05, -0.42, 0], Neck: [0, -0.12, 0] }],
    [1.25, { UpperArmR: [-0.75, 0, -0.42], LowerArmR: [-0.85, 0, 0], Head: [0.12, -0.3, 0] }],
  ],
  // Starweave's cut: a presenter's reveal toward the site beside him (his
  // right arm, the frame's side, sweeps out, palm open; he looks at it).
  // Scrubbed by the scroll (0 → 1) as its screen swings open; back at 1.
  reveal: [
    [0, {}],
    [0.3, { UpperArmR: [-0.75, 0, -0.55], LowerArmR: [-0.85, 0, 0], Chest: [0, -0.08, 0], Head: [0.05, -0.28, 0], Neck: [0, -0.08, 0] }],
    [0.62, { UpperArmR: [-0.4, 0, -1.3], LowerArmR: [-0.18, 0, 0], Chest: [0, -0.14, 0.03], Head: [0.08, -0.38, 0], Neck: [0, -0.1, 0] }],
    [0.82, { UpperArmR: [-0.38, 0, -1.32], LowerArmR: [-0.15, 0, 0], Chest: [0, -0.12, 0.03], Head: [0.1, -0.34, 0], Neck: [0, -0.1, 0] }],
    [1, {}],
  ],
  // Before the jump into the film: knees bend, he leans in, arms swing back,
  // eyes up at the screen. Scrubbed by the scroll (0 → 1).
  windup: [
    [0, {}],
    [1, {
      Abdomen: [0.28, 0, 0], Chest: [0.3, 0, 0], Head: [-0.55, 0, 0],
      UpperArmL: [1.05, 0, 0.15], UpperArmR: [1.05, 0, -0.15], LowerArmL: [-0.3, 0, 0], LowerArmR: [-0.3, 0, 0],
      UpperLegL: [-0.85, 0, 0], UpperLegR: [-0.85, 0, 0], LowerLegL: [1.35, 0, 0], LowerLegR: [1.35, 0, 0],
    }],
  ],
  // The dive: arms straight past his head, hands together, body long, legs
  // together and a little trailing. HostLayer turns his whole body so his
  // hands lead along the arc. Scrubbed by the scroll (0 → 1).
  dive: [
    [0, {}],
    [1, {
      UpperArmL: [-0.15, 0, 2.95], UpperArmR: [-0.15, 0, -2.95], LowerArmL: [0, 0, 0.08], LowerArmR: [0, 0, -0.08],
      Chest: [-0.12, 0, 0], Head: [-0.3, 0, 0],
      UpperLegL: [0.12, 0, -0.04], UpperLegR: [0.12, 0, 0.04], LowerLegL: [0.3, 0, 0], LowerLegR: [0.3, 0, 0],
    }],
  ],
  // Sitting in his cinema seat (the engine also lowers him and moves him back
  // into it): thighs level, shins down, the popcorn bucket on his lap in his
  // left hand, his right forearm on the armrest. Scrubbed by the engine.
  sit: [
    [0, {}],
    [1, {
      UpperLegL: [-1.5, 0, -0.06], UpperLegR: [-1.5, 0, 0.06], LowerLegL: [1.0, 0, 0], LowerLegR: [1.0, 0, 0],
      Abdomen: [-0.06, 0, 0],
      UpperArmL: [-0.35, 0, -0.08], LowerArmL: [-0.95, 0, 0],
      UpperArmR: [-0.2, 0, -0.18], LowerArmR: [-0.55, 0, 0],
    }],
  ],
  // Popcorn while he watches (loops, on top of sitting): a hand into the
  // bucket, up to his mouth, a chew, back to the armrest, a long look at the
  // film.
  munch: [
    [0, {}],
    [0.5, { UpperArmR: [-0.35, 0, 0.62], LowerArmR: [-0.75, 0, 0], Head: [0.12, 0, 0] }],
    [0.8, { UpperArmR: [-0.37, 0, 0.64], LowerArmR: [-0.8, 0, 0], Head: [0.12, 0, 0] }],
    [1.3, { UpperArmR: [-0.7, 0, 0.5], LowerArmR: [-1.45, -0.35, 0], Head: [0.1, 0, 0] }],
    [1.55, { UpperArmR: [-0.72, 0, 0.5], LowerArmR: [-1.5, -0.35, 0], Head: [0.04, 0, 0] }],
    [1.8, { UpperArmR: [-0.7, 0, 0.5], LowerArmR: [-1.45, -0.35, 0], Head: [0.08, 0, 0] }],
    [2.25, { UpperArmR: [-0.3, 0, 0.35], LowerArmR: [-0.85, 0, 0] }],
    [2.7, {}],
    [4.4, {}],
  ],
  // Applause at the end of the credits: hands up in front of his chest,
  // together and apart.
  clap: [
    [0, {}],
    [0.3, { UpperArmL: [-0.85, 0, -0.25], UpperArmR: [-0.85, 0, 0.25], LowerArmL: [-0.95, 0, 0], LowerArmR: [-0.95, 0, 0] }],
    [0.42, { UpperArmL: [-0.85, 0, -0.5], UpperArmR: [-0.85, 0, 0.5], LowerArmL: [-0.95, 0, 0], LowerArmR: [-0.95, 0, 0] }],
    [0.54, { UpperArmL: [-0.85, 0, -0.25], UpperArmR: [-0.85, 0, 0.25], LowerArmL: [-0.95, 0, 0], LowerArmR: [-0.95, 0, 0] }],
    [0.66, { UpperArmL: [-0.85, 0, -0.5], UpperArmR: [-0.85, 0, 0.5], LowerArmL: [-0.95, 0, 0], LowerArmR: [-0.95, 0, 0] }],
    [0.78, { UpperArmL: [-0.85, 0, -0.25], UpperArmR: [-0.85, 0, 0.25], LowerArmL: [-0.95, 0, 0], LowerArmR: [-0.95, 0, 0] }],
    [0.9, { UpperArmL: [-0.85, 0, -0.5], UpperArmR: [-0.85, 0, 0.5], LowerArmL: [-0.95, 0, 0], LowerArmR: [-0.95, 0, 0] }],
    [1.02, { UpperArmL: [-0.85, 0, -0.25], UpperArmR: [-0.85, 0, 0.25], LowerArmL: [-0.95, 0, 0], LowerArmR: [-0.95, 0, 0] }],
    [1.14, { UpperArmL: [-0.85, 0, -0.5], UpperArmR: [-0.85, 0, 0.5], LowerArmL: [-0.95, 0, 0], LowerArmR: [-0.95, 0, 0] }],
    [1.6, {}],
  ],
  // Thrown about too much: a sway, his head lagging behind.
  dizzy: [
    [0, {}],
    [0.4, { Abdomen: [0, 0, 0.12], Head: [0, 0.2, -0.16] }],
    [0.9, { Abdomen: [0, 0, -0.12], Head: [0, -0.2, 0.16] }],
    [1.4, { Abdomen: [0, 0, 0.1], Head: [0, 0.18, -0.14] }],
    [1.9, { Abdomen: [0, 0, -0.08], Head: [0, -0.12, 0.1] }],
    [2.5, {}],
  ],
};

const FPS = 30;
const smooth = (t: number) => t * t * (3 - 2 * t);

/**
 * The moves above, as additive clips for this character. Measured on his
 * idle pose (so "raise the arm" starts from his arm as it hangs at rest);
 * the bones are put back exactly as they were afterwards.
 */
export function buildGestures(root: Object3D, idle: AnimationClip): Partial<Record<ClipName, AnimationClip>> {
  const saved: [Object3D, Quaternion, Vector3][] = [];
  root.traverse((o) => saved.push([o, o.quaternion.clone(), o.position.clone()]));
  const mixer = new AnimationMixer(root);
  mixer.clipAction(idle).play();
  mixer.update(0);
  root.updateMatrixWorld(true);

  // Each bone's world rotation in the idle pose, in the character's space.
  const rootInv = root.getWorldQuaternion(new Quaternion()).invert();
  const idleWorld = new Map<Object3D, Quaternion>();
  const world = (o: Object3D) => {
    if (!idleWorld.has(o)) idleWorld.set(o, rootInv.clone().multiply(o.getWorldQuaternion(new Quaternion())));
    return idleWorld.get(o)!;
  };

  const out: Partial<Record<ClipName, AnimationClip>> = {};
  for (const [name, keys] of Object.entries(MOVES) as [ClipName, Key[]][]) {
    const names = [...new Set(keys.flatMap(([, turns]) => Object.keys(turns)))];
    const bones = names.map((n) => root.getObjectByName(n)).filter((b): b is Object3D => !!b);
    if (bones.length !== names.length) continue; // not this skeleton
    const used = new Set(bones);
    const duration = keys[keys.length - 1][0];
    const times: number[] = [];
    const values = new Map<Object3D, number[]>(bones.map((b) => [b, []]));
    const turn = new Map<Object3D, Quaternion>();
    const e = new Euler();

    for (let f = 0; f <= Math.round(duration * FPS); f++) {
      const t = Math.min(duration, f / FPS);
      times.push(t);
      // Each bone's turn at t: eased between the keys either side.
      let i = 0;
      while (i < keys.length - 2 && keys[i + 1][0] <= t) i++;
      const [t0, a] = keys[i];
      const [t1, b] = keys[i + 1];
      const k = smooth(Math.max(0, Math.min(1, (t - t0) / (t1 - t0 || 1))));
      for (const bone of bones) {
        const ta = a[bone.name] ?? [0, 0, 0];
        const tb = b[bone.name] ?? [0, 0, 0];
        turn.set(bone, new Quaternion().setFromEuler(e.set(ta[0] + (tb[0] - ta[0]) * k, ta[1] + (tb[1] - ta[1]) * k, ta[2] + (tb[2] - ta[2]) * k)));
      }
      // D(bone) = its turn after everything above it turned: R(bone) · D(parent).
      const chain = (o: Object3D | null): Quaternion => {
        if (!o || o === root) return new Quaternion();
        const up = chain(o.parent);
        return used.has(o) ? turn.get(o)!.clone().multiply(up) : up;
      };
      for (const bone of bones) {
        // The local change that gives that world turn: W⁻¹ · D(p)⁻¹ · R · D(p) · W.
        const dp = chain(bone.parent);
        const w = world(bone);
        const delta = w.clone().invert().multiply(dp.clone().invert()).multiply(turn.get(bone)!).multiply(dp).multiply(w);
        values.get(bone)!.push(delta.x, delta.y, delta.z, delta.w);
      }
    }
    const clip = new AnimationClip(
      name,
      duration,
      bones.map((b) => new QuaternionKeyframeTrack(`${b.name}.quaternion`, times, values.get(b)!)),
      AdditiveAnimationBlendMode,
    );
    out[name] = clip;
  }

  mixer.stopAllAction();
  mixer.uncacheRoot(root);
  for (const [o, q, p] of saved) {
    o.quaternion.copy(q);
    o.position.copy(p);
  }
  root.updateMatrixWorld(true);
  return out;
}
