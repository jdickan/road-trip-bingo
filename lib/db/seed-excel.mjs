import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const XLSX = require("xlsx");

const { Pool } = pg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL must be set.");
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

function splitMulti(val) {
  if (!val || val.trim() === "") return [];
  return val.split(",").map((s) => s.trim()).filter(Boolean);
}

function parseWord(row) {
  const word = row[0]?.trim();
  if (!word || word === "Word") return null;

  const regions = splitMulti(row[1] ?? "");
  const surroundings = splitMulti(row[2] ?? "");
  const dayNight = splitMulti(row[3] ?? "");
  const age = row[4]?.trim() || null;
  const findability = row[5]?.trim() || null;
  const seasons = splitMulti(row[6] ?? "");
  const boards = splitMulti(row[7] ?? "");
  const emilyNote = row[8]?.trim() || null;

  // Clean up the word - remove surrounding quotes
  const cleanWord = word.replace(/^["']|["']$/g, "");

  return {
    word: cleanWord,
    regions: regions.length > 0 ? regions : ["All"],
    surroundings,
    day_night: dayNight.length > 0 ? dayNight : [],
    age,
    findability,
    seasons: seasons.length > 0 ? seasons : [],
    boards,
    notes: emilyNote || null,
  };
}

const FORMAL_BOARDS = [
  { name: "General", description: "For use on general boards.", age_levels: ["Young", "Kid", "Tween"], difficulty: "Easy", time_of_year: "Year round", availability: "Unpaid", status: "active" },
  { name: "Chaos", description: "Chaos board celebrates the odd and occasionally disturbing.", age_levels: ["Tween"], difficulty: "Hard", time_of_year: "Year round", availability: "Paid only", status: "active" },
  { name: "Christmas", description: "Focuses on wintry items and things often put out on lawns or buildings during the Christmas season.", age_levels: ["Young", "Kid", "Tween"], difficulty: "Easy", time_of_year: "November and December", availability: "Paid only", status: "active" },
  { name: "Halloween", description: "Focuses on fall items and things often put out on lawns or buildings during the Halloween season.", age_levels: ["Kid", "Tween"], difficulty: "Easy", time_of_year: "September and October", availability: "Paid only", status: "active" },
  { name: "Sounds", description: "Sounds board is entirely based on hearing sounds in order to check it off the list.", age_levels: ["Kid", "Tween"], difficulty: "Medium", time_of_year: "Year round", availability: "Paid only", status: "active" },
  { name: "Smells", description: "Smells board is entirely based on things someone must smell on a road trip in order to check it off the list.", age_levels: ["Kid", "Tween"], difficulty: "Medium", time_of_year: "Year round", availability: "Paid only", status: "active" },
  { name: "Words for adults to say", description: "This board focuses on what's in the car, requiring the child to trick an adult into saying something in a square without actually saying the word themselves.", age_levels: ["Kid", "Tween"], difficulty: "Medium", time_of_year: "Year round", availability: "Paid only", status: "active" },
  { name: "ABC Street Signs", description: "This board just lists letters in the alphabet that someone must find in the street signs around them.", age_levels: ["Kid", "Tween"], difficulty: "Easy", time_of_year: "Year round", availability: "Paid only", status: "active" },
  { name: "Architecture", description: "This board focuses on architectural terms (like cornice or widow's walk) — ideal for historic neighborhoods and curious kids.", age_levels: ["Tween"], difficulty: "Hard", time_of_year: "Year round", availability: "Paid only", status: "active" },
  { name: "Single letter", description: "The whole board only has words for one single letter that YOU get to pick.", age_levels: ["Kid", "Tween"], difficulty: "Medium", time_of_year: "Year round", availability: "Paid only", status: "active" },
  { name: "License plate", description: "Enter your current state and then see a bingo board with the 24 closest states around it (your state is the free square).", age_levels: ["Kid", "Tween"], difficulty: "Hard", time_of_year: "Year round", availability: "Paid only", status: "active" },
  { name: "Song lyrics", description: "Turn on some jams and then try to win this bingo board by hearing all the words you need to.", age_levels: ["Kid", "Tween"], difficulty: "Medium", time_of_year: "Year round", availability: "Paid only", status: "active" },
  { name: "Touchy feely", description: "This is all about your fingers. From your seat, can you touch all the things needed to win bingo?", age_levels: ["Kid", "Tween"], difficulty: "Medium", time_of_year: "Year round", availability: "Paid only", status: "active" },
  { name: "Make your own", description: "Enter your favorite things you want to find (or have your parents make it for you).", age_levels: ["Kid", "Tween"], difficulty: "Easy", time_of_year: "Year round", availability: "Paid only", status: "active" },
  { name: "Flora & Fauna", description: "Get technical with the plants and animals around you. Good luck!", age_levels: ["Tween"], difficulty: "Hard", time_of_year: "Year round", availability: "Paid only", status: "active" },
];

const CONCEPT_BOARDS = [
  { name: "First two letters", description: "Board has common letter combinations rather than single letters, or letter combos are sprinkled into a board of single letters.", age_levels: [], status: "concept" },
  { name: "Road / Highway", description: "Day/night friendly board focused on road and highway sights.", age_levels: [], status: "concept" },
  { name: "Around the road / highway", description: "Gets players noticing interesting sights that could evoke discussion. Graveyards, historical markers, museums, with some easy ones like religious buildings, post office, school, fire station, library, healthy restaurant, building under construction, suspension bridge.", age_levels: [], status: "concept" },
  { name: "Colors", description: "Board focused on spotting specific colors.", age_levels: [], status: "concept" },
  { name: "Numbers", description: "Numbers board: 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85 (put 45 in the middle?).", age_levels: [], status: "concept" },
  { name: "Actions (but no sounds)", description: "Blinking light, running dog... Blinking, smiling, running, walking, jumping, waving, stopping, spinning, dancing, pointing.", age_levels: [], status: "concept" },
  { name: "Signs (Primitive)", description: "Red sign, Orange sign, Yellow sign, Green sign, Blue sign, Brown sign, Triangle sign, Circle sign, Arrow sign, Bike sign, Car sign, Truck sign, Airplane sign, Traffic Light... Day/night friendly and easily spotted from a highway.", age_levels: [], status: "concept" },
  { name: "In the distance", description: "Snow Capped Mountain, Hill, River, Stream, Lake, Cloud, Sunbeam, Rainbow, Rain, Fog, Moon, Skyscraper, Suspension Bridge, Blinking Light, Airplane, Ship, Lightning, Smoke Stack, Water Tower, Windmill, Silo, Steeple, Antenna, Helicopter, UFO, Playground.", age_levels: [], status: "concept" },
  { name: "History / Culture", description: "Historical Site or Marker, Ruins, National or State Park, Playground, Museum, College, Statue, Mural, Military Object, Stadium, Zoo, Junk Yard, Farm, Boulders, Wild Animal, Horse, Blinking Red Light, Suspension Bridge, Airplane, Windmill, UFO, Silo, State Line, Welcome Sign, graveyard.", age_levels: [], status: "concept" },
  { name: "Behavior in the car", description: "Eat a healthy meal, say something nice, no noise for 5 minutes, clean the car, sing a song, read a book, learn a new fact, learn a new word, no screen for 15 minutes.", age_levels: [], status: "concept" },
  { name: "Learn something new about nearby...", description: "Song or band, word or phrase, book or magazine, person statue, nearby geology, mural or sign, car or vehicle, shop or restaurant, bird or animal, river or water, town or city, battle or history, food or restaurant, clothes or fashion, school or education, buildings or architecture, farm or animals, factories or industry, plants or environment, historical marker.", age_levels: [], status: "concept" },
  { name: "Play", description: "i spy, spot the letter, scavenger hunt, patty cake, thumb wrestle, dice game, card game, song...", age_levels: [], status: "concept" },
  { name: "Nat Park - Yosemite", description: "Bear, Pinecone, John Muir Trail, Vernal Falls, Glacier Point, Halfdome, El Capitan, Sentinel Dome, Curry Village, Meadow, Giant Sequoia Tree, Chipmunk, Crow / Raven, Bear Proof Box, Merced River, Wood Cabin.", age_levels: [], status: "draft" },
];

async function seed() {
  const excelPath = path.resolve(__dirname, "../../attached_assets/Bingo_word_database-4_1775007736624.xlsx");
  console.log("Reading Excel from:", excelPath);
  const wb = XLSX.readFile(excelPath);
  const sheet = wb.Sheets["Jays copy of bingo word databas"];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "", raw: false });

  const words = [];
  const seen = new Set();

  for (const row of rows) {
    const parsed = parseWord(row);
    if (!parsed) continue;
    const key = parsed.word.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    words.push(parsed);
  }

  console.log(`Parsed ${words.length} unique words from Excel`);

  // Clear and re-seed words
  await db.execute("DELETE FROM bingo_words");
  console.log("Cleared existing words");

  const BATCH = 50;
  for (let i = 0; i < words.length; i += BATCH) {
    const batch = words.slice(i, i + BATCH);
    const values = batch.map((w, idx) => {
      const b = idx * 9;
      return `($${b + 1}, $${b + 2}::text[], $${b + 3}::text[], $${b + 4}::text[], $${b + 5}, $${b + 6}, $${b + 7}::text[], $${b + 8}::text[], $${b + 9})`;
    }).join(", ");
    const params = batch.flatMap((w) => [
      w.word, w.regions, w.surroundings, w.day_night, w.age, w.findability, w.seasons, w.boards, w.notes
    ]);
    await pool.query(
      `INSERT INTO bingo_words (word, regions, surroundings, day_night, age, findability, seasons, boards, notes) VALUES ${values}`,
      params
    );
    console.log(`Inserted words ${i + 1}–${Math.min(i + BATCH, words.length)}`);
  }

  // Clear and re-seed boards
  await db.execute("DELETE FROM bingo_boards");
  console.log("Cleared existing boards");

  const allBoards = [...FORMAL_BOARDS, ...CONCEPT_BOARDS];
  for (const board of allBoards) {
    await pool.query(
      `INSERT INTO bingo_boards (name, description, age_levels, difficulty, time_of_year, availability, status) VALUES ($1, $2, $3::text[], $4, $5, $6, $7)`,
      [board.name, board.description ?? null, board.age_levels ?? [], board.difficulty ?? null, board.time_of_year ?? null, board.availability ?? null, board.status]
    );
  }
  console.log(`Inserted ${allBoards.length} boards`);

  await pool.end();
  console.log("Done!");
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
