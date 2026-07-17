/**
 * The hero's signature: BOLD "Vivid Sky" — a full-bleed, saturated
 * golden-hour sunset gradient with a soft sun glow for a light source and
 * depth. This is the loudest moment on the site (see CLAUDE.md's
 * design-ratio note) — Projects/About/Contact stay calmer. The gradient
 * itself is a static CSS background; only the sun glow drifts (slow,
 * low-amplitude, reusing .sky-glow-a from globals.css), and that drift is
 * disabled entirely under prefers-reduced-motion via CSS.
 */

// Tunable — dial saturation/direction live from here.
const GRADIENT_ANGLE_DEG = 180; // clean top-to-bottom sunset, not multi-directional

const GRADIENT_STOPS: { color: string; position: number }[] = [
  { color: "#6B8CAE", position: 0 }, // twilight
  { color: "#E8934A", position: 42 }, // amber
  { color: "#E4674F", position: 72 }, // coral
  { color: "#F4EEE4", position: 100 }, // fades to cream — a clean handoff into the (cream) section below
];

const SUN_GLOW_COLOR_RGB = "245, 197, 66"; // gold, #F5C542
const SUN_GLOW_TOP = "6%";
const SUN_GLOW_RIGHT = "10%";
const SUN_GLOW_SIZE = "62vh"; // diameter
const SUN_GLOW_CORE_OPACITY = 0.6;

export default function GoldenHourSky() {
  const gradient = `linear-gradient(${GRADIENT_ANGLE_DEG}deg, ${GRADIENT_STOPS.map(
    (stop) => `${stop.color} ${stop.position}%`
  ).join(", ")})`;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      <div className="absolute inset-0" style={{ background: gradient }} />

      {/* Sun glow — gives the gradient a light source and depth. Drifts almost imperceptibly. */}
      <div
        className="sky-glow-a absolute rounded-full blur-3xl"
        style={{
          top: SUN_GLOW_TOP,
          right: SUN_GLOW_RIGHT,
          width: SUN_GLOW_SIZE,
          height: SUN_GLOW_SIZE,
          background: `radial-gradient(circle, rgba(${SUN_GLOW_COLOR_RGB}, ${SUN_GLOW_CORE_OPACITY}) 0%, rgba(${SUN_GLOW_COLOR_RGB}, 0) 70%)`,
        }}
      />
    </div>
  );
}
