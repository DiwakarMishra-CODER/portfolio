// The host's engine: the only module that imports three (dynamic-imported by
// HostLayer after the page is up). One renderer per host canvas, the rig from
// rig.ts, an AnimationMixer for its clips, then a look-at on top of whatever
// clip is playing (neck 40%, head 60%, limited and smoothed), blinks, and the
// pixel pass. It draws only while active (on screen, tab visible): 30 fps at
// rest, 60 while something fast is happening.
import {
  ACESFilmicToneMapping,
  AdditiveAnimationBlendMode,
  AnimationAction,
  CircleGeometry,
  Mesh,
  MeshBasicMaterial,
  AnimationMixer,
  Color,
  DirectionalLight,
  Euler,
  HemisphereLight,
  LoopOnce,
  LoopRepeat,
  PerspectiveCamera,
  PropertyBinding,
  Quaternion,
  QuaternionKeyframeTrack,
  VectorKeyframeTrack,
  Scene,
  Vector3,
  WebGLRenderer,
} from "three";
import { CLIP_FALLBACK, type ClipName, type HostRig } from "./rig";
import { createPixelPass } from "./pixelPass";
import { buildToonHost } from "./toon/model";
import { buildVoxelHost } from "./voxel/model";
import { loadGlbHost } from "./glb/loadGlb";
import { buildCape } from "./cape";
import { buildProjector, makeReel } from "./projector";

/** Ready-made characters (Quaternius, CC0), in public/host/. */
const GLB = { suit: "/host/suit.glb", casual: "/host/casual.glb" } as const;

export type EngineOptions = {
  /** Pixel rows the character is drawn into (the pixel size follows). */
  lowH?: number;
  /** Body turn about y, radians: negative faces the viewer's left. */
  facing?: number;
  /** Turntable spin (the lab). */
  spin?: boolean;
  /** Smooth, full-resolution toon render (default) instead of the pixel look. */
  hd?: boolean;
  /** Which host: a ready-made character (default "suit", loaded from
   *  public/host/, with his face and glasses added), or the hand-built toon
   *  or voxel stand-ins. */
  model?: "toon" | "voxel" | keyof typeof GLB;
  /** A soft shadow disc under him (HD). Off on the page, where the ground draws it. */
  shadow?: boolean;
  /** The toon host with or without his beard (the lab compares). */
  beard?: boolean;
  onFirstFrame?: () => void;
  onLost?: () => void;
};

export type Engine = Awaited<ReturnType<typeof createEngine>>;

// How far his face turns from you, at most: always three-quarter, never a profile.
const LOOK_YAW = 0.55;
const LOOK_PITCH = 0.42;

export async function createEngine(canvas: HTMLCanvasElement, opts: EngineOptions = {}) {
  const lowH = opts.lowH ?? 320;
  const facing = opts.facing ?? -0.42;

  const hd = opts.hd ?? true;
  const renderer = new WebGLRenderer({ canvas, antialias: hd, alpha: true, powerPreference: "low-power" });
  renderer.setPixelRatio(hd ? Math.min(window.devicePixelRatio || 1, 2) : 1);
  renderer.setClearColor(0x000000, 0);
  if (hd) {
    renderer.toneMapping = ACESFilmicToneMapping;
    canvas.style.imageRendering = "auto";
  }
  const pass = createPixelPass();

  const scene = new Scene();
  const key = new DirectionalLight(new Color("#fff5ea"), 3.0);
  key.position.set(-30, 40, 34);
  const rim = new DirectionalLight(new Color("#c8dcff"), 2.2);
  rim.position.set(36, 22, -30);
  scene.add(key, rim, new HemisphereLight(new Color("#e4ecff"), new Color("#7a6656"), 1.15));

  const model = opts.model ?? "suit";
  const hand = () => (model === "voxel" ? buildVoxelHost() : buildToonHost({ beard: opts.beard }));
  // A ready-made character, or the hand-built one if its file can't load.
  const rig: HostRig = model === "voxel" || model === "toon" ? hand() : await loadGlbHost(GLB[model], { outline: hd }).catch(hand);
  rig.object.rotation.y = facing;
  scene.add(rig.object);
  // The look-at turns the neck and head on top of the clip, for drawing only:
  // they're put back after each frame. (Resetting bones before the mixer
  // doesn't work: the mixer skips writing a value that hasn't changed since
  // its last frame, so a held pose would snap back to rest.)
  holdRest(rig);
  // His cape, folded away until he flies.
  const cape = buildCape(rig);
  // A film reel he can carry at his side (into the cinema), hung from his left
  // wrist in the rest pose so it swings with his arm; hidden until carried.
  const handReel = makeReel(rig.height, 0.11);
  const wrist = rig.object.getObjectByName("WristL");
  if (wrist) {
    const turned = rig.object.rotation.y;
    rig.object.rotation.y = 0;
    rig.object.updateMatrixWorld(true);
    const at = wrist.getWorldPosition(new Vector3());
    handReel.object.position.set(at.x + rig.height * 0.05, at.y - rig.height * 0.07, at.z + rig.height * 0.02);
    rig.object.add(handReel.object);
    rig.object.updateMatrixWorld(true);
    wrist.attach(handReel.object);
    rig.object.rotation.y = turned;
    rig.object.updateMatrixWorld(true);
  }
  handReel.object.visible = false;
  const looked = [rig.bones.neck, rig.bones.head].filter((b): b is NonNullable<typeof b> => !!b).map((b) => [b, b.quaternion.clone()] as const);

  let blob: Mesh | null = null;
  if (hd && opts.shadow !== false) {
    blob = new Mesh(new CircleGeometry(rig.height * 0.17, 32), new MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.16, depthWrite: false }));
    blob.rotation.x = -Math.PI / 2;
    blob.scale.y = 0.55;
    blob.position.y = rig.height * 0.002;
    scene.add(blob);
  }
  const camera = new PerspectiveCamera(20, 1, rig.height * 0.05, rig.height * 200);
  const focus = new Vector3();
  // A prop beside him (the projector, in the cinema): the camera shifts to frame both.
  let prop: ReturnType<typeof buildProjector> | null = null;
  let propShift = 0;

  // Clips: idle loops; anything else plays once and fades back to idle.
  const mixer = new AnimationMixer(rig.object);
  const actions = new Map<ClipName, AnimationAction>();
  const action = (name: ClipName): AnimationAction | null => {
    const clip = rig.clips[name] ?? (CLIP_FALLBACK[name] ? rig.clips[CLIP_FALLBACK[name]!] : undefined);
    if (!clip) return null;
    if (!actions.has(name)) actions.set(name, mixer.clipAction(clip));
    return actions.get(name)!;
  };
  let current = action("idle")!;
  current.play();
  // Only the clip still playing hands back to idle: one that was faded out
  // (a landing cut short by the walk home) must not stop the walk when it ends.
  mixer.addEventListener("finished", (e) => e.action === current && play("idle"));

  const additive = (a: AnimationAction) => a.getClip().blendMode === AdditiveAnimationBlendMode;
  function play(name: ClipName, { loop = false, fade = 0.2 } = {}) {
    const next = action(name);
    if (!next) return;
    // A small move (fidget, nap) plays on top of whatever he's doing.
    if (additive(next)) {
      // Already holding this pose: leave it (a reset would drop and re-raise it).
      if (!loop && isOn(name) && next.time >= next.getClip().duration - 1e-3) return;
      next.reset();
      next.setLoop(loop ? LoopRepeat : LoopOnce, Infinity);
      next.clampWhenFinished = !loop;
      next.fadeIn(fade).play();
      return;
    }
    if (next === current) return;
    // A whole-body move ends any small one.
    stopSmall(fade);
    next.reset();
    next.setLoop(name === "idle" || loop ? LoopRepeat : LoopOnce, Infinity);
    next.clampWhenFinished = name !== "idle" && !loop;
    next.play();
    current.crossFadeTo(next, fade, false);
    current = next;
  }
  function isOn(name: ClipName) {
    const a = actions.get(name);
    return !!a && a.enabled && a.getEffectiveWeight() > 0.5;
  }
  function stopSmall(fade = 0.25) {
    actions.forEach((a) => additive(a) && a.enabled && a.getEffectiveWeight() > 0 && a.fadeOut(fade));
  }

  // ── Size: a whole-number upscale of a small canvas ─────────────────────
  let lw = 1;
  let lh = 1;
  let scale = 1;
  function fit() {
    const box = canvas.parentElement!;
    const dpr = window.devicePixelRatio || 1;
    const cw = box.clientWidth;
    const ch = box.clientHeight;
    if (hd) {
      // Full resolution: the renderer handles the device pixel ratio.
      lw = cw;
      lh = ch;
      scale = 1;
      renderer.setSize(cw, ch);
    } else {
      scale = Math.max(2, Math.floor((ch * dpr) / lowH));
      lw = Math.max(1, Math.floor((cw * dpr) / scale));
      lh = Math.max(1, Math.floor((ch * dpr) / scale));
      renderer.setSize(lw, lh, false);
      canvas.style.width = `${(lw * scale) / dpr}px`;
      canvas.style.height = `${(lh * scale) / dpr}px`;
      pass.setSize(lw, lh);
    }
    camera.aspect = lw / lh;
    // Frame the whole character with a little air above the quiff.
    const h = rig.height;
    const fov = (camera.fov * Math.PI) / 180;
    const dist = ((h * 0.5 * 1.18) / Math.tan(fov / 2)) * Math.max(1, (0.62 * lh) / lw);
    focus.set(propShift, h * 0.47, 0);
    camera.position.set(propShift, focus.y + dist * 0.14, dist);
    camera.lookAt(focus);
    camera.updateProjectionMatrix();
    // The contact shadow, under his feet, in canvas pixels.
    const feet = new Vector3(0, 0, 0).project(camera);
    pass.uniforms.shadowCenter.value.set(((feet.x + 1) / 2) * lw, ((feet.y + 1) / 2) * lh);
    pass.uniforms.shadowRadius.value.set(lh * 0.2, Math.max(2.5, lh * 0.028));
  }
  const ro = new ResizeObserver(fit);
  ro.observe(canvas.parentElement!);
  fit();

  // ── Where he looks: at the pointer, or ahead when it's been still ──────
  let pointer: { x: number; y: number; t: number } | null = null;
  const onPointer = (e: PointerEvent) => (pointer = { x: e.clientX, y: e.clientY, t: performance.now() });
  window.addEventListener("pointermove", onPointer, { passive: true });
  window.addEventListener("pointerdown", onPointer, { passive: true });

  // A point on screen he looks at instead of the pointer (the stars coming out).
  let gazePoint: { x: number; y: number } | null = null;
  const look = { yaw: 0, pitch: 0, eye: 0 };
  const headWorld = new Vector3();
  const qLook = new Quaternion();
  const eLook = new Euler();
  function aim(dt: number) {
    let yaw = -facing * 0.6;
    let pitch = 0;
    let eye = 0;
    const target = gazePoint ?? (pointer && performance.now() - pointer.t < 3000 ? pointer : null);
    if (target) {
      rig.bones.head.getWorldPosition(headWorld);
      headWorld.y += rig.height * 0.14;
      headWorld.project(camera);
      const r = canvas.getBoundingClientRect();
      const hx = r.left + ((headWorld.x + 1) / 2) * r.width;
      const hy = r.top + ((1 - headWorld.y) / 2) * r.height;
      const dx = Math.max(-1, Math.min(1, (target.x - hx) / (window.innerWidth * 0.45)));
      const dy = Math.max(-1, Math.min(1, (target.y - hy) / (window.innerHeight * 0.45)));
      yaw = Math.max(-LOOK_YAW, Math.min(LOOK_YAW, dx * 0.9)) - facing;
      pitch = dy * LOOK_PITCH;
      eye = dx;
    }
    const k = 1 - Math.exp(-dt * 10);
    look.yaw += (yaw - look.yaw) * k;
    look.pitch += (pitch - look.pitch) * k;
    look.eye += (eye - look.eye) * k;
    const apply = (bone: keyof HostRig["bones"], share: number) => {
      const b = rig.bones[bone];
      if (!b) return;
      qLook.setFromEuler(eLook.set(look.pitch * share, look.yaw * share, 0));
      b.quaternion.multiply(qLook);
    };
    apply("neck", 0.4);
    apply("head", 0.6);
    rig.eyes?.(look.eye);
  }

  // ── Blinks: every 2–6 s, 120 ms ───────────────────────────────────────
  let nextBlink = performance.now() + 2000;
  let blinkEnd = 0;
  function blink(now: number) {
    if (now > nextBlink) {
      blinkEnd = now + 120;
      nextBlink = now + 2000 + Math.random() * 4000;
    }
    rig.blink?.(now < blinkEnd);
  }

  // ── Body turn: his facing, a turn toward where he walks, a spin, a lean ──
  let heading = 0;
  let headingTarget = 0;
  let spinLeft = 0;
  let spinAngle = 0;
  let lean = 0;
  let leanTarget = 0;
  let spun = 0;
  function turn(dt: number) {
    const k = 1 - Math.exp(-dt * 9);
    heading += (headingTarget - heading) * k;
    lean += (leanTarget - lean) * k;
    if (spinLeft > 0) {
      const d = Math.min(spinLeft, dt * Math.PI * 4);
      spinAngle += d;
      spinLeft -= d;
      if (spinLeft <= 0) spinAngle = 0;
    }
    if (opts.spin) spun += dt * 0.6;
    rig.object.rotation.set(0, facing + heading + spinAngle + spun, lean);
  }

  // ── The loop ──────────────────────────────────────────────────────────
  let raf = 0;
  let last = 0;
  let acc = 0;
  let active = false;
  let fast = false;
  let first = true;
  function frame(now: number) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.1, last ? (now - last) / 1000 : 0);
    last = now;
    acc += dt;
    if (acc < (fast ? 1 / 60 : 1 / 30) - 0.002) return;
    const step = acc;
    acc = 0;
    turn(step);
    mixer.update(step);
    cape.update(step);
    for (const [b, q] of looked) q.copy(b.quaternion);
    aim(step);
    blink(now);
    draw();
    for (const [b, q] of looked) b.quaternion.copy(q);
    if (first) {
      first = false;
      opts.onFirstFrame?.();
    }
  }
  function draw() {
    if (hd) {
      renderer.setRenderTarget(null);
      renderer.clear();
      renderer.render(scene, camera);
      return;
    }
    renderer.setRenderTarget(pass.target);
    renderer.clear();
    renderer.render(scene, camera);
    renderer.setRenderTarget(null);
    renderer.clear();
    renderer.render(pass.scene, pass.camera);
  }
  function setActive(on: boolean) {
    const run = on && document.visibilityState === "visible";
    if (run === active) return;
    active = run;
    if (run) {
      last = 0;
      raf = requestAnimationFrame(frame);
    } else cancelAnimationFrame(raf);
  }
  let wanted = true;
  const onVisibility = () => setActive(wanted);
  document.addEventListener("visibilitychange", onVisibility);
  const onLost = (e: Event) => {
    e.preventDefault();
    setActive(false);
    opts.onLost?.();
  };
  canvas.addEventListener("webglcontextlost", onLost);
  setActive(true);

  return {
    play,
    /** End the small moves (a nap, a fidget), easing out. */
    stopSmall,
    /** Is this move on him right now (playing, or held at its end)? */
    isOn,
    /** The lab: hold a move at time t, to judge it. */
    pose(name: ClipName, t: number) {
      const a = action(name);
      if (!a) return;
      play(name);
      a.time = t;
      a.paused = true;
    },
    /** A full turn on the spot. */
    spin() {
      if (spinLeft <= 0) spinLeft = Math.PI * 2;
    },
    /** Turn the body: -1 toward the viewer's left, 1 right, 0 his usual facing. */
    face(dir: -1 | 0 | 1) {
      headingTarget = dir === 0 ? 0 : dir * 1.1 - facing;
    },
    /** Lean while carried (radians about the view axis). */
    lean(r: number) {
      leanTarget = Math.max(-0.5, Math.min(0.5, r));
    },
    /** He moved to another spot: size to the new one. */
    refit() {
      ro.disconnect();
      ro.observe(canvas.parentElement!);
      fit();
    },
    /** Draw while on screen; stop entirely when not. */
    setActive(on: boolean) {
      wanted = on;
      setActive(on);
    },
    setFast(on: boolean) {
      fast = on;
    },
    /** The projector at his right (the cinema), or none. The camera reframes to fit it. */
    projector(on: boolean) {
      if (on === !!prop) return;
      if (on) {
        prop = buildProjector(rig.height);
        prop.object.position.set(-rig.height * 0.44, 0, rig.height * 0.06);
        prop.object.rotation.y = 0.18;
        scene.add(prop.object);
        propShift = -rig.height * 0.2;
      } else if (prop) {
        scene.remove(prop.object);
        prop.dispose();
        prop = null;
        propShift = 0;
      }
      fit();
    },
    /** Carry the film reel at his side. */
    carry(on: boolean) {
      handReel.object.visible = on && !!wrist;
    },
    /** The projector's front reel (the film he brought) is mounted. */
    loadReel(on: boolean) {
      prop?.loaded(on);
    },
    /** Show or hide him (the lab renders the projector on its own). */
    figure(on: boolean) {
      rig.object.visible = on;
      if (blob) blob.visible = on;
    },
    /** Turn its reels and crank (radians), and light its lamp. */
    reel(a: number, lamp: boolean) {
      prop?.turn(a);
      prop?.lamp(lamp);
    },
    /** Where its lens is, in page pixels (for the beam), or null. */
    lens() {
      if (!prop) return null;
      const p = prop.lens().project(camera);
      const r = canvas.getBoundingClientRect();
      return { x: r.left + ((p.x + 1) / 2) * r.width, y: r.top + ((1 - p.y) / 2) * r.height };
    },
    /** Unfurl his cape (he's flying) or fold it away. */
    cape(on: boolean) {
      cape.set(on);
    },
    /** Look at this point on screen instead of the pointer; null to follow the pointer again. */
    gaze(point: { x: number; y: number } | null) {
      gazePoint = point;
    },
    /** His outline: ink by default; pale and a touch heavier in a dark room. */
    outline(color: string, width?: number) {
      rig.outline?.(color, width);
    },
    /** One frame at native size, as a data URL (the poster). */
    snapshot(type = "image/png", quality?: number) {
      mixer.update(0);
      draw();
      return canvas.toDataURL(type, quality);
    },
    get pixelScale() {
      return scale;
    },
    dispose() {
      setActive(false);
      ro.disconnect();
      window.removeEventListener("pointermove", onPointer);
      window.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("visibilitychange", onVisibility);
      canvas.removeEventListener("webglcontextlost", onLost);
      mixer.stopAllAction();
      rig.dispose();
      cape.dispose();
      prop?.dispose();
      handReel.dispose();
      pass.dispose();
      renderer.dispose();
    },
  };
}

/**
 * Idle often leaves bones alone that other clips move (his legs, in a wave
 * or a landing). Once such a clip ends nothing writes those bones again, so
 * they'd stay where it left them. Give idle a still track for each, holding
 * the bone's rest value, so idle always brings every bone home.
 */
function holdRest(rig: HostRig) {
  const idle = rig.clips.idle;
  const have = new Set(idle.tracks.map((t) => t.name));
  for (const clip of Object.values(rig.clips)) {
    if (!clip || clip === idle || clip.blendMode === AdditiveAnimationBlendMode) continue;
    for (const t of clip.tracks) {
      if (have.has(t.name)) continue;
      have.add(t.name);
      const { nodeName, propertyName } = PropertyBinding.parseTrackName(t.name);
      const node = rig.object.getObjectByName(nodeName ?? "");
      if (!node) continue;
      if (propertyName === "quaternion") idle.tracks.push(new QuaternionKeyframeTrack(t.name, [0], node.quaternion.toArray()));
      else if (propertyName === "position" || propertyName === "scale") idle.tracks.push(new VectorKeyframeTrack(t.name, [0], node[propertyName].toArray()));
    }
  }
}
