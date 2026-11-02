// The host as a low-poly toon character: rounded, chunky shapes with three
// bands of cartoon light (lit, mid, shadow), drawn small by the pixel pass
// like an indie game. Same skeleton as the voxel stand-in (bone names and
// rest positions), so every clip in voxel/clips.ts drives him unchanged.
//
// Units match the voxel model (hips rest at y = 7, feet at 0, ~29 tall).
import {
  CatmullRomCurve3,
  Color,
  CylinderGeometry,
  DataTexture,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshToonMaterial,
  NearestFilter,
  Object3D,
  RedFormat,
  Shape,
  ShapeGeometry,
  SphereGeometry,
  TorusGeometry,
  TubeGeometry,
  Vector3,
  type BufferGeometry,
  type Material,
} from "three";
import type { HostRig } from "../rig";
import { voxelClips } from "../voxel/clips";

export const TOON = {
  skin: "#c58a64",
  skinShade: "#a86f4d",
  nose: "#b98060",
  lip: "#7a3d33",
  mouth: "#3b1d18",
  teeth: "#f4ede6",
  hair: "#221a1a",
  hairHi: "#5a4945",
  hairFade: "#4a3a33",
  moustache: "#241b19",
  hairPart: "#6b5650",
  beard: "#2e2420",
  brow: "#1d1718",
  eyeWhite: "#fbf7f2",
  iris: "#3a2418",
  frame: "#353a42",
  frameArm: "#3f7d8c",
  shirt: "#a8c8e8",
  shirtShade: "#8db3da",
  collar: "#bcd5ef",
  button: "#f6f9fc",
  belt: "#3b2d27",
  trousers: "#283046",
  shoe: "#f3f1ec",
  sole: "#cfc9bf",
};
type Part = keyof typeof TOON;

/** Three bands of light, hard steps: the cartoon look. */
function toonRamp() {
  const t = new DataTexture(new Uint8Array([90, 165, 255]), 3, 1, RedFormat);
  t.minFilter = NearestFilter;
  t.magFilter = NearestFilter;
  t.needsUpdate = true;
  return t;
}

/** A rounded-rectangle loop in the xy plane (for the glasses' frames). */
function roundRect(w: number, h: number, r: number, steps = 6) {
  const pts: Vector3[] = [];
  const cx = w / 2 - r;
  const cy = h / 2 - r;
  const corners: [number, number, number][] = [
    [cx, cy, 0],
    [-cx, cy, Math.PI / 2],
    [-cx, -cy, Math.PI],
    [cx, -cy, (3 * Math.PI) / 2],
  ];
  for (const [x, y, a0] of corners)
    for (let i = 0; i <= steps; i++) {
      const a = a0 + (i / steps) * (Math.PI / 2);
      pts.push(new Vector3(x + Math.cos(a) * r, y + Math.sin(a) * r, 0));
    }
  return pts;
}
function roundRectShape(w: number, h: number, r: number) {
  const s = new Shape();
  roundRect(w, h, r).forEach((p, i) => (i === 0 ? s.moveTo(p.x, p.y) : s.lineTo(p.x, p.y)));
  s.closePath();
  return s;
}

// The hair's front lift: a short, neat crop. (Bigger lifts were tried — built
// from simple shapes they read as a tall hat, so don't push this up.)
const HAIR = { lift: 1.0, crest: 0.7, curl: 0.4 };

export function buildToonHost({ beard = true }: { beard?: boolean } = {}): HostRig {
  const ramp = toonRamp();
  const mats = new Map<string, Material>();
  const mat = (part: Part) => {
    if (!mats.has(part)) mats.set(part, new MeshToonMaterial({ color: new Color(TOON[part]), gradientMap: ramp }));
    return mats.get(part)!;
  };
  const basic = (color: string, opacity = 1) => {
    const key = `basic:${color}:${opacity}`;
    if (!mats.has(key)) mats.set(key, new MeshBasicMaterial({ color, transparent: opacity < 1, opacity }));
    return mats.get(key)!;
  };
  const geos: BufferGeometry[] = [];
  const g = <T extends BufferGeometry>(geo: T) => (geos.push(geo), geo);

  /** An ellipsoid: a sphere of radius 1 scaled to (sx, sy, sz). */
  const ell = (sx: number, sy: number, sz: number, seg = 20) => g(new SphereGeometry(1, seg, Math.round(seg * 0.7)).scale(sx, sy, sz));
  const cyl = (rt: number, rb: number, h: number, seg = 16) => g(new CylinderGeometry(rt, rb, h, seg));
  const put = (parent: Object3D, geo: BufferGeometry, m: Material, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) => {
    const o = new Mesh(geo, m);
    o.position.set(x, y, z);
    o.rotation.set(rx, ry, rz);
    parent.add(o);
    return o;
  };
  const bone = (name: string, x: number, y: number, z = 0) => {
    const o = new Object3D();
    o.name = name;
    o.position.set(x, y, z);
    return o;
  };

  const root = new Group();
  const hips = bone("hips", 0, 7);
  const legL = bone("legL", -1.7, 0);
  const legR = bone("legR", 1.7, 0);
  const chest = bone("chest", 0, 0);
  const neck = bone("neck", 0, 7);
  const head = bone("head", 0, 1);
  const armL = bone("armL", -4.3, 6.1);
  const armR = bone("armR", 4.3, 6.1);
  root.add(hips);
  hips.add(legL, legR, chest);
  chest.add(neck, armL, armR);
  neck.add(head);

  // ── Legs: chinos and white sneakers ──────────────────────────────────
  for (const leg of [legL, legR]) {
    put(leg, cyl(1.45, 1.3, 5.8), mat("trousers"), 0, -3.2);
    put(leg, ell(1.55, 1.0, 2.3), mat("shoe"), 0, -6.35, 0.55);
    put(leg, cyl(1.5, 1.5, 0.35, 16).scale(1, 1, 1.5), mat("sole"), 0, -6.85, 0.55);
  }

  // ── Torso: a fitted light-blue Oxford shirt, open collar, belt ────────
  put(chest, cyl(3.9, 3.5, 7.2, 20).scale(1, 1, 0.72), mat("shirt"), 0, 3.5);
  put(chest, ell(3.95, 1.0, 2.85), mat("shirt"), 0, 7.0);
  put(chest, cyl(3.55, 3.55, 0.7, 20).scale(1, 1, 0.74), mat("belt"), 0, 0.15);
  put(chest, cyl(1.75, 1.95, 1.1, 18), mat("collar"), 0, 7.45);
  put(chest, ell(1.15, 0.72, 0.24), mat("collar"), -0.95, 6.95, 2.5, -0.35, 0.25, 0.62);
  put(chest, ell(1.15, 0.72, 0.24), mat("collar"), 0.95, 6.95, 2.5, -0.35, -0.25, -0.62);
  put(chest, cyl(0.12, 0.12, 5.6, 6), mat("shirtShade"), 0, 3.4, 2.62);
  for (const y of [1.4, 3.0, 4.6]) put(chest, ell(0.22, 0.22, 0.18, 8), mat("button"), 0.32, y, 2.66);
  put(chest, ell(1.05, 1.0, 0.16), mat("shirtShade"), -1.75, 4.7, 2.5);

  // ── Arms: sleeves rolled to the forearm ──────────────────────────────
  for (const [arm, side] of [
    [armL, -1],
    [armR, 1],
  ] as const) {
    put(arm, ell(1.25, 1.25, 1.25), mat("shirt"), 0, -0.2);
    put(arm, cyl(1.15, 1.05, 3.4), mat("shirt"), 0, -2.0);
    put(arm, cyl(1.22, 1.22, 0.8), mat("shirtShade"), 0, -3.8);
    put(arm, cyl(0.9, 0.8, 2.6), mat("skin"), 0, -5.2);
    put(arm, ell(0.95, 1.05, 0.9), mat("skin"), side * 0.05, -6.8);
  }

  // ── Neck ──────────────────────────────────────────────────────────────
  put(neck, cyl(1.4, 1.5, 1.6), mat("skinShade"), 0, 0.7);

  // ── Head ──────────────────────────────────────────────────────────────
  put(head, ell(5.6, 5.6, 5.35, 28), mat("skin"), 0, 6.6);
  put(head, ell(5.25, 3.9, 4.85, 24), mat("skin"), 0, 4.0);
  put(head, ell(2.8, 1.45, 2.3, 16), mat("skin"), 0, 1.4, 2.5);
  for (const s of [-1, 1]) put(head, ell(0.75, 1.35, 1.05), mat("skinShade"), s * 5.55, 5.9, -0.3);
  put(head, ell(0.72, 0.95, 0.8), mat("nose"), 0, 5.0, 5.25);
  put(head, ell(0.4, 1.1, 0.42), mat("nose"), 0, 5.95, 5.2);

  // Beard: a short boxed beard, cut along a clean diagonal cheek line that
  // runs from the sideburn (high, by the ear) down to the corners of the
  // mouth. Vertices above the line are tucked inside the face, so the cut is
  // part of the shape itself. A neat moustache joins it at the corners.
  {
    const jaw = new SphereGeometry(1, 56, 40).scale(5.42, 4.1, 5.05);
    const pos = jaw.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z = pos.getZ(i);
      const line = -0.8 + 1.25 * Math.pow(Math.min(1, Math.abs(x) / 5.0), 1.4);
      if (y > line || z < -2.6) pos.setXYZ(i, x * 0.9, y * 0.9, z * 0.9);
    }
    jaw.computeVertexNormals();
    if (beard) {
      put(head, g(jaw), mat("beard"), 0, 4.0);
      put(head, ell(2.9, 1.5, 2.35, 16), mat("beard"), 0, 1.4, 2.5);
      put(head, ell(1.75, 0.38, 0.55), mat("moustache"), 0, 3.9, 4.98);
      for (const s of [-1, 1]) put(head, ell(0.32, 0.62, 0.4), mat("moustache"), s * 1.45, 3.42, 4.8, 0, 0, s * -0.2);
    } else jaw.dispose();
    const smile = g(new TorusGeometry(1.1, 0.17, 8, 18, Math.PI));
    put(head, smile, mat("mouth"), 0, 3.3, 4.98, 0, 0, Math.PI);
    put(head, ell(0.9, 0.13, 0.14), mat("teeth"), 0, 3.16, 5.06);
  }

  // Eyes: whites, irises with a shine (the irises move with the look-at),
  // and lids for the blink.
  const irises: Group[] = [];
  const eyeGroups: Group[] = [];
  for (const s of [-1, 1]) {
    const eye = new Group();
    eye.position.set(s * 2.15, 6.45, 4.95);
    put(eye, ell(1.08, 0.7, 0.5), mat("eyeWhite"));
    put(eye, ell(1.15, 0.11, 0.26), mat("brow"), 0, 0.6, 0.16, 0, 0, s * -0.06);
    const iris = new Group();
    put(iris, ell(0.5, 0.55, 0.3), mat("iris"), 0, -0.04, 0.36);
    put(iris, ell(0.14, 0.14, 0.1, 8), basic("#ffffff"), 0.16, 0.14, 0.6);
    eye.add(iris);
    irises.push(iris);
    eyeGroups.push(eye);
    head.add(eye);
  }

  // Eyebrows: thick, a touch low, angled slightly in: a stronger brow.
  const brows = new Group();
  for (const s of [-1, 1]) put(brows, ell(1.5, 0.42, 0.45), mat("brow"), s * 2.25, 7.75, 5.05, 0, 0, s * 0.12);
  head.add(brows);

  // Glasses: browline frames, a thick dark top bar over a slim rim, teal
  // arms, a glint.
  const glasses = new Group();
  {
    const loop = roundRect(3.9, 2.5, 0.65);
    const frameGeo = g(new TubeGeometry(new CatmullRomCurve3(loop, true), 48, 0.15, 6, true));
    const lensGeo = g(new ShapeGeometry(roundRectShape(3.8, 2.4, 0.6)));
    const browBar = g(new CylinderGeometry(0.34, 0.34, 3.7, 8).rotateZ(Math.PI / 2));
    const lens = basic("#e8f1fb", 0.14);
    for (const s of [-1, 1]) {
      put(glasses, frameGeo, mat("frame"), s * 2.2, 6.45, 5.75);
      put(glasses, browBar, mat("frame"), s * 2.2, 7.55, 5.78, 0, 0, s * 0.04);
      put(glasses, lensGeo, lens, s * 2.2, 6.45, 5.7);
      put(glasses, ell(0.75, 0.12, 0.05, 8), basic("#ffffff"), s * 2.2 - 0.7, 7.15, 5.95, 0, 0, 0.35);
      put(glasses, cyl(0.2, 0.2, 5.6, 6), mat("frameArm"), s * 4.15, 6.75, 2.9, Math.PI / 2, 0, 0);
    }
    put(glasses, cyl(0.2, 0.2, 0.8, 6), mat("frame"), 0, 6.75, 5.85, 0, 0, Math.PI / 2);
  }
  head.add(glasses);

  // Hair: a short, neat crop with a little lift at the front, sculpted as one
  // surface (separate blobs on a dome read as a bun or a beret). The sides
  // stay short and close (faded).
  {
    const fade = g(new SphereGeometry(1, 28, 16, Math.PI / 2 + 0.95, Math.PI * 2 - 1.9, 0.55, 1.15).scale(5.7, 5.0, 5.42));
    put(head, fade, mat("hairFade"), 0, 6.6, -0.2);
    const quiff = new SphereGeometry(1, 56, 36, 0, Math.PI * 2, 0, 1.25).scale(5.72, 5.75, 5.5);
    const pos = quiff.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z = pos.getZ(i);
      const high = Math.min(1, Math.max(0, (y / 5.75 - 0.3) / 0.5)); // the hairline stays put
      const front = Math.min(1, Math.max(0, (z + 2.5) / 7.5)); // 0 at the crown, 1 at the hairline
      const side = Math.max(0, 1 - Math.pow(Math.abs(x) / 5.4, 4)); // broad on top, short at the edges
      // A rounded wave, not a cone: it rises, crests just behind the
      // hairline, and rolls forward over it.
      const { lift: L, crest, curl } = HAIR;
      const wave = Math.exp(-Math.pow((front - crest) / 0.3, 2));
      const lift = L * wave * side * high;
      pos.setXYZ(i, x, y + lift, z + curl * lift);
    }
    quiff.computeVertexNormals();
    put(head, g(quiff), mat("hair"), 0.15, 6.6, -0.1, -0.3);
  }

  return {
    object: root,
    bones: { hips, chest, neck, head, armL, armR, legL, legR },
    clips: voxelClips(),
    height: 29.5,
    eyes(dx) {
      irises.forEach((i) => (i.position.x = Math.max(-0.38, Math.min(0.38, dx * 0.45))));
    },
    blink(closed) {
      eyeGroups.forEach((e) => (e.scale.y = closed ? 0.12 : 1));
    },
    dispose() {
      geos.forEach((x) => x.dispose());
      mats.forEach((m) => m.dispose());
      ramp.dispose();
    },
  };
}
