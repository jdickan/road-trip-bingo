/**
 * Bulk-updates the bingo_words table with Spanish translations and emoji
 * from the provided JSON file. Matches on word name (case-insensitive,
 * whitespace-trimmed). Reports matched, skipped, and unmatched rows.
 */
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";
import { readFileSync } from "fs";
import { sql } from "drizzle-orm";

const require = createRequire(import.meta.url);
const { Pool } = pg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL must be set.");
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

// Load JSON
const jsonPath = path.resolve(__dirname, "../../attached_assets/road_trip_bingo_mexican_spanish_with_emoji_1775011502959.json");
const entries = JSON.parse(readFileSync(jsonPath, "utf-8"));

console.log(`Loaded ${entries.length} entries from JSON`);

// Fetch all existing words
const existing = await db.execute(sql`SELECT id, word FROM bingo_words`);
const rows = existing.rows;

// Build lookup: normalized name -> id
const lookup = new Map();
for (const row of rows) {
  lookup.set(row.word.trim().toLowerCase(), row.id);
}

let matched = 0;
const unmatched = [];

for (const entry of entries) {
  const key = entry.word.trim().toLowerCase();
  const id = lookup.get(key);

  if (!id) {
    unmatched.push(entry.word);
    continue;
  }

  const spanishVal = entry.spanish ?? null;
  const emojiVal = entry.emoji ?? null;

  await db.execute(
    sql`UPDATE bingo_words SET spanish = ${spanishVal}, emoji = ${emojiVal} WHERE id = ${id}`
  );
  matched++;
}

console.log(`\n✅ Updated:   ${matched} words`);
console.log(`❌ Unmatched: ${unmatched.length} words`);
if (unmatched.length > 0) {
  console.log("\nUnmatched words (from JSON, not found in DB):");
  unmatched.forEach((w) => console.log(`  - ${w}`));
}

await pool.end();
