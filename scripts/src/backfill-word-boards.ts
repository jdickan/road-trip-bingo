/**
 * Phase 0 backfill migration: populate bingo_word_boards junction table
 * from the legacy words.boards text[] of board NAMES.
 *
 * Idempotent: ON CONFLICT DO NOTHING — safe to re-run.
 * Non-destructive: does NOT modify or drop words.boards.
 *
 * Run: pnpm --filter @workspace/scripts run backfill-word-boards
 */
import { pool } from "@workspace/db";

async function main() {
  const client = await pool.connect();
  try {
    // Pre-flight: match/miss counts
    const pre = await client.query(`
      WITH names AS (
        SELECT w.id AS word_id, bn.board_name
        FROM bingo_words w
        CROSS JOIN LATERAL unnest(w.boards) AS bn(board_name)
        WHERE cardinality(w.boards) > 0
      )
      SELECT
        (SELECT count(*) FROM names) AS total_associations,
        (SELECT count(*) FROM names n JOIN bingo_boards b ON b.name = n.board_name) AS matched,
        (SELECT count(*) FROM names n LEFT JOIN bingo_boards b ON b.name = n.board_name WHERE b.id IS NULL) AS missed
    `);
    console.log("Pre-flight:", pre.rows[0]);

    const misses = await client.query(`
      SELECT n.board_name, count(*) AS words
      FROM (SELECT unnest(boards) AS board_name FROM bingo_words WHERE cardinality(boards) > 0) n
      LEFT JOIN bingo_boards b ON b.name = n.board_name
      WHERE b.id IS NULL
      GROUP BY n.board_name ORDER BY words DESC
    `);
    if (misses.rows.length > 0) {
      console.log("Unmatched board names (will be SKIPPED):");
      for (const row of misses.rows) console.log(`  "${row.board_name}" — ${row.words} words`);
    }

    await client.query("BEGIN");
    const result = await client.query(`
      INSERT INTO bingo_word_boards (word_id, board_id)
      SELECT DISTINCT w.id, b.id
      FROM bingo_words w
      CROSS JOIN LATERAL unnest(w.boards) AS bn(board_name)
      JOIN bingo_boards b ON b.name = bn.board_name
      ON CONFLICT DO NOTHING
    `);
    await client.query("COMMIT");
    console.log(`Inserted ${result.rowCount} junction rows.`);

    const post = await client.query(`SELECT count(*) AS total FROM bingo_word_boards`);
    console.log(`Junction table now has ${post.rows[0].total} rows.`);
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error("Backfill failed:", err);
  process.exit(1);
});
