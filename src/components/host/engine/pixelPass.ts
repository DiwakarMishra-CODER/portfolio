// The host's look: the scene is drawn small (about 150 pixels tall) into a
// float target, then one full-screen pass turns it into pixel art: tone
// mapped, converted to sRGB, quantised through a 4x4 Bayer dither, with a
// crisp alpha edge, a one-pixel ink outline, and a dithered contact shadow at
// his feet. The canvas is that size and the browser upscales it by a whole
// number with image-rendering: pixelated. No postprocessing library.
import {
  BufferGeometry,
  Float32BufferAttribute,
  HalfFloatType,
  Mesh,
  NearestFilter,
  OrthographicCamera,
  Scene,
  ShaderMaterial,
  Vector2,
  Vector3,
  WebGLRenderTarget,
} from "three";

const vertexShader = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = position.xy * 0.5 + 0.5;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}`;

const fragmentShader = /* glsl */ `
precision highp float;
uniform sampler2D tScene;
uniform vec2 resolution;
uniform vec3 ink;
uniform vec2 shadowCenter;
uniform vec2 shadowRadius;
uniform float shadowStrength;
uniform float levels;
uniform float exposure;
varying vec2 vUv;

const float BAYER[16] = float[16](0.0, 8.0, 2.0, 10.0, 12.0, 4.0, 14.0, 6.0, 3.0, 11.0, 1.0, 9.0, 15.0, 7.0, 13.0, 5.0);
float bayer(vec2 p) {
  int i = int(mod(p.x, 4.0)) + int(mod(p.y, 4.0)) * 4;
  return (BAYER[i] + 0.5) / 16.0;
}
vec3 aces(vec3 x) {
  return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0);
}
vec3 toSRGB(vec3 c) {
  return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c));
}

void main() {
  vec2 px = 1.0 / resolution;
  vec4 c = texture2D(tScene, vUv);
  float t = bayer(gl_FragCoord.xy);
  if (c.a < 0.5) {
    float n = max(
      max(texture2D(tScene, vUv + vec2(px.x, 0.0)).a, texture2D(tScene, vUv - vec2(px.x, 0.0)).a),
      max(texture2D(tScene, vUv + vec2(0.0, px.y)).a, texture2D(tScene, vUv - vec2(0.0, px.y)).a)
    );
    if (n >= 0.5) {
      gl_FragColor = vec4(ink, 1.0);
      return;
    }
    vec2 d = (gl_FragCoord.xy - shadowCenter) / shadowRadius;
    float s = 1.0 - dot(d, d);
    if (s > 0.0 && s * shadowStrength > t) {
      gl_FragColor = vec4(ink * 0.45, 0.45);
      return;
    }
    gl_FragColor = vec4(0.0);
    return;
  }
  vec3 col = toSRGB(aces(c.rgb * exposure));
  col = floor(col * levels + t) / levels;
  gl_FragColor = vec4(col, 1.0);
}`;

export function createPixelPass() {
  const target = new WebGLRenderTarget(1, 1, {
    type: HalfFloatType,
    minFilter: NearestFilter,
    magFilter: NearestFilter,
    depthBuffer: true,
  });
  const material = new ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
      tScene: { value: target.texture },
      resolution: { value: new Vector2(1, 1) },
      ink: { value: new Vector3(0.078, 0.078, 0.075) },
      shadowCenter: { value: new Vector2(0, 0) },
      shadowRadius: { value: new Vector2(20, 4) },
      shadowStrength: { value: 0.9 },
      levels: { value: 24 },
      exposure: { value: 1.05 },
    },
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
  });
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
  const quad = new Mesh(geometry, material);
  quad.frustumCulled = false;
  const scene = new Scene();
  scene.add(quad);
  const camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);

  return {
    target,
    scene,
    camera,
    uniforms: material.uniforms,
    setSize(w: number, h: number) {
      target.setSize(w, h);
      material.uniforms.resolution.value.set(w, h);
    },
    dispose() {
      target.dispose();
      material.dispose();
      geometry.dispose();
    },
  };
}
