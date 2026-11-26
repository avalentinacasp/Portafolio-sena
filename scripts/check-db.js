const { getPool } = require("../server/db");

async function main() {
  let pool;
  try {
    pool = getPool();
    const result = await pool.query("SELECT version() AS version");
    console.log(result.rows[0].version);
  } catch (error) {
    console.error("Neon PostgreSQL check failed:", error.message);
    process.exitCode = 1;
  } finally {
    if (pool) {
      await pool.end();
    }
  }
}

main();
