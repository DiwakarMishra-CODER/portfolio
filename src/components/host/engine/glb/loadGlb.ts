// A host made from a ready-made rigged character (a .glb). Built for the
// Quaternius "Ultimate Modular Men" characters (CC0, public/host/), whose
// skeleton and clip names are mapped here onto the HostRig contract, so the
// engine, the tricks and the walkthrough drive it exactly like the stand-ins.
//
// On top of the model as shipped: his colours (toon-shaded like the rest of
// the host), a slightly larger head so the face reads at pixel size, and his
// browline glasses on the head bone.
import {
  AnimationClip,
  BackSide,
  Box3,
  Color,
  CylinderGeometry,
  DataTexture,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshToonMaterial,
  NearestFilter,
  RedFormat,
  SkinnedMesh,
  Shape,
  ShapeGeometry,
  SphereGeometry,
  Vector3,
  type Material,
  type Object3D,
} from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import type { ClipName, HostRig } from "../rig";
import { buildGestures } from "./gestures";

// Bone names as three.js sees them (the loader strips the dots: "UpperArm.L" → "UpperArmL").
const BONE = { hips: "Hips", chest: "Chest", neck: "Neck", head: "Head", armL: "UpperArmL", armR: "UpperArmR", legL: "UpperLegL", legR: "UpperLegR" } as const;

/** Our moves, by the pack's clip names (first match wins). */
const CLIP: Partial<Record<ClipName, string[]>> = {
  idle: ["Idle_Neutral", "Idle"],
  wave: ["Wave"],
  walk: ["Walk"],
  run: ["Run"],
  surprised: ["HitRecieve"],
  point: ["Interact"],
  held: ["Run"], // carried: his legs keep running in the air
  fall: ["Run"],
  land: ["HitRecieve"],
  bump: ["HitRecieve_2", "HitRecieve"], // off the side of the screen
};

/** His colours, by the pack's material names (sRGB). */
const COLOURS: Record<string, string> = {
  Skin: "#c58a64",
  Skin_Darker: "#a86f4d",
  Hair: "#211a19",
  Eyebrows: "#1d1716",
  Eye: "#1a120e",
  Suit: "#27304a", // navy suit
  White: "#a9c8e8", // a light-blue shirt
  Tie: "#1c2233",
  Black: "#1b1a1c",
  Grey: "#3b3d44",
  DarkBrown: "#3a2a22",
};

function toonRamp() {
  const t = new DataTexture(new Uint8Array([95, 170, 255]), 3, 1, RedFormat);
  t.minFilter = NearestFilter;
  t.magFilter = NearestFilter;
  t.needsUpdate = true;
  return t;
}

export async function loadGlbHost(url: string, { outline = false }: { outline?: boolean } = {}): Promise<HostRig> {
  const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  const gltf = await loader.loadAsync(url);
  const root = new Group();
  root.add(gltf.scene);

  // Toon materials in his colours (the pack's own colours where we have none).
  const ramp = toonRamp();
  const made = new Map<string, Material>();
  gltf.scene.traverse((o) => {
    if (!(o instanceof Mesh)) return;
    if (/pistol|gun|sword|knife|axe/i.test(o.name)) o.visible = false; // no props, just him
    // The pack's eyes and brows read as sleepy and bored; ours replace them.
    const names = (Array.isArray(o.material) ? o.material : [o.material]).map((m) => m.name);
    if (names.every((n) => n === "Eye" || n === "Eyebrows")) o.visible = false;
    o.frustumCulled = false; // skinned bounds don't follow the animation
    const swap = (m: Material) => {
      const name = m.name;
      if (!made.has(name)) {
        const base = (m as Material & { color?: Color }).color?.clone() ?? new Color("#888888");
        made.set(name, new MeshToonMaterial({ color: COLOURS[name] ? new Color(COLOURS[name]) : base, gradientMap: ramp }));
      }
      m.dispose();
      return made.get(name)!;
    };
    o.material = Array.isArray(o.material) ? o.material.map(swap) : swap(o.material);
  });

  // A thin ink outline (HD only; the pixel pass draws its own): each body
  // mesh again, drawn back-faces only, pushed out along its normals after
  // skinning, so it follows him through every animation.
  const inks: MeshBasicMaterial[] = [];
  const inkWidth = { value: 0.0075 };
  if (outline) {
    const shells: SkinnedMesh[] = [];
    gltf.scene.traverse((o) => {
      if (o instanceof SkinnedMesh && o.visible) shells.push(o);
    });
    for (const m of shells) {
      const ink = new MeshBasicMaterial({ color: "#141413", side: BackSide });
      ink.onBeforeCompile = (shader) => {
        shader.uniforms.inkWidth = inkWidth;
        shader.vertexShader = "uniform float inkWidth;\n" + shader.vertexShader.replace(
          "#include <project_vertex>",
          "transformed += normalize(objectNormal) * inkWidth;\n#include <project_vertex>",
        );
      };
      inks.push(ink);
      const shell = new SkinnedMesh(m.geometry, ink);
      shell.bind(m.skeleton, m.bindMatrix);
      shell.frustumCulled = false;
      m.parent!.add(shell);
      shell.position.copy(m.position);
      shell.quaternion.copy(m.quaternion);
      shell.scale.copy(m.scale);
    }
  }

  const find = (name: string) => {
    const b = gltf.scene.getObjectByName(name);
    if (!b) throw new Error(`host model: no bone "${name}"`);
    return b;
  };
  const bones = Object.fromEntries(Object.entries(BONE).map(([k, n]) => [k, find(n)])) as HostRig["bones"];

  // Clips: ours by name; no root motion (he moves where we put him); and no
  // scale keys on the head (we enlarge it).
  const byName = new Map(gltf.animations.map((a) => [a.name, a]));
  const clips: HostRig["clips"] = { idle: byName.get("Idle_Neutral") ?? gltf.animations[0] };
  for (const [ours, names] of Object.entries(CLIP) as [ClipName, string[]][]) {
    const src = names.map((n) => byName.get(n)).find(Boolean);
    if (!src) continue;
    const clip = src.clone();
    clip.tracks = clip.tracks.filter((t) => !/^(Root|Body|Hips)\.position$/.test(t.name) && !/^Head\.scale$/.test(t.name));
    clip.name = ours;
    clips[ours] = clip as AnimationClip;
  }

  // A slightly larger head: the face has to read when he's ~300 pixels tall.
  bones.head.scale.setScalar(1.45);
  // His own small moves (fidgets, the nap), built on this skeleton.
  Object.assign(clips, buildGestures(gltf.scene, clips.idle));

  // Normalise: feet on y = 0, and measure him for the camera.
  root.updateMatrixWorld(true);
  const box = new Box3().setFromObject(root, true);
  gltf.scene.position.y -= box.min.y;
  const height = box.max.y - box.min.y;

  // His browline glasses: measured onto the head mesh in the bind pose, then
  // attached to the head bone (attach keeps the world placement, whatever
  // scale or rotation the bone carries).
  root.updateMatrixWorld(true);
  // The head mesh is a group of pieces (one per material), named like
  // "Suit_Head"; the bone is also called "Head", so skip bones.
  let headMesh: Object3D | undefined;
  gltf.scene.traverse((o) => {
    if (!headMesh && o.type !== "Bone" && /head/i.test(o.name)) headMesh = o;
  });
  if (!headMesh) throw new Error("host model: no head mesh");
  const headBox = new Box3().setFromObject(headMesh, true);
  const glasses = buildGlasses(bones.head, headBox);
  const face = buildFace(bones.head, headBox);

  return {
    object: root,
    bones,
    clips,
    height,
    eyes: face.eyes,
    blink: face.blink,
    outline(color: string, width = 0.0075) {
      inks.forEach((m) => m.color.set(color));
      inkWidth.value = width;
    },
    dispose() {
      root.traverse((o) => {
        if (o instanceof Mesh || o instanceof SkinnedMesh) o.geometry.dispose();
      });
      made.forEach((m) => m.dispose());
      glasses.dispose();
      face.dispose();
      inks.forEach((m) => m.dispose());
      ramp.dispose();
    },
  };
}

/** Where the face is: eye level is 54.5% up the head's box (measured on
 *  these models; the box includes the hair), centred, at the front. Parts are
 *  drawn in the hand-built host's units (lens centres ±2.2 apart) and scaled. */
function faceFrame(box: Box3) {
  const size = box.getSize(new Vector3());
  return {
    s: (size.x * 0.86) / 8.3,
    at: new Vector3((box.min.x + box.max.x) / 2, box.min.y + size.y * 0.545, box.max.z + size.z * 0.01),
  };
}

/** His face, the friendly one: eyes with a shine (they follow the cursor and
 *  blink), a dark upper-lid line, arched brows, a wide smile. */
function buildFace(head: Object3D, box: Box3) {
  const { s, at } = faceFrame(box);
  const geos: SphereGeometry[] = [];
  const mats: Material[] = [];
  const toon = (c: string) => {
    const m = new MeshToonMaterial({ color: new Color(c) });
    mats.push(m);
    return m;
  };
  const flat = (c: string) => {
    const m = new MeshBasicMaterial({ color: c });
    mats.push(m);
    return m;
  };
  const ell = (sx: number, sy: number, sz: number) => {
    const geo = new SphereGeometry(1, 16, 12).scale(sx, sy, sz);
    geos.push(geo);
    return geo;
  };
  const white = toon("#fbf7f2");
  const iris = toon("#3a2418");
  const ink = toon("#1d1716");
  const shine = flat("#ffffff");
  const face = new Group();
  const irises: Group[] = [];
  const eyes: Group[] = [];
  for (const side of [-1, 1]) {
    const eye = new Group();
    eye.position.set(side * 2.2, -0.05, -0.55);
    eye.add(new Mesh(ell(1.05, 0.52, 0.38), white));
    const lid = new Mesh(ell(1.12, 0.12, 0.24), ink);
    lid.position.set(0, 0.44, 0.12);
    lid.rotation.z = side * -0.06;
    eye.add(lid);
    const ir = new Group();
    const disc = new Mesh(ell(0.46, 0.42, 0.22), iris);
    disc.position.set(0, -0.02, 0.27);
    const dot = new Mesh(ell(0.12, 0.12, 0.08), shine);
    dot.position.set(0.15, 0.1, 0.45);
    ir.add(disc, dot);
    eye.add(ir);
    irises.push(ir);
    eyes.push(eye);
    face.add(eye);
    // A friendly arch, a touch above the frames.
    const brow = new Mesh(ell(1.45, 0.36, 0.34), ink);
    brow.position.set(side * 2.25, 2.25, -0.25);
    brow.rotation.z = side * -0.12;
    face.add(brow);
  }
  const smileShape = new Shape();
  smileShape.moveTo(-1, 0);
  smileShape.quadraticCurveTo(0, 0.2, 1, 0);
  smileShape.quadraticCurveTo(0, -1.15, -1, 0);
  const teethShape = new Shape();
  teethShape.moveTo(-0.84, 0.02);
  teethShape.quadraticCurveTo(0, 0.2, 0.84, 0.02);
  teethShape.quadraticCurveTo(0, -0.32, -0.84, 0.02);
  const mouthGeo = new ShapeGeometry(smileShape, 12);
  const teethGeo = new ShapeGeometry(teethShape, 12);
  const mouth = new Mesh(mouthGeo, flat("#3b1d18"));
  mouth.position.set(0, -3.35, -0.8);
  const teeth = new Mesh(teethGeo, flat("#f6f0ea"));
  teeth.position.set(0, -3.35, -0.76);
  const lip = new Mesh(ell(0.62, 0.13, 0.18), toon("#a86f4d"));
  lip.position.set(0, -4.68, -0.95);
  mouth.scale.set(1.3, 0.9, 1);
  teeth.scale.set(1.3, 0.9, 1);
  face.add(mouth, teeth, lip);
  face.scale.setScalar(s);
  face.position.copy(at);
  head.attach(face);
  return {
    eyes(dx: number) {
      irises.forEach((i) => (i.position.x = Math.max(-0.36, Math.min(0.36, dx * 0.42))));
    },
    blink(closed: boolean) {
      eyes.forEach((e) => (e.scale.y = closed ? 0.12 : 1));
    },
    dispose() {
      geos.forEach((x) => x.dispose());
      mouthGeo.dispose();
      teethGeo.dispose();
      mats.forEach((m) => m.dispose());
    },
  };
}

/** Browline frames (a thick dark top bar over a slim rim) with teal arms. */
function buildGlasses(head: Object3D, box: Box3) {
  const { s, at } = faceFrame(box);
  const frame = new MeshToonMaterial({ color: new Color("#353a42") });
  const arm = new MeshToonMaterial({ color: new Color("#3f7d8c") });
  const glint = new MeshBasicMaterial({ color: "#ffffff" });
  const geos: CylinderGeometry[] = [];
  const g = new Group();
  const bar = (w: number, r: number) => {
    const geo = new CylinderGeometry(r, r, w, 8).rotateZ(Math.PI / 2);
    geos.push(geo);
    return geo;
  };
  const post = (h: number, r: number) => {
    const geo = new CylinderGeometry(r, r, h, 6);
    geos.push(geo);
    return geo;
  };
  for (const side of [-1, 1]) {
    const x = side * 2.2;
    const top = new Mesh(bar(3.9, 0.34), frame);
    top.position.set(x, 1.15, 0);
    const bottom = new Mesh(bar(3.5, 0.15), frame);
    bottom.position.set(x, -1.15, 0);
    const outer = new Mesh(post(2.3, 0.15), frame);
    outer.position.set(x + side * 1.85, 0, 0);
    const inner = new Mesh(post(2.3, 0.15), frame);
    inner.position.set(x - side * 1.85, 0, 0);
    const temple = new Mesh(post(5.4, 0.18), arm);
    temple.rotation.x = Math.PI / 2;
    temple.position.set(side * 4.1, 1.0, -2.7);
    const shine = new Mesh(bar(1.2, 0.07), glint);
    shine.position.set(x - 0.6, 0.55, 0.1);
    shine.rotation.z = 0.4;
    g.add(top, bottom, outer, inner, temple, shine);
  }
  const bridge = new Mesh(bar(0.9, 0.18), frame);
  bridge.position.set(0, 0.6, 0);
  g.add(bridge);
  g.scale.setScalar(s);
  g.position.copy(at);
  head.attach(g);
  return {
    group: g,
    dispose() {
      geos.forEach((x) => x.dispose());
      frame.dispose();
      arm.dispose();
      glint.dispose();
    },
  };
}
