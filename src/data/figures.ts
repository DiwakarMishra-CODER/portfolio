// The figures printed on the page, in one place. The Starweave ones are
// re-derived live from public/data/starweave.json by the Test bench, which
// shows a failing check if any of them drift from the data.
export const STARWEAVE = {
  artists: 312,
  links: 1024,
  sourced: 1024,
  firstPerson: 771,
  reported: 225,
  sites: 242,
  denials: 36,
} as const;

export const ARTHOUSE = {
  films: 1120,
  directors: 238,
  movements: 27,
  lists: 20,
  ratings: 32_000_204,
  people: 200_948,
  testPeople: 11_090,
  /** Exact next film in its top 10 (strict). */
  hitRate: 34.8,
  oldHitRate: 7.4,
  popHitRate: 20.9,
  randomHitRate: 0.9,
  /** Any film they went on to love was in its top 10. */
  laterLove: 66.7,
  oldLaterLove: 25.4,
  popLaterLove: 51.1,
  /** Recall@20, the published protocol (Liang et al. 2018). */
  recall20: 62.4,
  popRecall20: 43.4,
  canonCitations: 4187,
  canonFamilies: 7,
  evaluatedOn: "22 Oct 2026",
} as const;

export const fmt = (n: number) => n.toLocaleString("en-US");
