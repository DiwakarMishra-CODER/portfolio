// The vintage film projector he runs in the cinema (the lights going down
// before Arthouse Atlas), in his own toon style: a charcoal body on a
// three-legged stand, two big reels on top (the silhouette everyone knows),
// a chrome lens pointing at the screen, and a crank by his hand. It stands at
// his right (the viewer's left), its lens aimed past him, up and to the
// left. The reels turn with the scroll; the lamp glows when it runs.
import { BoxGeometry, Color, CylinderGeometry, Group, Mesh, MeshBasicMaterial, MeshToonMaterial, type BufferGeometry, Vector3 } from "three";

/** A film reel (chrome rim, film, brass hub, three spokes), facing +z. */
export function makeReel(H: number, r: number) {
  const geos: BufferGeometry[] = [];
  const g = <T extends BufferGeometry>(geo: T) => (geos.push(geo), geo);
  const chrome = new MeshToonMaterial({ color: new Color("#c9ccd1") });
  const dark = new MeshToonMaterial({ color: new Color("#1f2226") });
  const brass = new MeshToonMaterial({ color: new Color("#c9a45c") });
  const reel = new Group();
  reel.add(
    new Mesh(g(new CylinderGeometry(r * H, r * H, H * 0.02, 32).rotateX(Math.PI / 2)), chrome),
    new Mesh(g(new CylinderGeometry(r * H * 0.7, r * H * 0.7, H * 0.024, 32).rotateX(Math.PI / 2)), dark),
    new Mesh(g(new CylinderGeometry(r * H * 0.16, r * H * 0.16, H * 0.03, 12).rotateX(Math.PI / 2)), brass),
  );
  for (let k = 0; k < 3; k++) {
    const spoke = new Mesh(g(new BoxGeometry(r * H * 1.3, H * 0.012, H * 0.028)), chrome);
    spoke.rotation.z = (k * Math.PI) / 3;
    reel.add(spoke);
  }
  return {
    object: reel,
    dispose() {
      geos.forEach((x) => x.dispose());
      [chrome, dark, brass].forEach((m) => m.dispose());
    },
  };
}

export function buildProjector(H: number) {
  const geos: BufferGeometry[] = [];
  const g = <T extends BufferGeometry>(geo: T) => (geos.push(geo), geo);
  const body = new MeshToonMaterial({ color: new Color("#3b4046") });
  const dark = new MeshToonMaterial({ color: new Color("#1f2226") });
  const chrome = new MeshToonMaterial({ color: new Color("#c9ccd1") });
  const brass = new MeshToonMaterial({ color: new Color("#c9a45c") });
  const glass = new MeshBasicMaterial({ color: new Color("#3a3326") });

  const root = new Group();
  // Hand height: the body's middle at about 55% of his height.
  const top = H * 0.62;

  // The stand: three legs to the floor.
  for (const [x, z] of [[-0.09, 0.07], [0.09, 0.07], [0, -0.1]]) {
    const leg = new Mesh(g(new CylinderGeometry(H * 0.008, H * 0.01, top - H * 0.08, 6)), dark);
    leg.position.set(x * H, (top - H * 0.08) / 2, z * H);
    leg.rotation.z = -x * 1.2;
    leg.rotation.x = z * 1.2;
    root.add(leg);
  }
  const box = new Mesh(g(new BoxGeometry(H * 0.3, H * 0.15, H * 0.13)), body);
  box.position.set(0, top, 0);
  root.add(box);
  const trim = new Mesh(g(new BoxGeometry(H * 0.31, H * 0.012, H * 0.135)), brass);
  trim.position.set(0, top + H * 0.07, 0);
  root.add(trim);

  // The lens: a chrome barrel out of the body's left end, glass at its tip.
  const lensAt = new Group();
  lensAt.position.set(-H * 0.15, top - H * 0.01, 0);
  const barrel = new Mesh(g(new CylinderGeometry(H * 0.032, H * 0.036, H * 0.1, 16).rotateZ(Math.PI / 2)), chrome);
  barrel.position.x = -H * 0.05;
  const tip = new Mesh(g(new CylinderGeometry(H * 0.028, H * 0.028, H * 0.006, 16).rotateZ(Math.PI / 2)), glass);
  tip.position.x = -H * 0.101;
  lensAt.add(barrel, tip);
  root.add(lensAt);

  // The reels: two big discs on arms, rear one higher, facing you; spokes so
  // you can see them turn. The front one is the film he brings (loaded()).
  const reels: Group[] = [];
  const reelParts: { dispose(): void }[] = [];
  for (const [x, y, r] of [[-0.07, 0.2, 0.11], [0.08, 0.27, 0.13]]) {
    const arm = new Mesh(g(new BoxGeometry(H * 0.012, H * (y - 0.06), H * 0.012)), dark);
    arm.position.set(x * H, top + H * (y / 2 + 0.03), -H * 0.02);
    root.add(arm);
    const made = makeReel(H, r);
    made.object.position.set(x * H, top + H * y, -H * 0.02);
    reelParts.push(made);
    reels.push(made.object);
    root.add(made.object);
  }

  // The crank, on the right end where his hand is.
  const crank = new Group();
  crank.position.set(H * 0.155, top, H * 0.02);
  const crankArm = new Mesh(g(new BoxGeometry(H * 0.01, H * 0.06, H * 0.01)), brass);
  crankArm.position.y = -H * 0.03;
  const knob = new Mesh(g(new CylinderGeometry(H * 0.01, H * 0.01, H * 0.03, 8).rotateZ(Math.PI / 2)), dark);
  knob.position.set(H * 0.015, -H * 0.06, 0);
  crank.add(crankArm, knob);
  root.add(crank);

  const lensPoint = new Vector3();
  return {
    object: root,
    /** Turn the reels and the crank (radians; driven by the scroll). */
    turn(a: number) {
      reels[0].rotation.z = -a * 1.3;
      reels[1].rotation.z = -a;
      crank.rotation.x = a * 1.6;
    },
    /** The front reel's place (where the one he carries goes). */
    frontReel() {
      return reels[0];
    },
    /** The front reel (the film he carried in) is on. */
    loaded(on: boolean) {
      reels[0].visible = on;
    },
    /** The lamp is on: the lens glows warm. */
    lamp(on: boolean) {
      glass.color.set(on ? "#fff3cf" : "#3a3326");
    },
    /** The lens tip, in world space (for the beam). */
    lens() {
      return tip.getWorldPosition(lensPoint);
    },
    dispose() {
      geos.forEach((x) => x.dispose());
      reelParts.forEach((x) => x.dispose());
      [body, dark, chrome, brass, glass].forEach((m) => m.dispose());
    },
  };
}
