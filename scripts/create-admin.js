const { Client } = require("pg");
const { getConnectionString } = require("../server/db");
const { passwordHash } = require("../server/private");

async function main() {
  const document = process.env.BOOTSTRAP_ADMIN_DOCUMENT || "";
  const name = process.env.BOOTSTRAP_ADMIN_NAME || "";
  const email = process.env.BOOTSTRAP_ADMIN_EMAIL || "";
  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD || "";
  if (!/^\d{6,12}$/.test(document) || !name.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Define BOOTSTRAP_ADMIN_DOCUMENT, BOOTSTRAP_ADMIN_NAME y BOOTSTRAP_ADMIN_EMAIL.");
  }

  const client = new Client({
    connectionString: getConnectionString("DATABASE_URL_UNPOOLED"),
    connectionTimeoutMillis: 10_000,
  });
  try {
    await client.connect();
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(737274901)");
    const existing = await client.query(
      "SELECT 1 FROM usuarios WHERE rol = 'administrador' LIMIT 1",
    );
    if (existing.rowCount) {
      throw new Error("Ya existe una cuenta administradora; no se creó ni modificó ninguna cuenta.");
    }

    const hash = await passwordHash(password);
    await client.query(
      `INSERT INTO usuarios (documento, rol, nombre, correo, password_hash)
       VALUES ($1, 'administrador', $2, $3, $4)`,
      [document, name.trim(), email.toLowerCase(), hash],
    );
    await client.query("COMMIT");
    console.log("Cuenta administradora inicial creada. Retira las variables BOOTSTRAP_ADMIN_* del entorno.");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error("No se pudo crear la cuenta inicial:", error.message);
  process.exitCode = 1;
});
