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
 * All known tag values and dynamic board names reference this array
 * (known values by fixed index, boards by name hash mod length).
 * Adding new values: pick an unused or semantically fitting index.
 */
const PALETTE: ReadonlyArray<TagColor> = [
  { h: 5,   s: "75%" },  //  0  coral-red       (Fall, SE)
  { h: 18,  s: "80%" },  //  1  orange-red       (High findability)
  { h: 30,  s: "80%" },  //  2  warm-orange      (S Cent, Medium findability)
  { h: 40,  s: "80%" },  //  3  amber-orange     (SW+HI, Highway)
  { h: 48,  s: "85%" },  //  4  amber-yellow     (Summer)
  { h: 58,  s: "72%" },  //  5  golden-yellow    (Low findability)
  { h: 70,  s: "68%" },  //  6  yellow-green
  { h: 88,  s: "65%" },  //  7  lime-green       (Spring)
  { h: 105, s: "60%" },  //  8  green
  { h: 128, s: "55%" },  //  9  sage-green       (Rural/Xurban)
  { h: 150, s: "58%" },  // 10  mint             (Tween)
  { h: 170, s: "62%" },  // 11  teal             (Suburban/Town, NW+AK)
  { h: 182, s: "65%" },  // 12  teal-cyan
  { h: 195, s: "75%" },  // 13  sky              (Day only, Coast)
  { h: 210, s: "68%" },  // 14  sky-blue         (Winter)
  { h: 215, s: "52%" },  // 15  blue-gray        (Urban/City)
  { h: 218, s: "72%" },  // 16  steel-blue       (Kid)
  { h: 222, s: "76%" },  // 17  blue             (NE)
  { h: 235, s: "65%" },  // 18  slate-blue       (N Cent)
  { h: 245, s: "65%" },  // 19  indigo           (Night only)
  { h: 258, s: "70%" },  // 20  blue-violet
  { h: 272, s: "70%" },  // 21  purple           (Day+Night, Young)
  { h: 286, s: "68%" },  // 22  violet
  { h: 318, s: "65%" },  // 23  magenta-pink
];

/** Subdued swatch for "All" and "Unknown" placeholder values. */
const SUBDUED: TagColor = { h: 215, s: "14%" };

/**
 * Per-(type, value) palette index.  All known values map to a fixed PALETTE
 * slot so the color is stable regardless of data order.
 */
const KNOWN_IDX: Partial<Record<TagType, Record<string, number>>> = {
  dayNight: {
    "Day only":    13,
    "Night only":  19,
    "Day + Night": 21,
  },
  age: {
    "Young": 21,
    "Kid":   16,
    "Tween": 10,
  },
  findability: {
    "High":   1,
    "Medium": 2,
    "Low":    5,
  },
  season: {
    "Spring": 7,
    "Summer": 4,
    "Fall":   0,
    "Winter": 14,
  },
  region: {
    "NE":      17,
    "SE":      0,
    "N Cent":  18,
    "S Cent":  2,
    "NW + AK": 11,
    "SW + HI": 3,
  },
  surroundings: {
    "Rural / Xurban":  9,
    "Suburban / Town": 11,
    "Urban / City":    15,
    "Highway":         3,
    "Coast":           13,
  },
};

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
 * - Known values      → fixed PALETTE index (stable across re-renders)
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
