const { Pool } = require("pg");

function getConnectionString(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is missing. Run neon env pull before starting the server.`);
  }

  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`${name} must be a valid PostgreSQL connection URL.`);
  }

  if (url.protocol !== "postgres:" && url.protocol !== "postgresql:") {
    throw new Error(`${name} must use the postgres or postgresql protocol.`);
  }

  if (url.searchParams.get("sslmode") === "require") {
    url.searchParams.set("sslmode", "verify-full");
  }
  return url.toString();
}

let pool;

function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: getConnectionString("DATABASE_URL"),
      max: 5,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
    });

    pool.on("error", (error) => {
      console.error("Unexpected PostgreSQL pool error:", error.message);
    });
  }
  return pool;
}

module.exports = { getConnectionString, getPool };
