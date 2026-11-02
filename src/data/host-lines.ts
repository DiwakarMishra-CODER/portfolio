// Everything the host says. Story lines are printed in the page as real text
// (readable with JS off, and by crawlers); quips and hints come later and only
// float beside him. Same copy rules as the rest of the site: every line stands
// alone for a stranger, sentences under ~12 words, no niche names.

export type Spot = "hero" | "starweave" | "lightsdown" | "arthouse" | "about" | "contact";

export const STORY: Record<Spot, string[]> = {
  hero: ["Hi. I'm Diwakar. I'll show you around."],
  starweave: [
    "Music apps show bands that sound alike. I wanted the ones that influenced them.",
    "So I built Starweave.",
  ],
  // At the projector, as the lights go down before Arthouse Atlas.
  lightsdown: ["Lights down. Next, my film project."],
  // TO CONFIRM with Diwakar: drafted from his own About page on Arthouse Atlas.
  arthouse: ["Too many films, and no idea where to start.", "So I built Arthouse Atlas."],
  about: ["That's the real me, minus the pixels."],
  contact: ["That's the tour. Email is the fastest way to reach me."],
};

// Said in the host's own bubble when you play with him, then the story line
// comes back. Short, so they fit where the story line was.
export const QUIP = {
  first: "Hey.",
  /** After the first poke, shuffled; never the same one twice in a row. */
  bag: [
    { move: "wave", line: "Hi again." },
    { move: "glasses", line: "Careful. Only pair I have." },
    { move: "point", line: "My work is right over there." },
    { move: "spin", line: "Okay. Done." },
  ],
  count: { 5: "Five pokes. I'm counting.", 10: "Ten. Very thorough. I like that in a reviewer." } as Record<number, string>,
  hintPoke: "You can poke me.",
  hintLift: "You can also pick me up.",
  lifted: "Whoa. Gently.",
  land: ["Ow. Worth it.", "I'll walk back."],
  landHard: "That was a bit much.",
  /** Off the side of the screen, mid-flight. */
  bump: "Ow.",
  /** Thrown three times in quick succession. */
  dizzy: "Okay. The room is spinning.",
  /** Poked awake after dozing off (two minutes left alone). */
  wake: "I wasn't sleeping.",
  /** Nightfall: the stars come out below the hero, and he's about to fly. */
  night: "Stars are coming out. Follow me.",
  /** The bottom of the page: he waves you off (once a visit). */
  bye: "That's everything. Thanks for coming by.",
  /** ...and you're still there a while later. */
  still: "Still here? The email's right there.",
  /** Back on the tab after a while away. */
  back: "Oh. You're back.",
  /** Once per visit, as you arrive: a returning visitor first, else the time of day. */
  greet: {
    back: "Welcome back.",
    thrown: "You threw me last time. I remember.",
    third: "Third time. Should I put the kettle on?",
    regular: "You again. Good.",
    late: "Up late? Same.",
    morning: "Morning.",
    weekend: "Working on a weekend? Respect.",
  },
} as const;

// Said in a room's lane as you reach a part of it (once per visit). Empty on
// purpose (2026-11-02): the page says what each part is and what to tap; a
// line that repeats it teaches people to ignore him. He answers what you DO
// (REACT, GUIDE). Add a cue only for something the page can't say.
export const CUE: Record<string, { line: string; move: "point" | "nod" | "glasses" | "look" }> = {};

export const REACT = {
  /** By the proof's tier: own words, reported, a critic's comparison. */
  proof: ["That's in their own words.", "A magazine reported that one.", "That one's a critic's comparison."],
  song: "Good one.",
  route: "Pick any two. It finds the best-proven route.",
  walk: "New family. Same rules.",
  /** Arthouse: your next film found (he holds up the ticket). */
  double: "That's your next film. Picked from real people's tastes.",
  /** Contact: you copied the email. */
  copied: "Copied. Talk soon.",
} as const;

// The Starweave room's guided first run: two taps, then it's yours. The tree
// prints what to tap; he says what it means.
export const GUIDE = {
  /** The first tap opened the proof (in a lane he's holding it up): who
   *  shaped whom, then the next tap. */
  proof: (b: string, a: string, held: boolean) => `${b} shaped ${a}. ${held ? "Here's the proof." : "That's the proof."}`,
  /** The second tap walked the tree: the band you started on is now below. */
  walk: (a: string) => `Look: ${a} is down here now.`,
  yours: "Your turn.",
};
