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

const KNOWN: Partial<Record<TagType, Record<string, TagColor>>> = {
  dayNight: {
    "Day only":    { h: 200, s: "80%" },
    "Night only":  { h: 245, s: "65%" },
    "Day + Night": { h: 270, s: "70%" },
  },
  age: {
    "Young": { h: 280, s: "75%" },
    "Kid":   { h: 215, s: "70%" },
    "Tween": { h: 155, s: "55%" },
  },
  findability: {
    "High":   { h: 35,  s: "85%" },
    "Medium": { h: 25,  s: "75%" },
    "Low":    { h: 48,  s: "70%" },
  },
  season: {
    "Spring": { h: 88,  s: "65%" },
    "Summer": { h: 45,  s: "85%" },
    "Fall":   { h: 20,  s: "80%" },
    "Winter": { h: 210, s: "65%" },
  },
  region: {
    "NE":      { h: 220, s: "75%" },
    "SE":      { h: 5,   s: "75%" },
    "N Cent":  { h: 235, s: "65%" },
    "S Cent":  { h: 30,  s: "80%" },
    "NW + AK": { h: 175, s: "65%" },
    "SW + HI": { h: 40,  s: "80%" },
  },
  surroundings: {
    "Rural / Xurban":  { h: 130, s: "55%" },
    "Suburban / Town": { h: 175, s: "60%" },
    "Urban / City":    { h: 210, s: "55%" },
    "Highway":         { h: 35,  s: "55%" },
    "Coast":           { h: 195, s: "75%" },
  },
};

const BOARD_PALETTE: TagColor[] = [
  { h: 5,   s: "75%" },
  { h: 20,  s: "80%" },
  { h: 35,  s: "85%" },
  { h: 48,  s: "80%" },
  { h: 65,  s: "70%" },
  { h: 88,  s: "65%" },
  { h: 110, s: "60%" },
  { h: 130, s: "55%" },
  { h: 155, s: "60%" },
  { h: 175, s: "65%" },
  { h: 195, s: "75%" },
  { h: 210, s: "70%" },
  { h: 220, s: "75%" },
  { h: 235, s: "65%" },
  { h: 245, s: "65%" },
  { h: 258, s: "70%" },
  { h: 270, s: "70%" },
  { h: 285, s: "70%" },
  { h: 310, s: "65%" },
  { h: 330, s: "75%" },
];

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) & 0xffffffff;
  }
  return Math.abs(hash);
}

const SUBDUED: TagColor = { h: 215, s: "15%" };

/**
 * Returns the hue+saturation for a given tag type + value.
 * "All" and "Unknown" always return a subdued muted swatch.
 * Board names (and any unrecognised values) are assigned deterministically
 * from BOARD_PALETTE via a name hash, so each board gets a stable color.
 */
export function getTagColor(type: TagType, value: string): TagColor {
  if (value === "Unknown" || value === "All") return SUBDUED;
  const found = KNOWN[type]?.[value];
  if (found) return found;
  return BOARD_PALETTE[hashString(value) % BOARD_PALETTE.length];
}

/**
 * Returns true for placeholder values that should render as subdued/muted
 * in both tag badges and Analysis bar fills.
 */
export function isSubduedValue(value: string): boolean {
  return value === "Unknown" || value === "All";
}
