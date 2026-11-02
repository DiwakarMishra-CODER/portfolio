// His cape, for flying only (Nightfall): Starweave's night sky as cloth, deep
// violet with small stars in the dust colours and a gold hem. It hangs from
// his shoulders on the chest bone, wider at the hem so it shows either side
// of his legs from the front, and wraps a little round his back. It unfurls
// when he takes off and folds away when he lands (he's back in his suit).
// The ripple is in the vertex shader: a billow back while he's flying, a
// wave running down the cloth, a slow sway, all stronger towards the hem.
import { Box3, CanvasTexture, DoubleSide, Group, Mesh, MeshToonMaterial, PlaneGeometry, SRGBColorSpace, Vector3 } from "three";
import type { HostRig } from "./rig";

const STARS = ["#f0c97a", "#8fd0ff", "#f3efff", "#ff9fc4"];

function clothTexture() {
  const c = document.createElement("canvas");
  c.width = 128;
  c.height = 256;
  const g = c.getContext("2d")!;
  const sky = g.createLinearGradient(0, 0, 0, 256);
  sky.addColorStop(0, "#2b1f4c");
  sky.addColorStop(1, "#16112b");
  g.fillStyle = sky;
  g.fillRect(0, 0, 128, 256);
  // Stars, placed by a fixed little sequence so every visit gets the same cape.
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 46; i++) {
    g.fillStyle = STARS[i % STARS.length];
    g.globalAlpha = 0.55 + rnd() * 0.45;
    const r = 0.8 + rnd() * 1.6;
    g.beginPath();
    g.arc(8 + rnd() * 112, 10 + rnd() * 230, r, 0, Math.PI * 2);
    g.fill();
  }
  g.globalAlpha = 1;
  // The gold hem, down the sides and along the bottom.
  g.fillStyle = "#f0c97a";
  g.fillRect(0, 0, 4, 256);
  g.fillRect(124, 0, 4, 256);
  g.fillRect(0, 248, 128, 8);
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return t;
}

export function buildCape(rig: HostRig) {
  const H = rig.height;
  const L = H * 0.6; // shoulders to calves
  const topW = H * 0.26;
  const hemW = H * 0.56;

  // Measure him standing, unturned, then hang the cape on the chest bone.
  const turned = rig.object.rotation.y;
  rig.object.rotation.y = 0;
  rig.object.updateMatrixWorld(true);
  const chest = rig.bones.chest ?? rig.bones.head;
  const neck = (rig.bones.neck ?? rig.bones.head).getWorldPosition(new Vector3());
  const body = new Box3().setFromObject(chest, true);
  const back = Math.min(body.min.z, chest.getWorldPosition(new Vector3()).z - H * 0.06);

  // A sheet shaped like a cape: narrow at the shoulders, flared at the hem,
  // its edges wrapping a little forward round his back.
  const geo = new PlaneGeometry(1, 1, 10, 18);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const u = pos.getX(i) + 0.5;
    const v = 0.5 - pos.getY(i);
    const w = topW + (hemW - topW) * Math.pow(v, 0.8);
    const edge = (u - 0.5) * 2;
    pos.setXYZ(i, edge * w * 0.5, -v * L, edge * edge * H * 0.07 * (1 - v * 0.6));
  }
  geo.computeVertexNormals();

  const uniforms = { uTime: { value: 0 }, uFly: { value: 0 }, uLen: { value: L } };
  const map = clothTexture();
  const mat = new MeshToonMaterial({ map, side: DoubleSide });
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader =
      "uniform float uTime;\nuniform float uFly;\nuniform float uLen;\n" +
      shader.vertexShader.replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
        float v = clamp(-position.y / uLen, 0.0, 1.0);
        transformed.z -= uFly * 0.42 * uLen * v * v;
        transformed.z -= sin(uTime * 7.0 - v * 6.0 + position.x * 9.0 / uLen) * (0.025 + 0.06 * uFly) * uLen * v;
        transformed.x += sin(uTime * 2.1 - v * 2.4) * 0.05 * uLen * v * (0.4 + uFly);`,
      );
  };
  const mesh = new Mesh(geo, mat);
  mesh.frustumCulled = false;
  const group = new Group();
  group.add(mesh);
  group.position.set(0, neck.y - H * 0.035, back);
  rig.object.add(group);
  rig.object.updateMatrixWorld(true);
  chest.attach(group);
  rig.object.rotation.y = turned;
  rig.object.updateMatrixWorld(true);

  // Unfurling: 0 folded away (hidden), 1 out.
  let shown = 0;
  let want = 0;
  group.visible = false;
  return {
    set(on: boolean) {
      want = on ? 1 : 0;
    },
    update(dt: number) {
      uniforms.uTime.value += dt;
      shown += (want - shown) * (1 - Math.exp(-dt * (want ? 7 : 10)));
      if (Math.abs(want - shown) < 0.002) shown = want;
      uniforms.uFly.value = shown;
      group.visible = shown > 0.01;
      group.scale.set(0.6 + 0.4 * shown, shown, 1);
    },
    dispose() {
      geo.dispose();
      mat.dispose();
      map.dispose();
    },
  };
}
