// Vitest setup — runs before each test file is imported.
//
// Tests run against a REAL PostgreSQL database and TRUNCATE tables between
// tests. To prevent accidentally wiping a development or production database,
// tests refuse to run unless TEST_DATABASE_URL is explicitly set, and it must
// differ from DATABASE_URL.

const testUrl = process.env.TEST_DATABASE_URL;

if (!testUrl) {
  throw new Error(
    "TEST_DATABASE_URL must be set to run API tests. " +
      "Tests TRUNCATE tables, so point it at a dedicated test database " +
      "(never your development or production database).",
  );
}

if (process.env.DATABASE_URL && process.env.DATABASE_URL === testUrl) {
  throw new Error(
    "TEST_DATABASE_URL must differ from DATABASE_URL. " +
      "Tests TRUNCATE tables — use a dedicated test database.",
  );
}

// Point the db client (which reads DATABASE_URL at import time) at the test DB.
process.env.DATABASE_URL = testUrl;

// Keep auth disabled in tests regardless of the local environment.
delete process.env.ADMIN_PASSWORD;
delete process.env.AI_ROUTE_SECRET;
process.env.NODE_ENV = "test";
