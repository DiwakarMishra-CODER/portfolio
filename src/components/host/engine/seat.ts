// The Arthouse room's props, in his toon style: a cinema seat (red velvet,
// dark armrests on a pedestal) that stands behind him in that room, and the
// popcorn bucket on his lap while he watches. Both face +z, like him.
import { BoxGeometry, CanvasTexture, Color, CylinderGeometry, Group, IcosahedronGeometry, Mesh, MeshToonMaterial, SRGBColorSpace, type BufferGeometry } from "three";

/** A cinema seat whose cushion top is at `seatY`, set behind his feet. */
export function buildSeat(H: number, seatY: number) {
  const geos: BufferGeometry[] = [];
  const g = <T extends BufferGeometry>(geo: T) => (geos.push(geo), geo);
  const velvet = new MeshToonMaterial({ color: new Color("#9c2733") });
  const velvetDark = new MeshToonMaterial({ color: new Color("#6e1b25") });
  const dark = new MeshToonMaterial({ color: new Color("#24262b") });
  const brass = new MeshToonMaterial({ color: new Color("#c9a45c") });

  const root = new Group();
  const W = H * 0.3; // between the armrests
  const D = H * 0.24; // the cushion's depth
  const back = -H * 0.2; // the seat-back's plane (behind him)
  const cz = back + D / 2 + H * 0.02; // the cushion's middle

  const cushion = new Mesh(g(new BoxGeometry(W, H * 0.055, D)), velvet);
  cushion.position.set(0, seatY - H * 0.0275, cz);
  const base = new Mesh(g(new BoxGeometry(W * 0.96, H * 0.04, D * 0.9)), velvetDark);
  base.position.set(0, seatY - H * 0.075, cz);
  const backrest = new Mesh(g(new BoxGeometry(W, H * 0.42, H * 0.06)), velvet);
  backrest.position.set(0, seatY + H * 0.17, back);
  const backShell = new Mesh(g(new BoxGeometry(W * 1.04, H * 0.44, H * 0.03)), velvetDark);
  backShell.position.set(0, seatY + H * 0.165, back - H * 0.04);
  root.add(cushion, base, backrest, backShell);
  // Armrests (with a brass cap at the front) on side panels down to the floor.
  for (const s of [-1, 1]) {
    const panel = new Mesh(g(new BoxGeometry(H * 0.03, seatY + H * 0.06, D + H * 0.04)), dark);
    panel.position.set(s * (W / 2 + H * 0.015), (seatY + H * 0.06) / 2, cz - H * 0.01);
    const arm = new Mesh(g(new BoxGeometry(H * 0.05, H * 0.025, D + H * 0.06)), dark);
    arm.position.set(s * (W / 2 + H * 0.015), seatY + H * 0.07, cz);
    const cap = new Mesh(g(new BoxGeometry(H * 0.052, H * 0.027, H * 0.02)), brass);
    cap.position.set(s * (W / 2 + H * 0.015), seatY + H * 0.07, cz + D / 2 + H * 0.03);
    root.add(panel, arm, cap);
  }
  return {
    object: root,
    dispose() {
      geos.forEach((x) => x.dispose());
      [velvet, velvetDark, dark, brass].forEach((m) => m.dispose());
    },
  };
}

/** A striped popcorn bucket, piled high, its base at y = 0. */
export function buildPopcorn(H: number) {
  const geos: BufferGeometry[] = [];
  const g = <T extends BufferGeometry>(geo: T) => (geos.push(geo), geo);
  // Red and white stripes, the cinema bucket everyone knows.
  const c = document.createElement("canvas");
  c.width = 64;
  c.height = 8;
  const x = c.getContext("2d")!;
  for (let i = 0; i < 8; i++) {
    x.fillStyle = i % 2 ? "#f4efe6" : "#c8262f";
    x.fillRect(i * 8, 0, 8, 8);
  }
  const tex = new CanvasTexture(c);
  tex.colorSpace = SRGBColorSpace;
  const paper = new MeshToonMaterial({ map: tex });
  const corn = new MeshToonMaterial({ color: new Color("#f6dc8a") });
  const cornLight = new MeshToonMaterial({ color: new Color("#fff1c4") });

  const root = new Group();
  const h = H * 0.085;
  const bucket = new Mesh(g(new CylinderGeometry(H * 0.042, H * 0.032, h, 16, 1, true)), paper);
  bucket.position.y = h / 2;
  const bottom = new Mesh(g(new CylinderGeometry(H * 0.032, H * 0.032, H * 0.004, 16)), paper);
  bottom.position.y = H * 0.002;
  root.add(bucket, bottom);
  // The pile: kernels heaped over the rim, higher in the middle.
  const kernel = g(new IcosahedronGeometry(H * 0.011, 0));
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 26; i++) {
    const a = rnd() * Math.PI * 2;
    const r = Math.sqrt(rnd()) * H * 0.036;
    const k = new Mesh(kernel, i % 3 ? corn : cornLight);
    k.position.set(Math.cos(a) * r, h + H * 0.006 + (1 - r / (H * 0.036)) * H * 0.018 + rnd() * H * 0.006, Math.sin(a) * r);
    k.rotation.set(rnd() * 3, rnd() * 3, rnd() * 3);
    k.scale.setScalar(0.8 + rnd() * 0.5);
    root.add(k);
  }
  return {
    object: root,
    dispose() {
      geos.forEach((x) => x.dispose());
      [paper, corn, cornLight].forEach((m) => m.dispose());
      tex.dispose();
    },
  };
}
