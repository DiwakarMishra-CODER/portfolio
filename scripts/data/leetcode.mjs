// Diwakar's real LeetCode contest history, for the hero's LeetCode module
// sparkline. Writes src/data/leetcode.json. Run manually:
//
//   node scripts/data/leetcode.mjs
//
// The module's headline stays "1800+" (it must match the résumé); the
// sparkline is the real rating after each contest he took part in.
import fs from "node:fs";

const USER = "DiwakarCracksIt";
const query = `query($u: String!) {
  userContestRanking(username: $u) { rating attendedContestsCount }
  userContestRankingHistory(username: $u) { attended rating contest { startTime } }
  matchedUser(username: $u) { submitStatsGlobal { acSubmissionNum { difficulty count } } }
}`;
const res = await fetch("https://leetcode.com/graphql", {
  method: "POST",
  headers: { "content-type": "application/json", referer: "https://leetcode.com" },
  body: JSON.stringify({ query, variables: { u: USER } }),
  signal: AbortSignal.timeout(30_000),
});
const { data } = await res.json();
if (!data?.userContestRanking) throw new Error("no contest data");
const history = data.userContestRankingHistory
  .filter((h) => h.attended)
  .map((h) => [h.contest.startTime, Math.round(h.rating)]);
const solved = Object.fromEntries(data.matchedUser.submitStatsGlobal.acSubmissionNum.map((x) => [x.difficulty, x.count]));
const out = {
  user: USER,
  fetchedAt: new Date().toISOString().slice(0, 10),
  rating: Math.round(data.userContestRanking.rating),
  contests: data.userContestRanking.attendedContestsCount,
  solved,
  history,
};
fs.writeFileSync("src/data/leetcode.json", JSON.stringify(out) + "\n");
console.log({ ...out, history: `${history.length} points, ${history[0]?.[1]} → ${history.at(-1)?.[1]}` });
