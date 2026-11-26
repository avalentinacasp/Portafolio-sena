const fs = require("node:fs");
const path = require("node:path");
const { Client } = require("pg");
const { getConnectionString } = require("../server/db");

async function main() {
  let client;
  try {
    client = new Client({
      connectionString: getConnectionString("DATABASE_URL_UNPOOLED"),
      connectionTimeoutMillis: 10_000,
    });
    await client.connect();
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        filename TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    const directory = path.join(__dirname, "..", "migrations");
    const migrations = fs.readdirSync(directory)
      .filter((name) => /^\d+_.+\.sql$/.test(name))
      .sort();

    for (const filename of migrations) {
      const applied = await client.query(
        "SELECT 1 FROM schema_migrations WHERE filename = $1",
        [filename],
      );
      if (applied.rowCount) {
        console.log(`Already applied: ${filename}`);
        continue;
      }

      await client.query("BEGIN");
      try {
        const sql = fs.readFileSync(path.join(directory, filename), "utf8");
        await client.query(sql);
        await client.query(
          "INSERT INTO schema_migrations (filename) VALUES ($1)",
          [filename],
        );
        await client.query("COMMIT");
        console.log(`Applied: ${filename}`);
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      }
    }
  } catch (error) {
    console.error("Database migration failed:", error.message);
    process.exitCode = 1;
  } finally {
    if (client) {
      await client.end();
    }
  }
}

main();
