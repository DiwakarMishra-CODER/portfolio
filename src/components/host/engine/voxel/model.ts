// The stand-in host: Diwakar in voxels. Built from boxes of unit cubes per
// bone, so it animates exactly like a rigged model. Only cubes with an open
// face are kept (the inside of the head is never drawn).
//
// Proportions are chibi on purpose: the head is about 40% of his height, so
// the quiff, the glasses and the beard still read when the whole character is
// ~130 pixels tall.
import { Color, BoxGeometry, Group, InstancedMesh, Matrix4, MeshStandardMaterial, Object3D } from "three";
import type { HostRig } from "../rig";
import { voxelClips } from "./clips";

export const PALETTE = {
  skin: "#b97f5a",
  skinShade: "#9f6a49",
  hair: "#1e1819",
  hairFade: "#4d3f39",
  hairHi: "#4a3c38",
  beard: "#352925",
  lip: "#4a2620",
  eyeWhite: "#f5efe8",
  pupil: "#1a110d",
  frame: "#727a85",
  frameArm: "#3f7d8c",
  shirt: "#9fc2e3",
  shirtShade: "#88aed3",
  collar: "#e6eef7",
  button: "#f4f7fb",
  trousers: "#2c3243",
  shoe: "#1b1718",
  brow: "#1e1819",
};
type Key = keyof typeof PALETTE;

/** A box of voxels, inclusive integer ranges, in the bone's local space. */
type Fill = [x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, color: Key];

const box = (x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, c: Key): Fill => [x0, x1, y0, y1, z0, z1, c];

// ── Each bone's voxels (x left→right of the viewer, y up, z toward the viewer) ──
// Head: 10 wide (x −5..4), 10 tall (y 0..9), 9 deep (z −4..4); face at z = 4.
const HEAD: Fill[] = [
  box(-5, 4, 0, 9, -4, 4, "skin"),
  // Ears.
  box(-6, -6, 3, 5, -1, 0, "skinShade"),
  box(5, 5, 3, 5, -1, 0, "skinShade"),
  // Hair: crown and back, short faded sides (lighter, so they read as a fade).
  box(-5, 4, 9, 10, -4, 3, "hair"),
  box(-5, 4, 4, 9, -5, -5, "hair"),
  box(-6, -6, 6, 8, -4, 1, "hairFade"),
  box(5, 5, 6, 8, -4, 1, "hairFade"),
  box(-5, 4, 9, 9, 4, 4, "hair"),
  // The quiff: lifted at the front, swept back and over to his left.
  box(-4, 3, 11, 11, -2, 4, "hair"),
  box(-4, 1, 12, 12, 0, 4, "hair"),
  box(2, 4, 11, 11, 3, 4, "hair"),
  // Strands of light across it, so it reads as hair, not a hat.
  box(-3, -1, 12, 12, 3, 3, "hairHi"),
  box(-1, 1, 12, 12, 1, 1, "hairHi"),
  box(1, 3, 11, 11, 0, 0, "hairHi"),
  box(-4, -2, 11, 11, -1, -1, "hairHi"),
  box(0, 3, 10, 10, -3, -3, "hairHi"),
  // Beard: short, in the plane of the face; a little chin and moustache.
  box(-5, 4, 0, 1, 4, 4, "beard"),
  box(-6, -6, 0, 2, -1, 3, "beard"),
  box(5, 5, 0, 2, -1, 3, "beard"),
  box(-5, -5, 0, 3, 3, 4, "beard"),
  box(4, 4, 0, 3, 3, 4, "beard"),
  box(-3, 2, 3, 3, 4, 4, "beard"),
  box(-3, 2, 0, 0, 5, 5, "beard"),
  box(-5, 4, -1, -1, -2, 4, "beard"),
  // Mouth: a smile in the beard.
  box(-2, 1, 2, 2, 4, 4, "lip"),
  // Nose.
  box(-1, 0, 4, 5, 5, 5, "skinShade"),
  // Eyebrows (the eyes are their own pieces, so they can move and blink).
  box(-4, -2, 8, 8, 4, 4, "brow"),
  box(1, 3, 8, 8, 4, 4, "brow"),
];

// Glasses: two rounded-square frames (corners left out), a bridge, the arms.
function glasses(): Fill[] {
  const f: Fill[] = [];
  for (const [x0, x1] of [
    [-5, -1],
    [0, 4],
  ]) {
    f.push(box(x0 + 1, x1 - 1, 7, 7, 5, 5, "frame"), box(x0 + 1, x1 - 1, 4, 4, 5, 5, "frame"));
    f.push(box(x0, x0, 5, 6, 5, 5, "frame"), box(x1, x1, 5, 6, 5, 5, "frame"));
  }
  f.push(box(-1, 0, 6, 6, 5, 5, "frame"));
  f.push(box(-6, -6, 6, 6, 0, 4, "frameArm"), box(5, 5, 6, 6, 0, 4, "frameArm"));
  return f;
}

// Torso: 8 wide, 7 tall, 5 deep; open collar and a button placket.
const CHEST: Fill[] = [
  box(-4, 3, 0, 6, -2, 2, "shirt"),
  box(-4, 3, 0, 1, -2, 2, "shirtShade"),
  box(-2, 1, 5, 6, 3, 3, "collar"),
  box(-1, 0, 4, 4, 3, 3, "skin"),
  box(-1, 0, 5, 6, 3, 3, "skin"),
  box(0, 0, 0, 3, 3, 3, "button"),
];
const NECK: Fill[] = [box(-1, 0, 0, 0, -1, 1, "skinShade")];
const ARM = (side: -1 | 1): Fill[] => {
  const x0 = side < 0 ? -2 : 0;
  return [box(x0, x0 + 1, -5, 0, -1, 0, "shirt"), box(x0, x0 + 1, -5, -5, -1, 0, "shirtShade"), box(x0, x0 + 1, -7, -6, -1, 0, "skin")];
};
const LEG = (side: -1 | 1): Fill[] => {
  const x0 = side < 0 ? -3 : 1;
  return [box(x0, x0 + 1, -6, -1, -1, 1, "trousers"), box(x0, x0 + 1, -7, -7, -1, 2, "shoe")];
};

/** Unit cubes for a list of fills; later fills win; inner cubes dropped. */
function voxels(fills: Fill[]) {
  const map = new Map<string, Key>();
  for (const [x0, x1, y0, y1, z0, z1, c] of fills)
    for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) map.set(`${x},${y},${z}`, c);
  const out: { x: number; y: number; z: number; c: Key }[] = [];
  for (const [k, c] of map) {
    const [x, y, z] = k.split(",").map(Number);
    const open = [
      [1, 0, 0],
      [-1, 0, 0],
      [0, 1, 0],
      [0, -1, 0],
      [0, 0, 1],
      [0, 0, -1],
    ].some(([dx, dy, dz]) => !map.has(`${x + dx},${y + dy},${z + dz}`));
    if (open) out.push({ x, y, z, c });
  }
  return out;
}

const cube = new BoxGeometry(1, 1, 1);

function mesh(fills: Fill[], material: MeshStandardMaterial) {
  const v = voxels(fills);
  const m = new InstancedMesh(cube, material, v.length);
  const mat = new Matrix4();
  const col = new Color();
  v.forEach((p, i) => {
    mat.makeTranslation(p.x + 0.5, p.y + 0.5, p.z + 0.5);
    m.setMatrixAt(i, mat);
    // ±3% value jitter so flat areas aren't dead (fixed per voxel position).
    const j = 1 + (((p.x * 73856093) ^ (p.y * 19349663) ^ (p.z * 83492791)) % 7) / 230;
    m.setColorAt(i, col.set(PALETTE[p.c]).multiplyScalar(j));
  });
  return m;
}

export function buildVoxelHost(): HostRig {
  const material = new MeshStandardMaterial({ roughness: 0.82, metalness: 0 });
  const bone = (name: string, x: number, y: number, z = 0) => {
    const o = new Object3D();
    o.name = name;
    o.position.set(x, y, z);
    return o;
  };

  const root = new Group();
  const hips = bone("hips", 0, 7);
  const legL = bone("legL", 0, 0);
  const legR = bone("legR", 0, 0);
  const chest = bone("chest", 0, 0);
  const neck = bone("neck", 0, 7);
  const head = bone("head", 0, 1);
  const armL = bone("armL", -4, 6);
  const armR = bone("armR", 4, 6);

  legL.add(mesh(LEG(-1), material));
  legR.add(mesh(LEG(1), material));
  chest.add(mesh(CHEST, material));
  neck.add(mesh(NECK, material));
  head.add(mesh([...HEAD, ...glasses()], material));
  armL.add(mesh(ARM(-1), material));
  armR.add(mesh(ARM(1), material));

  // Eyes: whites set into the face, pupils a hair in front of them (moved a
  // whole voxel by the look-at), and lids that cover both for a blink.
  const whites = mesh([box(-4, -2, 6, 6, 4, 4, "eyeWhite"), box(1, 3, 6, 6, 4, 4, "eyeWhite")], material);
  const pupils = mesh([box(-3, -3, 6, 6, 4, 4, "pupil"), box(2, 2, 6, 6, 4, 4, "pupil")], material);
  const lids = mesh([box(-4, -2, 6, 6, 4, 4, "skinShade"), box(1, 3, 6, 6, 4, 4, "skinShade")], material);
  whites.position.z = 0.01;
  pupils.position.z = 0.03;
  lids.position.z = 0.05;
  lids.visible = false;
  head.add(whites, pupils, lids);

  root.add(hips);
  hips.add(legL, legR, chest);
  chest.add(neck, armL, armR);
  neck.add(head);

  return {
    object: root,
    bones: { hips, chest, neck, head, armL, armR, legL, legR },
    clips: voxelClips(),
    height: 29,
    eyes(dx) {
      // Snap to whole voxels: a pixel character's eyes move a pixel, not a blur.
      pupils.position.x = Math.round(Math.max(-1, Math.min(1, dx * 1.6)));
    },
    blink(closed) {
      lids.visible = closed;
    },
    dispose() {
      root.traverse((o) => {
        if (o instanceof InstancedMesh) o.dispose();
      });
      material.dispose();
    },
  };
}
