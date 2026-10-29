// Checks every link on the rendered home page and records the result in
// src/data/linkcheck.json, which the Test bench shows (as a recorded result,
// with its date — it is not re-run in the visitor's browser).
//
//   npm run dev   # in another terminal
//   node scripts/check-links.mjs [http://localhost:3000]
import fs from "node:fs";

const base = process.argv[2] ?? "http://localhost:3000";
const html = await (await fetch(base)).text();
// Only links a visitor can follow: <a href>, not <link> (canonical, icons, fonts).
const hrefs = [...new Set([...html.matchAll(/<a\b[^>]*?\shref="([^"#][^"]*)"/g)].map((m) => m[1].replaceAll("&amp;", "&")))]
  .filter((h) => !h.startsWith("mailto:"));

// LeetCode answers every script with a 403 (bot protection), so ask its own
// API whether the profile exists instead of trusting or skipping the page.
const leetcode = async (href) => {
  const user = href.match(/leetcode\.com\/u\/([^/]+)/)?.[1];
  const res = await fetch("https://leetcode.com/graphql", {
    method: "POST",
    headers: { "content-type": "application/json", referer: "https://leetcode.com" },
    body: JSON.stringify({ query: "query($u:String!){matchedUser(username:$u){username}}", variables: { u: user } }),
    signal: AbortSignal.timeout(20_000),
  });
  const body = await res.json().catch(() => null);
  const ok = Boolean(body?.data?.matchedUser?.username);
  return { href, status: ok ? "profile found (API)" : `no profile (${res.status})`, ok };
};

const check = async (href) => {
  if (/leetcode\.com\/u\//.test(href)) return leetcode(href);
  const url = new URL(href, base).toString();
  for (const method of ["HEAD", "GET"]) {
    try {
      const res = await fetch(url, {
        method,
        redirect: "follow",
        signal: AbortSignal.timeout(20_000),
        headers: { "user-agent": "Mozilla/5.0 (link check for diwakar-mishra portfolio)" },
      });
      // LinkedIn answers bots with 999; it's alive, just unwilling.
      if (res.ok || res.status === 999) return { href, status: res.status, ok: true };
      if (method === "GET") return { href, status: res.status, ok: false };
    } catch (e) {
      if (method === "GET") return { href, status: String(e.cause?.code ?? e.name), ok: false };
    }
  }
};

const results = await Promise.all(hrefs.map(check));
const failed = results.filter((r) => !r.ok);
const out = { checkedAt: new Date().toISOString().slice(0, 10), total: results.length, failed: failed.length, results };
fs.mkdirSync("src/data", { recursive: true });
fs.writeFileSync("src/data/linkcheck.json", JSON.stringify(out, null, 2) + "\n");
for (const r of results) console.log(`${r.ok ? "ok  " : "FAIL"} ${r.status}  ${r.href}`);
console.log(`\n${results.length} links, ${failed.length} failed → src/data/linkcheck.json`);
process.exit(failed.length ? 1 : 0);
