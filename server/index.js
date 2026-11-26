const cors = require("cors");
const express = require("express");
const helmet = require("helmet");
const { getPool } = require("./db");
const { mountPrivateRoutes } = require("./private");
const path = require("node:path");

const app = express();
app.set("trust proxy", 1);
const allowedOrigins = new Set(
  (process.env.FRONTEND_ORIGINS || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
);

app.disable("x-powered-by");
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
    },
  },
}));
app.use("/api", (request, response, next) => {
  const origin = request.get("origin");
  const sameOrigin = origin && `${request.protocol}://${request.get("host")}` === origin;
  if (!origin || sameOrigin) {
    next();
    return;
  }
  cors({
    origin(value, callback) {
      if (allowedOrigins.has(value)) {
        callback(null, true);
        return;
      }
      const error = new Error("Origin is not allowed by CORS.");
      error.status = 403;
      callback(error);
    },
    credentials: true,
    methods: ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    optionsSuccessStatus: 204,
  })(request, response, next);
});
app.use(express.json({ limit: "16kb" }));

app.get("/api/health", (_request, response) => {
  response.json({ status: "ok" });
});

app.get("/api/health/database", async (_request, response, next) => {
  try {
    const result = await getPool().query("SELECT version() AS version");
    response.json({ status: "ok", postgres: result.rows[0].version });
  } catch (error) {
    next(error);
  }
});

app.get("/api/public/catalog", async (_request, response, next) => {
  try {
    const [sites, programs] = await Promise.all([
      getPool().query(
        `SELECT id, name, city, address
         FROM portal_public_sites
         WHERE is_active = TRUE
         ORDER BY name`,
      ),
      getPool().query(
        `SELECT p.id, p.name, p.code, s.name AS site_name, s.city
         FROM portal_public_programs AS p
         JOIN portal_public_sites AS s ON s.id = p.site_id
         WHERE p.is_public = TRUE AND s.is_active = TRUE
         ORDER BY p.name`,
      ),
    ]);

    response.json({ sites: sites.rows, programs: programs.rows });
  } catch (error) {
    next(error);
  }
});

mountPrivateRoutes(app, allowedOrigins);

const frontendPath = path.join(__dirname, "..", "portafolio-digital-sena.html");
app.get(["/", "/portafolio-digital-sena.html"], (_request, response) => {
  response.sendFile(frontendPath);
});
app.get("/styles.css", (_request, response) => {
  response.sendFile(path.join(__dirname, "..", "styles.css"));
});
app.get("/app.js", (_request, response) => {
  response.sendFile(path.join(__dirname, "..", "app.js"));
});

app.use((error, _request, response, _next) => {
  if (error.status) {
    response.status(error.status).json({ error: error.message });
    return;
  }
  console.error("API request failed:", error.message);
  response.status(500).json({ error: "The request could not be completed." });
});

if (require.main === module) {
  const port = Number(process.env.PORT) || 3000;
  const server = app.listen(port, "0.0.0.0", () => {
    console.log(`API listening on port ${port}.`);
  });

  for (const signal of ["SIGINT", "SIGTERM"]) {
    process.on(signal, () => {
      server.close(async () => {
        await getPool().end();
        process.exit(0);
      });
    });
  }
}

module.exports = app;
