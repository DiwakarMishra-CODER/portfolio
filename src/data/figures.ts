// The figures printed on the page, in one place. The Starweave ones are
// re-derived live from public/data/starweave.json by the Test bench, which
// shows a failing check if any of them drift from the data.
export const STARWEAVE = {
  artists: 296,
  links: 945,
  sourced: 945,
  firstPerson: 696,
  sites: 234,
  denials: 35,
} as const;

export const ARTHOUSE = {
  films: 1120,
  directors: 238,
  movements: 27,
  lists: 20,
  ratings: 32_000_204,
  people: 200_948,
  testPeople: 11_090,
  hitRate: 34.8,
  oldHitRate: 7.4,
  evaluatedOn: "22 Oct 2026",
} as const;

export const fmt = (n: number) => n.toLocaleString("en-US");
