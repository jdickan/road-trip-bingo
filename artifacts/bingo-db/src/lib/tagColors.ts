export type TagType =
  | "findability"
  | "age"
  | "season"
  | "region"
  | "surroundings"
  | "board"
  | "dayNight";

export interface TagColor {
  h: number;
  s: string;
}

/**
 * Single flat palette — 24 entries spanning the full hue wheel.
 * Each of the 24 known non-placeholder tag values maps to exactly one
 * unique index (see KNOWN_IDX below). Dynamic board names use
 * hashString(name) % 24 for a stable per-name assignment.
 *
 *  0  coral-red       18  slate-blue
 *  1  orange-red      19  indigo
 *  2  warm-orange     20  blue-violet
 *  3  amber-orange    21  purple
 *  4  amber-yellow    22  violet
 *  5  golden-yellow   23  magenta-pink
 *  6  yellow-green
 *  7  lime-green
 *  8  green
 *  9  sage-green
 * 10  mint
 * 11  teal
 * 12  teal-cyan
 * 13  sky
 * 14  sky-blue
 * 15  blue-gray
 * 16  steel-blue       24  red-orange (spare)
 * 17  blue             25  chartreuse (spare)
 *                      26  sea-green (spare)
 *                      27  periwinkle (spare)
 *                      28  rose (spare)
 *                      29  amber-red (spare)
 */
const PALETTE: ReadonlyArray<TagColor> = [
  { h: 5,   s: "75%" },  //  0  coral-red
  { h: 18,  s: "80%" },  //  1  orange-red
  { h: 30,  s: "80%" },  //  2  warm-orange
  { h: 40,  s: "80%" },  //  3  amber-orange
  { h: 48,  s: "85%" },  //  4  amber-yellow
  { h: 58,  s: "72%" },  //  5  golden-yellow
  { h: 70,  s: "68%" },  //  6  yellow-green
  { h: 88,  s: "65%" },  //  7  lime-green
  { h: 105, s: "60%" },  //  8  green
  { h: 128, s: "55%" },  //  9  sage-green
  { h: 150, s: "58%" },  // 10  mint
  { h: 170, s: "62%" },  // 11  teal
  { h: 182, s: "65%" },  // 12  teal-cyan
  { h: 195, s: "75%" },  // 13  sky
  { h: 210, s: "68%" },  // 14  sky-blue
  { h: 215, s: "52%" },  // 15  blue-gray
  { h: 218, s: "72%" },  // 16  steel-blue
  { h: 222, s: "76%" },  // 17  blue
  { h: 235, s: "65%" },  // 18  slate-blue
  { h: 245, s: "65%" },  // 19  indigo
  { h: 258, s: "70%" },  // 20  blue-violet
  { h: 272, s: "70%" },  // 21  purple
  { h: 286, s: "68%" },  // 22  violet
  { h: 318, s: "65%" },  // 23  magenta-pink
  // ── Spare slots for future known-value mappings ──────────────────────────
  { h: 12,  s: "78%" },  // 24  red-orange
  { h: 78,  s: "66%" },  // 25  chartreuse
  { h: 140, s: "57%" },  // 26  sea-green
  { h: 230, s: "70%" },  // 27  periwinkle
  { h: 340, s: "68%" },  // 28  rose
  { h: 25,  s: "82%" },  // 29  amber-red
];

/** Subdued swatch for "All" and "Unknown" placeholder values. */
const SUBDUED: TagColor = { h: 215, s: "14%" };

/**
 * Each known non-placeholder value maps to a unique palette index (0-23).
 * All 24 slots are used exactly once across all categories — verified by
 * the dev-time assertion below.
 *
 * dayNight  (3): Day only→13  Night only→19  Day+Night→21
 * age       (3): Young→22     Kid→16         Tween→10
 * findability(3):High→1       Medium→3       Low→5
 * season    (4): Spring→7     Summer→4       Fall→0      Winter→14
 * region    (6): NE→17  SE→2  N Cent→18  S Cent→6  NW+AK→11  SW+HI→23
 * surroundings(5): Rural→9  Suburban→8  Urban→20  Highway→15  Coast→12
 */
const KNOWN_IDX: Partial<Record<TagType, Record<string, number>>> = {
  dayNight: {
    "Day only":    13,  // sky
    "Night only":  19,  // indigo
    "Day + Night": 21,  // purple
  },
  age: {
    "Young": 22,  // violet
    "Kid":   16,  // steel-blue
    "Tween": 10,  // mint
  },
  findability: {
    "High":   1,  // orange-red
    "Medium": 3,  // amber-orange
    "Low":    5,  // golden-yellow
  },
  season: {
    "Spring": 7,   // lime-green
    "Summer": 4,   // amber-yellow
    "Fall":   0,   // coral-red
    "Winter": 14,  // sky-blue
  },
  region: {
    "NE":      17,  // blue
    "SE":      2,   // warm-orange
    "N Cent":  18,  // slate-blue
    "S Cent":  6,   // yellow-green
    "NW + AK": 11,  // teal
    "SW + HI": 23,  // magenta-pink
  },
  surroundings: {
    "Rural / Xurban":  9,   // sage-green
    "Suburban / Town": 8,   // green
    "Urban / City":    20,  // blue-violet
    "Highway":         15,  // blue-gray
    "Coast":           12,  // teal-cyan
  },
};

// Dev-time assertion: all 24 known indices must be unique and in range.
if (import.meta.env.DEV) {
  const allIndices = Object.values(KNOWN_IDX).flatMap(m => Object.values(m!));
  const unique = new Set(allIndices);
  if (unique.size !== allIndices.length) {
    console.error(
      `[tagColors] KNOWN_IDX has ${allIndices.length} entries with only ${unique.size} unique ` +
      `indices — duplicates: ` +
      allIndices.filter((v, i, a) => a.indexOf(v) !== i).join(", ")
    );
  }
  for (const idx of allIndices) {
    if (idx < 0 || idx >= PALETTE.length) {
      console.error(`[tagColors] Index ${idx} is out of bounds (palette has ${PALETTE.length} entries)`);
    }
  }
}

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) & 0xffffffff;
  }
  return Math.abs(hash);
}

/**
 * Returns hue + saturation for a given tag type + value.
 * - "All" / "Unknown" → SUBDUED (muted gray-blue)
 * - Known values      → unique fixed PALETTE index (one-to-one, stable)
 * - Everything else   → hash-based PALETTE index (stable per name)
 */
export function getTagColor(type: TagType, value: string): TagColor {
  if (isSubduedValue(value)) return SUBDUED;
  const idx = KNOWN_IDX[type]?.[value];
  if (idx !== undefined) return PALETTE[idx];
  return PALETTE[hashString(value) % PALETTE.length];
}

/**
 * Returns true for placeholder values that should render as subdued/muted
 * in both tag badges and Analysis bar fills.
 */
export function isSubduedValue(value: string): boolean {
  return value === "Unknown" || value === "All";
}
