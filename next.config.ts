import type { NextConfig } from "next";
import { execSync } from "node:child_process";

// The title block's "Revision": the commit this build came from. Vercel
// provides it; locally, ask git; failing both, the block just says "local".
const commit = (() => {
  if (process.env.VERCEL_GIT_COMMIT_SHA) return process.env.VERCEL_GIT_COMMIT_SHA;
  try {
    return execSync("git rev-parse HEAD", { stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
  } catch {
    return "";
  }
})();

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_REV: commit.slice(0, 7),
    NEXT_PUBLIC_BUILT: new Date().toISOString().slice(0, 10),
  },
};

export default nextConfig;
