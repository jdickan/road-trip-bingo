import { describe, expect, it } from "vitest";
import { canonicalReleaseJson, releaseChecksum, validatePlayableRelease,
  type ReleaseContent } from "../lib/release-content";

function content(labels: string[]): ReleaseContent {
  return {
    schemaVersion: 1,
    board: { id: 7, name: "Road trip", description: null, ageLevels: ["Kid"],
      difficulty: null, timeOfYear: null, wordCount: labels.length },
    words: labels.map((word, i) => ({
      id: i + 1, word, spanish: null, emoji: "🚗", age: null, findability: null,
      seasons: ["All Year"], dayNight: [], regions: [], surroundings: [],
    })),
  };
}

describe("immutable board release content", () => {
  it("canonicalizes nested object keys without changing array order", () => {
    expect(canonicalReleaseJson({ z: { y: 2, x: 1 }, a: ["b", "a"] }))
      .toBe('{"a":["b","a"],"z":{"x":1,"y":2}}');
  });

  it("produces a stable SHA-256 over the complete release, including metadata", () => {
    const first = content(["Cow", "Train"]);
    expect(releaseChecksum(first)).toBe(releaseChecksum(structuredClone(first)));
    expect(releaseChecksum(first)).not.toBe(releaseChecksum({ ...first, board: { ...first.board, name: "Different" } }));
  });

  it("requires 25 distinct playable words and the correct count", () => {
    expect(() => validatePlayableRelease(content(Array.from({ length: 25 }, (_, i) => `Word ${i}`)))).not.toThrow();
    expect(() => validatePlayableRelease(content(Array.from({ length: 24 }, (_, i) => `Word ${i}`)))).toThrow();
    expect(() => validatePlayableRelease(content([...Array.from({ length: 24 }, (_, i) => `Word ${i}`), "word 0"]))).toThrow();
  });

  it("rejects blank entries and inconsistent payload counts", () => {
    const blank = content(Array.from({ length: 25 }, (_, i) => `Word ${i}`));
    blank.words[0]!.word = "  ";
    expect(() => validatePlayableRelease(blank)).toThrow();
    const mismatch = content(Array.from({ length: 25 }, (_, i) => `Word ${i}`));
    mismatch.board.wordCount = 26;
    expect(() => validatePlayableRelease(mismatch)).toThrow();
  });
});
