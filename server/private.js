const {
  randomBytes,
  randomUUID,
  scrypt: scryptCallback,
  createHash,
  timingSafeEqual,
} = require("node:crypto");
const { promisify } = require("node:util");
const { getPool } = require("./db");

const scrypt = promisify(scryptCallback);
const SESSION_COOKIE = process.env.NODE_ENV === "production"
  ? "__Host-portfolio_session"
  : "portfolio_session";
const SESSION_MS = 12 * 60 * 60 * 1000;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_LIMIT = 30;
const loginAttempts = new Map();
const FILE_TYPES = new Set([
  "pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "zip", "rar",
  "png", "jpg", "jpeg", "txt",
]);
const ROLES = new Set(["aprendiz", "instructor", "administrador", "coordinador"]);

function httpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function cookieValue(request, name) {
  const cookies = (request.headers.cookie || "").split(";");
  const pair = cookies.map((part) => part.trim()).find((part) => part.startsWith(`${name}=`));
  if (!pair) return null;
  try {
    return decodeURIComponent(pair.slice(name.length + 1));
  } catch {
    return null;
  }
}

function enforceLoginLimit(ip) {
  const now = Date.now();
  const current = loginAttempts.get(ip);
  if (!current || now - current.startedAt >= LOGIN_WINDOW_MS) {
    loginAttempts.set(ip, { startedAt: now, count: 1 });
    return;
  }
  if (current.count >= LOGIN_LIMIT) {
    throw httpError(429, "Demasiados intentos de inicio de sesión. Intenta de nuevo más tarde.");
  }
  current.count += 1;
  if (loginAttempts.size > 10000) {
    for (const [key, value] of loginAttempts) {
      if (now - value.startedAt >= LOGIN_WINDOW_MS) loginAttempts.delete(key);
    }
  }
}

function sessionCookie(value, maxAge) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${SESSION_COOKIE}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`;
}

function verifyOrigin(request, allowedOrigins) {
  const origin = request.get("origin");
  if (!origin) {
    throw httpError(403, "Se requiere un origen válido para esta operación.");
  }
  const sameOrigin = `${request.protocol}://${request.get("host")}` === origin;
  if (!sameOrigin && !allowedOrigins.has(origin)) {
    throw httpError(403, "Origen no autorizado.");
  }
}

async function passwordHash(password) {
  if (typeof password !== "string" || password.length < 10 || password.length > 128) {
    throw httpError(400, "La contraseña debe tener entre 10 y 128 caracteres.");
  }
  const salt = randomBytes(16);
  const key = await scrypt(password, salt, 64);
  return `${salt.toString("hex")}:${key.toString("hex")}`;
}

async function verifyPassword(password, storedHash) {
  const [saltHex, keyHex] = String(storedHash || "").split(":");
  if (!/^[\da-f]{32}$/i.test(saltHex) || !/^[\da-f]{128}$/i.test(keyHex)) {
    return false;
  }
  const candidate = await scrypt(password, Buffer.from(saltHex, "hex"), 64);
  return timingSafeEqual(candidate, Buffer.from(keyHex, "hex"));
}

function publicUser(user) {
  return {
    doc: user.documento,
    role: user.rol,
    name: user.nombre,
    email: user.correo,
    ref: user.referencia_id,
    ini: user.nombre.split(/\s+/).map((part) => part[0]).slice(0, 2).join("").toUpperCase(),
  };
}

async function getSession(request) {
  const token = cookieValue(request, SESSION_COOKIE);
  if (!token || !/^[\da-f]{64}$/i.test(token)) return null;
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const result = await getPool().query(
    `SELECT u.documento, u.rol, u.nombre, u.correo, u.referencia_id
     FROM sesiones_auth s
     JOIN usuarios u ON u.documento = s.documento
     WHERE s.token_hash = $1 AND s.expira_en > NOW()`,
    [tokenHash],
  );
  return result.rows[0] || null;
}

function requireAuth(request, _response, next) {
  getSession(request).then((user) => {
    if (!user) {
      next(httpError(401, "Inicia sesión para continuar."));
      return;
    }
    request.user = user;
    next();
  }).catch(next);
}

function requireSameOrigin(allowedOrigins) {
  return (request, _response, next) => {
    if (["GET", "HEAD", "OPTIONS"].includes(request.method)) {
      next();
      return;
    }
    try {
      verifyOrigin(request, allowedOrigins);
      next();
    } catch (error) {
      next(error);
    }
  };
}

function requireRole(...roles) {
  return (request, _response, next) => {
    if (!roles.includes(request.user.rol)) {
      next(httpError(403, "No tienes permisos para esta operación."));
      return;
    }
    next();
  };
}

function id() {
  return randomUUID();
}

function dateOnly(value) {
  if (!value) return "";
  return value instanceof Date ? value.toISOString().slice(0, 10) : String(value).slice(0, 10);
}

function displayDate(value) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat("es-CO", { timeZone: "UTC" }).format(date);
}

function parseJson(value, fallback) {
  try {
    return JSON.parse(value || "");
  } catch {
    return fallback;
  }
}

async function loadState(user) {
  const pool = getPool();
  const admin = user.rol === "administrador";
  const coordinator = user.rol === "coordinador";
  const ownInstructor = user.rol === "instructor" ? user.referencia_id : null;
  const ownLearner = user.rol === "aprendiz" ? user.referencia_id : null;
  const [sites, programs, instructors, fichas, comps, learners, tasks, deliveries, notes, notifications, risks, observations, materials] =
    await Promise.all([
      pool.query("SELECT id, nombre, ciudad, direccion, activa FROM sedes ORDER BY nombre"),
      pool.query("SELECT id, nombre, codigo, sede_id FROM programas ORDER BY nombre"),
      pool.query(
        `SELECT id, nombre, documento, vinculacion, sede_id, correo FROM instructores
         WHERE $1::boolean OR id = $2 OR ($3::text IS NOT NULL AND id IN (
           SELECT instructor_id FROM competencias
           WHERE programa_id = (SELECT f.programa_id FROM aprendices a JOIN fichas f ON f.id = a.ficha_id WHERE a.id = $3)
         ))
         ORDER BY nombre`,
        [admin || coordinator, ownInstructor, ownLearner],
      ),
      pool.query(
        `SELECT DISTINCT f.id, f.numero, f.programa_id, f.jornada, f.trimestre_actual,
                f.fecha_inicio, f.fecha_fin, f.instructor_jefe_id
         FROM fichas f
         LEFT JOIN competencias c ON c.programa_id = f.programa_id
         WHERE $1::boolean OR f.instructor_jefe_id = $2
            OR c.instructor_id = $2
            OR f.id = (SELECT ficha_id FROM aprendices WHERE id = $3)
         ORDER BY f.numero`,
        [admin, ownInstructor, ownLearner],
      ),
      pool.query(
        `SELECT id, codigo, nombre, trimestre, instructor_id, programa_id FROM competencias
         WHERE $1::boolean OR instructor_id = $2
            OR programa_id = (SELECT f.programa_id FROM aprendices a JOIN fichas f ON f.id = a.ficha_id WHERE a.id = $3)
         ORDER BY trimestre, nombre`,
        [admin, ownInstructor, ownLearner],
      ),
      pool.query(
        `SELECT a.id, a.nombre, a.documento, a.correo, a.ficha_id
         FROM aprendices a JOIN fichas f ON f.id = a.ficha_id
         WHERE $1::boolean OR f.instructor_jefe_id = $2
            OR EXISTS (SELECT 1 FROM competencias c WHERE c.programa_id = f.programa_id AND c.instructor_id = $2)
            OR a.id = $3
         ORDER BY a.nombre`,
        [admin, ownInstructor, ownLearner],
      ),
      pool.query(
        `SELECT t.id, t.competencia_id, t.titulo, t.descripcion, t.instrucciones,
                t.fecha_limite, t.hora_limite, t.adjuntos,
                COALESCE(array_agg(tf.ficha_id) FILTER (WHERE tf.ficha_id IS NOT NULL), '{}') AS fichas
         FROM tareas t JOIN competencias c ON c.id = t.competencia_id
         LEFT JOIN tarea_ficha tf ON tf.tarea_id = t.id
         WHERE $1::boolean OR c.instructor_id = $2
            OR EXISTS (SELECT 1 FROM aprendices a JOIN tarea_ficha x ON x.ficha_id = a.ficha_id WHERE a.id = $3 AND x.tarea_id = t.id)
         GROUP BY t.id ORDER BY t.fecha_limite`,
        [admin, ownInstructor, ownLearner],
      ),
      pool.query(
        `SELECT e.id, e.tarea_id, e.aprendiz_id, e.archivo, e.fecha_entrega, e.estado,
                e.con_retraso, e.nota, e.resultado, e.retroalimentacion,
                a.nombre AS aprendiz_nombre
         FROM entregas e JOIN aprendices a ON a.id = e.aprendiz_id
         JOIN fichas f ON f.id = a.ficha_id
         JOIN tareas t ON t.id = e.tarea_id
         JOIN competencias c ON c.id = t.competencia_id
         WHERE $1::boolean OR c.instructor_id = $2 OR e.aprendiz_id = $3
         ORDER BY e.fecha_entrega DESC`,
        [admin, ownInstructor, ownLearner],
      ),
      pool.query(
        "SELECT id, documento_propietario, titulo, contenido, fecha FROM notas WHERE documento_propietario = $1 ORDER BY fecha DESC",
        [user.documento],
      ),
      pool.query(
        "SELECT id, documento_destino, titulo, detalle, fecha, leida FROM notificaciones WHERE documento_destino = $1 ORDER BY fecha DESC",
        [user.documento],
      ),
      pool.query(
        `SELECT r.id, r.aprendiz_id, a.nombre AS aprendiz, r.nivel, r.observaciones, r.orientacion, r.emitido_por, r.fecha
         FROM reportes_riesgo r JOIN aprendices a ON a.id = r.aprendiz_id
         WHERE $1::boolean OR r.instructor_id = $2 OR r.aprendiz_id = $3 ORDER BY r.fecha DESC`,
        [admin, ownInstructor, ownLearner],
      ),
      pool.query(
        `SELECT o.id, o.instructor_id, i.nombre AS instructor, o.trimestre, o.comentario, o.fecha
         FROM observaciones o JOIN instructores i ON i.id = o.instructor_id
         WHERE $1::boolean OR o.instructor_id = $2 ORDER BY o.fecha DESC`,
        [admin || coordinator, ownInstructor],
      ),
      pool.query(
        `SELECT m.id, m.titulo, m.tipo, m.trimestre, m.visibilidad, m.propietario_id,
                c.id AS competencia_id, c.nombre AS competencia, c.programa_id,
                COALESCE(array_agg(DISTINCT mf.ficha_id) FILTER (WHERE mf.ficha_id IS NOT NULL), '{}') AS fichas
         FROM materiales m JOIN competencias c ON c.id = m.competencia_id
         LEFT JOIN material_fichas mf ON mf.material_id = m.id
         WHERE $1::boolean OR $2::boolean OR m.propietario_id = $3
            OR ($4::text IS NOT NULL AND m.visibilidad IN ('Público', 'Privado (solo mi ficha)')
                AND c.programa_id = (SELECT f.programa_id FROM aprendices a JOIN fichas f ON f.id = a.ficha_id WHERE a.id = $4)
                AND (m.visibilidad = 'Público' OR mf.ficha_id = (
                  SELECT ficha_id FROM aprendices WHERE id = $4
                )))
         GROUP BY m.id, c.id ORDER BY m.titulo`,
        [admin, coordinator, ownInstructor, ownLearner],
      ),
    ]);

  const instructorIds = new Set(instructors.rows.map((row) => row.id));
  const safeInstructors = instructors.rows.filter((row) => !ownLearner || instructorIds.has(row.id));
  const taskRows = tasks.rows.map((row) => ({
    id: row.id,
    compId: row.competencia_id,
    title: row.titulo,
    desc: row.descripcion,
    steps: parseJson(row.instrucciones, []),
    due: dateOnly(row.fecha_limite),
    dueT: row.hora_limite,
    fichas: row.fichas,
    adj: parseJson(row.adjuntos, []),
  }));
  const history = await pool.query(
    `SELECT r.entrega_id, r.fecha, r.nota, r.resultado, r.comentario, r.instructor
     FROM retroalimentaciones r
     JOIN entregas e ON e.id = r.entrega_id
     JOIN aprendices a ON a.id = e.aprendiz_id
     JOIN fichas f ON f.id = a.ficha_id
     JOIN tareas t ON t.id = e.tarea_id
     JOIN competencias c ON c.id = t.competencia_id
     WHERE $1::boolean OR c.instructor_id = $2 OR e.aprendiz_id = $3
     ORDER BY r.fecha`,
    [admin, ownInstructor, ownLearner],
  );
  const historyByDelivery = new Map();
  for (const row of history.rows) {
    const records = historyByDelivery.get(row.entrega_id) || [];
    records.push({
      date: displayDate(row.fecha),
      grade: row.nota,
      result: row.resultado,
      comment: row.comentario,
      by: row.instructor,
    });
    historyByDelivery.set(row.entrega_id, records);
  }
  const deliveryRows = deliveries.rows.map((row) => ({
    id: row.id,
    tareaId: row.tarea_id,
    learnerId: row.aprendiz_id,
    file: row.archivo,
    date: displayDate(row.fecha_entrega),
    status: row.estado,
    late: row.con_retraso,
    grade: row.nota == null ? "" : String(row.nota),
    result: row.resultado || "",
    comment: row.retroalimentacion || "",
    hist: historyByDelivery.get(row.id) || [],
  }));

  return {
    sites: sites.rows.map((r) => ({ id: r.id, name: r.nombre, city: r.ciudad, address: r.direccion, active: r.activa })),
    programs: programs.rows.map((r) => ({ id: r.id, name: r.nombre, code: r.codigo, siteId: r.sede_id })),
    instructors: safeInstructors.map((r) => ({ id: r.id, name: r.nombre, doc: r.documento, type: r.vinculacion, siteId: r.sede_id, email: r.correo })),
    fichas: fichas.rows.map((r) => ({ id: r.id, number: r.numero, programId: r.programa_id, journey: r.jornada, quarter: r.trimestre_actual, start: dateOnly(r.fecha_inicio), end: dateOnly(r.fecha_fin), jefeId: r.instructor_jefe_id })),
    comps: comps.rows.map((r) => ({ id: r.id, code: r.codigo, name: r.nombre, q: r.trimestre, instId: r.instructor_id, programId: r.programa_id })),
    learners: learners.rows.map((r) => ({ id: r.id, name: r.nombre, doc: r.documento, email: r.correo, fichaId: r.ficha_id })),
    tareas: taskRows,
    entregas: deliveryRows,
    notes: notes.rows.map((r) => ({ id: r.id, owner: r.documento_propietario, title: r.titulo, body: r.contenido, date: displayDate(r.fecha) })),
    notifs: notifications.rows.map((r) => ({ id: r.id, to: r.documento_destino, title: r.titulo, body: r.detalle, date: displayDate(r.fecha), read: r.leida })),
    risks: risks.rows.map((r) => ({ id: r.id, learnerId: r.aprendiz_id, learner: r.aprendiz, level: r.nivel, obs: r.observaciones, orient: r.orientacion, by: r.emitido_por, date: displayDate(r.fecha) })),
    obs: observations.rows.map((r) => ({ id: r.id, instId: r.instructor_id, instructor: r.instructor, q: r.trimestre, comment: r.comentario, date: displayDate(r.fecha) })),
    materials: materials.rows.map((r) => ({ id: r.id, title: r.titulo, type: r.tipo, q: r.trimestre, comp: r.competencia, compId: r.competencia_id, programId: r.programa_id, fichaIds: r.fichas, visib: r.visibilidad, ownerId: r.propietario_id })),
    users: admin
      ? (await pool.query(
        "SELECT documento, rol, nombre, correo FROM usuarios ORDER BY nombre",
      )).rows.map((r) => ({ doc: r.documento, role: r.rol, name: r.nombre, email: r.correo }))
      : [],
  };
}

async function createUser(client, { document, role, name, email, ref, password }) {
  if (!/^\d{6,12}$/.test(document || "")) throw httpError(400, "El documento debe tener entre 6 y 12 dígitos.");
  if (!ROLES.has(role) || !name || name.length > 150 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email || "")) {
    throw httpError(400, "Los datos del usuario no son válidos.");
  }
  const hash = await passwordHash(password);
  await client.query(
    `INSERT INTO usuarios (documento, rol, nombre, correo, referencia_id, password_hash)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [document, role, name, email.toLowerCase(), ref, hash],
  );
}

function transactionRoute(handler) {
  return async (request, response, next) => {
    const client = await getPool().connect();
    try {
      await client.query("BEGIN");
      await handler(request, response, client);
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      next(error);
    } finally {
      client.release();
    }
  };
}

async function notify(client, documents, title, detail) {
  for (const document of new Set(documents.filter(Boolean))) {
    await client.query(
      `INSERT INTO notificaciones (id, documento_destino, titulo, detalle)
       VALUES ($1, $2, $3, $4)`,
      [id(), document, title, detail],
    );
  }
}

function mountPrivateRoutes(app, allowedOrigins) {
  app.use("/api/private", requireAuth);
  app.use("/api/private", requireSameOrigin(allowedOrigins));

  app.post("/api/auth/login", async (request, response, next) => {
    try {
      verifyOrigin(request, allowedOrigins);
      enforceLoginLimit(request.ip);
      const document = String(request.body.document || "").trim();
      const password = String(request.body.password || "");
      const result = await getPool().query(
        `SELECT documento, rol, nombre, correo, referencia_id, password_hash, intentos_fallidos, bloqueado_hasta
         FROM usuarios WHERE documento = $1`,
        [document],
      );
      const user = result.rows[0];
      if (!user) {
        await scrypt(password, Buffer.alloc(16), 64);
        throw httpError(401, "Documento o contraseña incorrectos.");
      }
      if (user.bloqueado_hasta && new Date(user.bloqueado_hasta) > new Date()) {
        throw httpError(429, "La cuenta está temporalmente bloqueada. Intenta más tarde.");
      }
      if (!(await verifyPassword(password, user.password_hash))) {
        const failures = user.intentos_fallidos + 1;
        const locked = failures >= 5;
        await getPool().query(
          `UPDATE usuarios SET intentos_fallidos = $2,
             bloqueado_hasta = CASE WHEN $3 THEN NOW() + INTERVAL '15 minutes' ELSE NULL END
           WHERE documento = $1`,
          [document, locked ? 0 : failures, locked],
        );
        throw httpError(401, locked
          ? "Demasiados intentos. La cuenta se bloqueó durante 15 minutos."
          : "Documento o contraseña incorrectos.");
      }
      await getPool().query(
        "UPDATE usuarios SET intentos_fallidos = 0, bloqueado_hasta = NULL WHERE documento = $1",
        [document],
      );
      const token = randomBytes(32).toString("hex");
      await getPool().query("DELETE FROM sesiones_auth WHERE expira_en <= NOW()");
      await getPool().query(
        "INSERT INTO sesiones_auth (token_hash, documento, expira_en) VALUES ($1, $2, NOW() + INTERVAL '12 hours')",
        [createHash("sha256").update(token).digest("hex"), document],
      );
      response.setHeader("Set-Cookie", sessionCookie(token, SESSION_MS / 1000));
      response.json({ user: publicUser(user) });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/auth/session", async (request, response, next) => {
    try {
      const user = await getSession(request);
      if (!user) {
        response.status(200).json({ user: null });
        return;
      }
      response.json({ user: publicUser(user) });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/auth/logout", async (request, response, next) => {
    try {
      verifyOrigin(request, allowedOrigins);
      const token = cookieValue(request, SESSION_COOKIE);
      if (token) {
        await getPool().query(
          "DELETE FROM sesiones_auth WHERE token_hash = $1",
          [createHash("sha256").update(token).digest("hex")],
        );
      }
      response.setHeader("Set-Cookie", sessionCookie("", 0));
      response.status(204).end();
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/auth/password", requireAuth, async (request, response, next) => {
    try {
      verifyOrigin(request, allowedOrigins);
      const current = String(request.body.currentPassword || "");
      const password = String(request.body.newPassword || "");
      const result = await getPool().query(
        "SELECT password_hash FROM usuarios WHERE documento = $1",
        [request.user.documento],
      );
      if (!(await verifyPassword(current, result.rows[0].password_hash))) {
        throw httpError(400, "La contraseña actual no coincide.");
      }
      const passwordHashValue = await passwordHash(password);
      await getPool().query(
        "UPDATE usuarios SET password_hash = $2 WHERE documento = $1",
        [request.user.documento, passwordHashValue],
      );
      await getPool().query("DELETE FROM sesiones_auth WHERE documento = $1", [request.user.documento]);
      response.setHeader("Set-Cookie", sessionCookie("", 0));
      response.status(204).end();
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/private/state", async (request, response, next) => {
    try {
      response.json(await loadState(request.user));
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/private/notes", transactionRoute(async (request, response, client) => {
    const { title, body } = request.body;
    if (!title || !body || title.length > 200 || body.length > 10000) throw httpError(400, "Completa un título y contenido válido.");
    const noteId = id();
    await client.query(
      "INSERT INTO notas (id, documento_propietario, titulo, contenido) VALUES ($1, $2, $3, $4)",
      [noteId, request.user.documento, title, body],
    );
    response.status(201).json({ id: noteId });
  }));

  app.post("/api/private/tasks", requireRole("instructor"), transactionRoute(async (request, response, client) => {
    const { title, desc, compId, fichaIds, due } = request.body;
    if (!title || !due || !Array.isArray(fichaIds) || !fichaIds.length) throw httpError(400, "Completa los datos de la actividad.");
    const comp = await client.query(
      "SELECT id, programa_id FROM competencias WHERE id = $1 AND instructor_id = $2",
      [compId, request.user.referencia_id],
    );
    if (!comp.rowCount) throw httpError(403, "La competencia no pertenece a tu portafolio.");
    const fichas = await client.query(
      `SELECT id FROM fichas WHERE id = ANY($1::text[]) AND programa_id = $2
       AND (instructor_jefe_id = $3 OR EXISTS (
         SELECT 1 FROM competencias c WHERE c.programa_id = fichas.programa_id AND c.instructor_id = $3
       ))`,
      [fichaIds, comp.rows[0].programa_id, request.user.referencia_id],
    );
    if (fichas.rowCount !== new Set(fichaIds).size) throw httpError(403, "Una o más fichas no están asignadas a ti.");
    const taskId = id();
    await client.query(
      `INSERT INTO tareas (id, competencia_id, titulo, descripcion, fecha_limite, hora_limite)
       VALUES ($1, $2, $3, $4, $5, '23:59')`,
      [taskId, compId, title, desc || "", due],
    );
    for (const ficha of fichas.rows) {
      await client.query("INSERT INTO tarea_ficha (tarea_id, ficha_id) VALUES ($1, $2)", [taskId, ficha.id]);
    }
    const recipients = await client.query(
      "SELECT a.documento FROM aprendices a WHERE a.ficha_id = ANY($1::text[])",
      [fichas.rows.map((row) => row.id)],
    );
    await notify(client, recipients.rows.map((row) => row.documento), "Nueva actividad", `${title} · vence ${due}`);
    response.status(201).json({ id: taskId });
  }));

  app.post(
    "/api/private/tasks/:taskId/evidence",
    requireRole("aprendiz"),
    require("express").raw({ type: () => true, limit: "10mb" }),
    async (request, response, next) => {
    try {
      verifyOrigin(request, allowedOrigins);
      let fileName;
      try {
        fileName = decodeURIComponent(String(request.get("x-file-name") || ""));
      } catch {
        throw httpError(400, "El nombre del archivo no es válido.");
      }
      const extension = fileName.split(".").pop().toLowerCase();
      const bytes = request.body;
      if (!fileName || fileName.length > 255 || !FILE_TYPES.has(extension) || !Buffer.isBuffer(bytes) || !bytes.length || bytes.length > 10 * 1024 * 1024) {
        throw httpError(400, "Archivo inválido. Revisa el formato y el límite de 10 MB.");
      }
      const client = await getPool().connect();
      try {
        await client.query("BEGIN");
        const student = await client.query(
          "SELECT id, ficha_id FROM aprendices WHERE id = $1 AND documento = $2",
          [request.user.referencia_id, request.user.documento],
        );
        if (!student.rowCount) throw httpError(403, "El perfil de aprendiz no está vinculado a esta cuenta.");
        const task = await client.query(
          `SELECT t.id, t.fecha_limite, c.instructor_id, i.documento
           FROM tareas t JOIN competencias c ON c.id = t.competencia_id
           JOIN instructores i ON i.id = c.instructor_id
           JOIN tarea_ficha tf ON tf.tarea_id = t.id
           WHERE t.id = $1 AND tf.ficha_id = $2`,
          [request.params.taskId, student.rows[0].ficha_id],
        );
        if (!task.rowCount) throw httpError(404, "La actividad no está disponible en tu ficha.");
        const deliveryId = id();
        await client.query(
          `INSERT INTO entregas (id, tarea_id, aprendiz_id, archivo, archivo_bytes, tipo_archivo, estado, con_retraso)
           VALUES ($1, $2, $3, $4, $5, $6, 'Entregado', CURRENT_DATE > $7::date)
           ON CONFLICT (tarea_id, aprendiz_id) DO UPDATE SET
             id = EXCLUDED.id, archivo = EXCLUDED.archivo, archivo_bytes = EXCLUDED.archivo_bytes,
             tipo_archivo = EXCLUDED.tipo_archivo, fecha_entrega = NOW(), estado = 'Entregado',
             con_retraso = CURRENT_DATE > $7::date, nota = NULL, resultado = NULL, retroalimentacion = NULL
           RETURNING id`,
          [deliveryId, request.params.taskId, student.rows[0].id, fileName, bytes, request.get("content-type") || "application/octet-stream", task.rows[0].fecha_limite],
        );
        await notify(client, [task.rows[0].documento], "Nueva entrega", `${request.user.nombre} entregó ${fileName}`);
        await client.query("COMMIT");
        response.status(201).json({ ok: true });
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      next(error);
    }
    },
  );

  app.get("/api/private/deliveries/:deliveryId/file", async (request, response, next) => {
    try {
      const result = await getPool().query(
        `SELECT e.archivo, e.archivo_bytes, e.tipo_archivo
         FROM entregas e JOIN aprendices a ON a.id = e.aprendiz_id
         JOIN fichas f ON f.id = a.ficha_id
         JOIN tareas t ON t.id = e.tarea_id
         JOIN competencias c ON c.id = t.competencia_id
         WHERE e.id = $1 AND (
           e.aprendiz_id = $2 OR c.instructor_id = $2 OR $3 = 'administrador'
         )`,
        [request.params.deliveryId, request.user.referencia_id, request.user.rol],
      );
      if (!result.rowCount) throw httpError(404, "El archivo no existe o no tienes acceso.");
      const file = result.rows[0];
      response.setHeader("Content-Type", file.tipo_archivo);
      response.setHeader("Content-Disposition", `attachment; filename*=UTF-8''${encodeURIComponent(file.archivo)}`);
      response.setHeader("Cache-Control", "private, no-store");
      response.send(file.archivo_bytes);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/private/deliveries/:deliveryId/grade", requireRole("instructor"), transactionRoute(async (request, response, client) => {
    const grade = Number(request.body.grade);
    const result = String(request.body.result || "");
    const comment = String(request.body.comment || "");
    if (!Number.isFinite(grade) || grade < 0 || grade > 5 || !["Aprobado", "No Aprobado"].includes(result)) {
      throw httpError(400, "La calificación debe estar entre 0 y 5 y tener un resultado válido.");
    }
    const delivery = await client.query(
      `SELECT e.id, a.documento, t.titulo FROM entregas e
       JOIN aprendices a ON a.id = e.aprendiz_id
       JOIN tareas t ON t.id = e.tarea_id
       JOIN competencias c ON c.id = t.competencia_id
       WHERE e.id = $1 AND c.instructor_id = $2`,
      [request.params.deliveryId, request.user.referencia_id],
    );
    if (!delivery.rowCount) throw httpError(404, "La entrega no existe o no pertenece a tus competencias.");
    await client.query(
      "UPDATE entregas SET estado = 'Calificado', nota = $2, resultado = $3, retroalimentacion = $4 WHERE id = $1",
      [request.params.deliveryId, grade.toFixed(1), result, comment],
    );
    await client.query(
      `INSERT INTO retroalimentaciones (entrega_id, nota, resultado, comentario, instructor)
       VALUES ($1, $2, $3, $4, $5)`,
      [request.params.deliveryId, grade.toFixed(1), result, comment, request.user.nombre],
    );
    await notify(client, [delivery.rows[0].documento], "Actividad calificada", `${delivery.rows[0].titulo}: nota ${grade.toFixed(1)} · ${result}`);
    response.status(204).end();
  }));

  app.post("/api/private/learners", requireRole("instructor"), transactionRoute(async (request, response, client) => {
    const { name, document, email, fichaId, password } = request.body;
    const ficha = await client.query(
      `SELECT id FROM fichas f WHERE f.id = $1
       AND (f.instructor_jefe_id = $2 OR EXISTS (
         SELECT 1 FROM competencias c WHERE c.programa_id = f.programa_id AND c.instructor_id = $2
       ))`,
      [fichaId, request.user.referencia_id],
    );
    if (!ficha.rowCount) throw httpError(403, "La ficha no está asignada a tu perfil.");
    const learnerId = id();
    await client.query(
      "INSERT INTO aprendices (id, nombre, documento, correo, ficha_id) VALUES ($1, $2, $3, $4, $5)",
      [learnerId, name, document, String(email).toLowerCase(), fichaId],
    );
    await createUser(client, { document, role: "aprendiz", name, email, ref: learnerId, password });
    response.status(201).json({ id: learnerId });
  }));

  app.post("/api/private/instructors", requireRole("administrador"), transactionRoute(async (request, response, client) => {
    const { name, document, email, type, siteId, password } = request.body;
    if (!["De planta", "Técnico", "Transversal"].includes(type)) throw httpError(400, "Tipo de vinculación inválido.");
    if (typeof siteId !== "string" || !siteId.trim()) throw httpError(400, "Selecciona una sede activa para el instructor.");
    const site = await client.query("SELECT id FROM sedes WHERE id = $1 AND activa = TRUE", [siteId]);
    if (!site.rowCount) throw httpError(400, "La sede seleccionada no existe o está inactiva.");
    const instructorId = id();
    await client.query(
      "INSERT INTO instructores (id, nombre, documento, vinculacion, sede_id, correo) VALUES ($1, $2, $3, $4, $5, $6)",
      [instructorId, name, document, type, siteId, String(email).toLowerCase()],
    );
    await createUser(client, { document, role: "instructor", name, email, ref: instructorId, password });
    response.status(201).json({ id: instructorId });
  }));

  app.post("/api/private/sites", requireRole("administrador"), transactionRoute(async (request, response, client) => {
    const siteId = id();
    await client.query(
      "INSERT INTO sedes (id, nombre, ciudad, direccion) VALUES ($1, $2, $3, $4)",
      [siteId, request.body.name, request.body.city, request.body.address],
    );
    response.status(201).json({ id: siteId });
  }));

  app.put("/api/private/sites/:id", requireRole("administrador"), transactionRoute(async (request, response, client) => {
    const { name, city, address } = request.body;
    const result = await client.query(
      "UPDATE sedes SET nombre = $2, ciudad = $3, direccion = $4 WHERE id = $1",
      [request.params.id, name, city, address],
    );
    if (!result.rowCount) throw httpError(404, "La sede no existe.");
    response.status(204).end();
  }));

  app.patch("/api/private/sites/:id/active", requireRole("administrador"), transactionRoute(async (request, response, client) => {
    const result = await client.query(
      "UPDATE sedes SET activa = $2 WHERE id = $1",
      [request.params.id, Boolean(request.body.active)],
    );
    if (!result.rowCount) throw httpError(404, "La sede no existe.");
    response.status(204).end();
  }));

  app.post("/api/private/programs", requireRole("administrador"), transactionRoute(async (request, response, client) => {
    const programId = id();
    await client.query(
      "INSERT INTO programas (id, nombre, codigo, sede_id) VALUES ($1, $2, $3, $4)",
      [programId, request.body.name, request.body.code, request.body.siteId],
    );
    response.status(201).json({ id: programId });
  }));

  app.put("/api/private/programs/:id", requireRole("administrador"), transactionRoute(async (request, response, client) => {
    const result = await client.query(
      "UPDATE programas SET nombre = $2, codigo = $3, sede_id = $4 WHERE id = $1",
      [request.params.id, request.body.name, request.body.code, request.body.siteId],
    );
    if (!result.rowCount) throw httpError(404, "El programa no existe.");
    response.status(204).end();
  }));

  app.post("/api/private/fichas", requireRole("administrador"), transactionRoute(async (request, response, client) => {
    const { number, programId, journey, quarter, start, end, jefeId } = request.body;
    const fichaId = id();
    await client.query(
      `INSERT INTO fichas (id, numero, programa_id, jornada, trimestre_actual, fecha_inicio, fecha_fin, instructor_jefe_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [fichaId, number, programId, journey, quarter, start, end, jefeId],
    );
    response.status(201).json({ id: fichaId });
  }));

  app.post("/api/private/competencies", requireRole("administrador"), transactionRoute(async (request, response, client) => {
    const { code, name, quarter, programId, instructorId } = request.body;
    const competencyId = id();
    await client.query(
      `INSERT INTO competencias (id, codigo, nombre, trimestre, instructor_id, programa_id)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [competencyId, code, name, quarter, instructorId, programId],
    );
    response.status(201).json({ id: competencyId });
  }));

  app.post("/api/private/coordinators", requireRole("administrador"), transactionRoute(async (request, response, client) => {
    const { name, document, email, password } = request.body;
    await createUser(client, { document, role: "coordinador", name, email, ref: null, password });
    response.status(201).json({ ok: true });
  }));

  app.post("/api/private/users/:document/password", requireRole("administrador"), transactionRoute(async (request, response, client) => {
    const hash = await passwordHash(String(request.body.password || ""));
    const result = await client.query(
      "UPDATE usuarios SET password_hash = $2, intentos_fallidos = 0, bloqueado_hasta = NULL WHERE documento = $1",
      [request.params.document, hash],
    );
    if (!result.rowCount) throw httpError(404, "La cuenta no existe.");
    await client.query("DELETE FROM sesiones_auth WHERE documento = $1", [request.params.document]);
    response.status(204).end();
  }));

  app.post("/api/private/risks", requireRole("instructor"), transactionRoute(async (request, response, client) => {
    const { learnerId, level, obs, orient } = request.body;
    if (!["Bajo", "Medio", "Alto"].includes(level) || !obs) throw httpError(400, "Completa un nivel y observaciones válidos.");
    const allowed = await client.query(
      `SELECT a.id, a.documento FROM aprendices a JOIN fichas f ON f.id = a.ficha_id
       WHERE a.id = $1 AND (f.instructor_jefe_id = $2 OR EXISTS (
         SELECT 1 FROM competencias c WHERE c.programa_id = f.programa_id AND c.instructor_id = $2
       ))`,
      [learnerId, request.user.referencia_id],
    );
    if (!allowed.rowCount) throw httpError(403, "El aprendiz no está en tus fichas.");
    const riskId = id();
    await client.query(
      `INSERT INTO reportes_riesgo (id, aprendiz_id, nivel, observaciones, orientacion, emitido_por, instructor_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [riskId, learnerId, level, obs, orient || "", request.user.nombre, request.user.referencia_id],
    );
    await notify(client, [allowed.rows[0].documento], "Reporte de riesgo académico", `Tu instructor registró un reporte (riesgo ${level.toLowerCase()}): ${obs}`);
    response.status(201).json({ id: riskId });
  }));

  app.post("/api/private/materials", requireRole("instructor"), transactionRoute(async (request, response, client) => {
    const { title, type, compId, visibility } = request.body;
    const comp = await client.query(
      "SELECT id, nombre, trimestre, programa_id FROM competencias WHERE id = $1 AND instructor_id = $2",
      [compId, request.user.referencia_id],
    );
    if (!comp.rowCount) throw httpError(403, "La competencia no está asignada a ti.");
    if (!["PDF", "Video", "Presentación", "Enlace"].includes(type) ||
        !["Público", "Privado (solo mi ficha)", "Restringido (solo instructores)"].includes(visibility)) {
      throw httpError(400, "Tipo o visibilidad de material inválido.");
    }
    const assignedFichas = await client.query(
      `SELECT id FROM fichas WHERE programa_id = $1 AND (
        instructor_jefe_id = $2 OR EXISTS (
          SELECT 1 FROM competencias x WHERE x.programa_id = fichas.programa_id AND x.instructor_id = $2
        )
      )`,
      [comp.rows[0].programa_id, request.user.referencia_id],
    );
    const materialId = id();
    await client.query(
      `INSERT INTO materiales (id, titulo, tipo, trimestre, competencia_id, visibilidad, propietario_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [materialId, title, type, comp.rows[0].trimestre, compId, visibility, request.user.referencia_id],
    );
    for (const ficha of assignedFichas.rows) {
      await client.query(
        "INSERT INTO material_fichas (material_id, ficha_id) VALUES ($1, $2)",
        [materialId, ficha.id],
      );
    }
    if (visibility !== "Restringido (solo instructores)") {
      const recipients = await client.query(
        `SELECT DISTINCT a.documento FROM aprendices a JOIN fichas f ON f.id = a.ficha_id
         WHERE f.programa_id = $1 AND ($2 = 'Público' OR f.instructor_jefe_id = $3
           OR EXISTS (SELECT 1 FROM competencias c WHERE c.programa_id = f.programa_id AND c.instructor_id = $3))`,
        [comp.rows[0].programa_id, visibility, request.user.referencia_id],
      );
      await notify(client, recipients.rows.map((row) => row.documento), "Nuevo material formativo", title);
    }
    response.status(201).json({ id: materialId });
  }));

  app.post("/api/private/observations", requireRole("coordinador"), transactionRoute(async (request, response, client) => {
    const { instructorId, quarter, comment } = request.body;
    const result = await client.query(
      "INSERT INTO observaciones (id, instructor_id, trimestre, comentario) VALUES ($1, $2, $3, $4) RETURNING id",
      [id(), instructorId, quarter, comment],
    );
    const user = await client.query("SELECT documento FROM usuarios WHERE referencia_id = $1", [instructorId]);
    await notify(client, user.rows.map((row) => row.documento), "Observación de coordinación", `Nueva observación en tu portafolio (${quarter}).`);
    response.status(201).json({ id: result.rows[0].id });
  }));

  app.patch("/api/private/notifications/read", async (request, response, next) => {
    try {
      verifyOrigin(request, allowedOrigins);
      await getPool().query(
        "UPDATE notificaciones SET leida = TRUE WHERE documento_destino = $1",
        [request.user.documento],
      );
      response.status(204).end();
    } catch (error) {
      next(error);
    }
  });

  app.delete("/api/private/records/:type/:id", transactionRoute(async (request, response, client) => {
    const { type, id: recordId } = request.params;
    const user = request.user;
    const specs = {
      notes: ["notas", "id", "documento_propietario = $2", ["aprendiz"]],
      risks: ["reportes_riesgo", "id", "instructor_id = $2", ["instructor"]],
      materials: ["materiales", "id", "propietario_id = $2", ["instructor"]],
      obs: ["observaciones", "id", null, ["coordinador"]],
      learners: ["aprendices", "id", null, ["instructor"]],
      instructors: ["instructores", "id", null, ["administrador"]],
      sites: ["sedes", "id", null, ["administrador"]],
      programs: ["programas", "id", null, ["administrador"]],
      fichas: ["fichas", "id", null, ["administrador"]],
    };
    const spec = specs[type];
    if (!spec) throw httpError(404, "Tipo de registro desconocido.");
    if (!spec[3].includes(user.rol)) throw httpError(403, "No tienes permisos para eliminar este registro.");
    if (type === "learners") {
      const assigned = await client.query(
        `SELECT 1 FROM aprendices a JOIN fichas f ON f.id = a.ficha_id
         WHERE a.id = $1 AND (f.instructor_jefe_id = $2 OR EXISTS (
           SELECT 1 FROM competencias c WHERE c.programa_id = f.programa_id AND c.instructor_id = $2
         ))`,
        [recordId, user.referencia_id],
      );
      if (!assigned.rowCount) throw httpError(403, "El aprendiz no está en tus fichas.");
    }
    const { rowCount } = await client.query(
      `DELETE FROM ${spec[0]} WHERE ${spec[1]} = $1${spec[2] ? ` AND ${spec[2]}` : ""} RETURNING *`,
      spec[2] ? [recordId, user.documento] : [recordId],
    );
    if (!rowCount) throw httpError(404, "El registro no existe o no tienes acceso.");
    if (type === "learners") {
      await client.query("DELETE FROM usuarios WHERE referencia_id = $1", [recordId]);
    }
    if (type === "instructors") {
      await client.query("DELETE FROM usuarios WHERE referencia_id = $1", [recordId]);
    }
    response.status(204).end();
  }));

  app.use("/api/private", (_request, _response, next) => next(httpError(404, "Ruta privada no encontrada.")));

  app.use("/api", (error, _request, response, _next) => {
    const status = Number(error.status) || (error.code === "23505" ? 409 : error.code === "23503" ? 409 : 500);
    if (status >= 500) console.error("Private API request failed:", error.message);
    response.status(status).json({
      error: status === 409
        ? "El registro ya existe o está relacionado con otros datos."
        : status >= 500
          ? "No se pudo completar la operación."
          : error.message,
    });
  });
}

module.exports = { mountPrivateRoutes, passwordHash };
