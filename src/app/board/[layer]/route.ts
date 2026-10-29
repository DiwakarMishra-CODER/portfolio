import { benchLayer, benchPhoneLayer, boardLayer, cableLayer, partsLayer, screwLayer, silkLayer } from "@/components/hero/board/layers";
import { drc } from "@/components/hero/board/geom";
import { LANDSCAPE, type PartGroup, type Spec } from "@/components/hero/board/spec";
import { PORTRAIT } from "@/components/hero/board/spec-phone";

// The board's static layers, rendered once at build time and served as
// images (they never change at runtime, so they stay out of the React tree).
export const dynamic = "force-static";

const REV = process.env.NEXT_PUBLIC_REV || "local";
// Every layer twice: the landscape board (desktop) and, with a "-p" suffix,
// the portrait one (phones).
const layersFor = (S: Spec, sfx: string): Record<string, () => string> => ({
  [`board${sfx}.svg`]: () => boardLayer(REV, "green", S),
  [`board-black${sfx}.svg`]: () => boardLayer(REV, "black", S),
  [`silk${sfx}.svg`]: () => silkLayer(REV, S),
  ...Object.fromEntries((Object.keys(S.PART_GROUPS) as PartGroup[]).map((g) => [`parts-${g}${sfx}.svg`, () => partsLayer(g, S)])),
});
const LAYERS: Record<string, () => string> = { ...layersFor(LANDSCAPE, ""), ...layersFor(PORTRAIT, "-p"), "screw.svg": screwLayer, "bench.svg": () => benchLayer(LANDSCAPE), "bench-p.svg": benchPhoneLayer, "cable.svg": () => cableLayer(LANDSCAPE), "cable-p.svg": () => cableLayer(PORTRAIT) };
const SPECS: Record<string, Spec> = { "board.svg": LANDSCAPE, "board-p.svg": PORTRAIT };

export function generateStaticParams() {
  return Object.keys(LAYERS).map((layer) => ({ layer }));
}

export async function GET(_req: Request, { params }: { params: Promise<{ layer: string }> }) {
  const { layer } = await params;
  const render = LAYERS[layer];
  if (!render) return new Response("Not found", { status: 404 });
  // Design-rule check in development: a trace crossing a part or crowding
  // another net fails loudly instead of shipping.
  const spec = SPECS[layer];
  if (process.env.NODE_ENV !== "production" && spec) {
    const errors = drc(spec.TRACES, spec.KEEPOUTS);
    if (errors.length) throw new Error(`Board DRC failed:\n${errors.slice(0, 20).join("\n")}`);
  }
  return new Response(render(), {
    headers: { "content-type": "image/svg+xml", "cache-control": "public, max-age=31536000, immutable" },
  });
}
