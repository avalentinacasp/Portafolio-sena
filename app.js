const $ = (id) => document.getElementById(id);
const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
}[char]));
const roles = {
  aprendiz: "Aprendiz",
  instructor: "Instructor",
  administrador: "Administrador",
  coordinador: "Coordinador",
};
const navItems = {
  aprendiz: [["inicio", "Resumen"], ["ruta", "Mi ruta formativa"], ["evid", "Evidencias"], ["notas", "Mis notas"], ["rec", "Recursos"], ["avisos", "Notificaciones"]],
  instructor: [["inicio", "Resumen"], ["fichas", "Mis fichas"], ["comp", "Actividades"], ["eval", "Evaluar evidencias"], ["riesgo", "Riesgos"], ["docente", "Portafolio docente"]],
  administrador: [["inicio", "Panel de administración"], ["sedes", "Sedes"], ["prog", "Programas"], ["fichas", "Fichas y competencias"], ["usuarios", "Cuentas e instructores"]],
  coordinador: [["inicio", "Resumen"], ["sedes", "Sedes activas"], ["instr", "Instructores"], ["audit", "Auditoría docente"]],
};
const stateKeys = ["sites", "programs", "instructors", "fichas", "comps", "learners", "tareas", "entregas", "notes", "notifs", "risks", "obs", "materials", "users"];
let user = null;
let state = Object.fromEntries(stateKeys.map((key) => [key, []]));
let activeView = "inicio";

async function api(url, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (options.body && !(options.body instanceof Blob) && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }
  const response = await fetch(url, {
    credentials: "same-origin",
    ...options,
    headers,
  });
  if (response.status === 204) return null;
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || "No fue posible completar la solicitud.");
  return payload;
}

function toast(message, kind = "") {
  const node = document.createElement("div");
  node.className = `toast ${kind}`;
  node.textContent = message;
  $("toasts").appendChild(node);
  setTimeout(() => node.remove(), 3500);
}

function heading(title, description, action = "") {
  return `<div class="head"><div><h1>${esc(title)}</h1><p>${esc(description)}</p></div>${action}</div>`;
}

function button(label, data, style = "out") {
  return `<button type="button" class="btn xs ${style}" ${data}>${esc(label)}</button>`;
}

function table(headers, rows) {
  return `<div class="tw"><table><thead><tr>${headers.map((value) => `<th>${esc(value)}</th>`).join("")}</tr></thead><tbody>${rows.length
    ? rows.map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join("")}</tr>`).join("")
    : `<tr><td colspan="${headers.length}">Sin registros todavía.</td></tr>`}</tbody></table></div>`;
}

function badge(value) {
  return `<span class="pill">${esc(value || "—")}</span>`;
}

function getTask(taskId) {
  return state.tareas.find((task) => String(task.id) === String(taskId));
}

function getLearner(learnerId) {
  return state.learners.find((learner) => String(learner.id) === String(learnerId));
}

function getCompetency(compId) {
  return state.comps.find((comp) => String(comp.id) === String(compId));
}

function getDelivery(taskId, learnerId) {
  return state.entregas.find((entry) => String(entry.tareaId) === String(taskId) && String(entry.learnerId) === String(learnerId));
}

function listTasks() {
  if (user.role === "aprendiz") {
    const learner = getLearner(user.ref);
    if (!learner) return [];
    return state.tareas.filter((task) => task.fichas.includes(learner.fichaId)).map((task) => {
      const competency = getCompetency(task.compId) || {};
      const delivery = getDelivery(task.id, learner.id);
      return { ...task, comp: competency.name, q: competency.q, delivery };
    });
  }
  return state.tareas.map((task) => {
    const competency = getCompetency(task.compId) || {};
    return { ...task, comp: competency.name, q: competency.q };
  });
}

function taskCards(tasks, allowSubmit = false) {
  return tasks.length ? `<div class="list">${tasks.map((task) => {
    const delivery = task.delivery;
    const status = delivery?.status || (new Date(`${task.due}T23:59:59`) < new Date() ? "Vencido" : "Pendiente");
    const learner = task.learnerId ? getLearner(task.learnerId) : null;
    const actions = allowSubmit && status !== "Calificado"
      ? button(delivery ? "Reemplazar evidencia" : "Subir evidencia", `data-upload="${esc(task.id)}"`, "gold")
      : "";
    return `<article class="item"><div><strong>${esc(task.title)}</strong><p>${esc(task.comp || "")} · ${esc(task.q || "")} · vence ${esc(task.due)}${learner ? ` · ${esc(learner.name)}` : ""}${delivery ? ` · ${esc(delivery.file)}` : ""}${delivery?.grade ? ` · Nota ${esc(delivery.grade)}` : ""}</p>${delivery?.comment ? `<p>${esc(delivery.comment)}</p>` : ""}</div><div class="acts">${badge(status)}${actions}</div></article>`;
  }).join("")}</div>` : '<div class="empty">No hay actividades para mostrar.</div>';
}

function homeView() {
  return heading(`Hola, ${user.name.split(" ")[0]}`, "Este es el resumen de tu espacio de formación.") +
    `<div class="grid g2"><article class="card"><h3>Actividades</h3>${taskCards(listTasks(), user.role === "aprendiz")}</article><article class="card"><h3>Notificaciones</h3>${state.notifs.slice(0, 5).map((item) => `<p>${esc(item.title)} · ${esc(item.date)}</p>`).join("") || '<p class="mut">No tienes notificaciones nuevas.</p>'}</article></div>`;
}

function learnerView() {
  const learner = getLearner(user.ref);
  const tasks = listTasks();
  if (activeView === "ruta") {
    return heading("Mi ruta formativa", "Actividades asignadas a tu ficha.") + taskCards(tasks, true);
  }
  if (activeView === "evid") {
    return heading("Portafolio de evidencias", "Tus entregas se guardan en la base de datos privada.") +
      table(["Actividad", "Archivo", "Estado", "Fecha", "Acción"], state.entregas
        .filter((entry) => String(entry.learnerId) === String(learner?.id))
        .map((entry) => [esc(getTask(entry.tareaId)?.title || "Actividad"), esc(entry.file), badge(entry.status), esc(entry.date), button("Descargar", `data-download="${esc(entry.id)}"`)]));
  }
  if (activeView === "notas") {
    return heading("Mis notas personales", "Solo tú puedes consultar tus apuntes.", button("＋ Nueva nota", 'data-form="note"', "gold")) +
      `<div class="grid g2">${state.notes.map((note) => `<article class="card"><h3>${esc(note.title)}</h3><p>${esc(note.body)}</p><small class="mut">${esc(note.date)}</small><div>${button("Eliminar", `data-delete="notes:${esc(note.id)}"`, "bad")}</div></article>`).join("") || '<div class="empty">Aún no tienes notas.</div>'}</div>`;
  }
  if (activeView === "rec") {
    return heading("Recursos formativos", "Material disponible para tu programa.") +
      `<div class="list">${state.materials.map((item) => `<div class="item"><div><strong>${esc(item.title)}</strong><p>${esc(item.comp)} · ${esc(item.q)}</p></div>${badge(item.type)}</div>`).join("") || '<div class="empty">Sin recursos publicados.</div>'}</div>`;
  }
  if (activeView === "avisos") {
    return heading("Notificaciones", "Avisos dirigidos a tu cuenta.") +
      `<div class="list">${state.notifs.map((item) => `<div class="item"><div><strong>${esc(item.title)}</strong><p>${esc(item.body)} · ${esc(item.date)}</p></div></div>`).join("") || '<div class="empty">No tienes notificaciones.</div>'}</div>`;
  }
  return homeView();
}

function instructorView() {
  const ownFichas = state.fichas;
  if (activeView === "fichas") {
    return heading("Mis fichas", "Aprendices y grupos asignados a tu perfil.", button("＋ Añadir aprendiz", 'data-form="learner"', "gold")) +
      table(["Ficha", "Programa", "Jornada", "Aprendices"], ownFichas.map((ficha) => [
        esc(ficha.number),
        esc(state.programs.find((program) => program.id === ficha.programId)?.name || ""),
        badge(ficha.journey),
        state.learners.filter((learner) => learner.fichaId === ficha.id).length,
      ])) + table(["Aprendiz", "Documento", "Ficha", "Acciones"], state.learners.map((learner) => [
        esc(learner.name), esc(learner.doc), esc(ownFichas.find((ficha) => ficha.id === learner.fichaId)?.number || ""),
        button("Retirar", `data-delete="learners:${esc(learner.id)}"`, "bad"),
      ]));
  }
  if (activeView === "comp") {
    return heading("Actividades", "Publica actividades en las competencias que tienes asignadas.", button("＋ Nueva actividad", 'data-form="task"', "gold")) +
      taskCards(listTasks());
  }
  if (activeView === "eval") {
    const entries = state.entregas.filter((entry) => entry.status === "Entregado");
    return heading("Evaluar evidencias", "Revisa las entregas de tus fichas.") +
      table(["Aprendiz", "Actividad", "Archivo", "Fecha", "Acciones"], entries.map((entry) => [
        esc(getLearner(entry.learnerId)?.name || ""),
        esc(getTask(entry.tareaId)?.title || ""),
        esc(entry.file),
        esc(entry.date),
        `${button("Descargar", `data-download="${esc(entry.id)}"`)} ${button("Calificar", `data-grade="${esc(entry.id)}"`, "gold")}`,
      ]));
  }
  if (activeView === "riesgo") {
    return heading("Reportes de riesgo", "Seguimiento académico confidencial.", button("＋ Emitir reporte", 'data-form="risk"', "gold")) +
      `<div class="list">${state.risks.map((item) => `<article class="item"><div><strong>${esc(item.learner)} · ${esc(item.level)}</strong><p>${esc(item.obs)} ${esc(item.orient)} · ${esc(item.date)}</p></div>${button("Eliminar", `data-delete="risks:${esc(item.id)}"`, "bad")}</article>`).join("") || '<div class="empty">No has emitido reportes.</div>'}</div>`;
  }
  if (activeView === "docente") {
    return heading("Portafolio docente", "Publica materiales disponibles para tus aprendices.", button("＋ Publicar material", 'data-form="material"', "gold")) +
      `<div class="list">${state.materials.map((item) => `<article class="item"><div><strong>${esc(item.title)}</strong><p>${esc(item.comp)} · ${esc(item.visib)}</p></div>${button("Quitar", `data-delete="materials:${esc(item.id)}"`, "bad")}</article>`).join("") || '<div class="empty">Aún no has publicado material.</div>'}` +
      `<h3>Observaciones recibidas</h3>${state.obs.map((item) => `<p>${esc(item.q)} · ${esc(item.comment)} · ${esc(item.date)}</p>`).join("") || '<p class="mut">Sin observaciones.</p>'}`;
  }
  return homeView();
}

function adminDashboardView() {
  return heading("Panel de administración", "Gestiona la oferta formativa, las fichas y las cuentas del sistema.") +
    `<div class="grid g2 admin-shortcuts">
      <article class="card"><h3>Sedes</h3><p class="mut">Administra los centros de formación.</p>${button("Administrar sedes", 'data-view="sedes"', "gold")}</article>
      <article class="card"><h3>Programas</h3><p class="mut">Organiza la oferta académica por sede.</p>${button("Administrar programas", 'data-view="prog"', "gold")}</article>
      <article class="card"><h3>Fichas y competencias</h3><p class="mut">Configura grupos, programas y competencias.</p>${button("Administrar fichas", 'data-view="fichas"', "gold")}</article>
      <article class="card"><h3>Cuentas e instructores</h3><p class="mut">Crea y administra las cuentas del sistema.</p>${button("Administrar cuentas", 'data-view="usuarios"', "gold")}</article>
    </div>`;
}

function adminView() {
  if (activeView === "inicio") return adminDashboardView();
  if (activeView === "sedes") {
    return heading("Sedes", "Administra los centros de formación.", button("＋ Nueva sede", 'data-form="site"', "gold")) +
      `<div class="grid g2">${state.sites.map((site) => `<article class="card"><h3>${esc(site.name)}</h3><p>${esc(site.city)} · ${esc(site.address)}</p><p>${badge(site.active ? "Activa" : "Inactiva")}</p>${button("Editar", `data-edit="sites:${esc(site.id)}"`)} ${button(site.active ? "Desactivar" : "Activar", `data-toggle="${esc(site.id)}"`)} ${button("Eliminar", `data-delete="sites:${esc(site.id)}"`, "bad")}</article>`).join("") || '<div class="empty">Crea la primera sede.</div>'}</div>`;
  }
  if (activeView === "prog") {
    return heading("Programas", "Oferta académica por sede.", button("＋ Agregar programa", 'data-form="program"', "gold")) +
      table(["Programa", "Código", "Sede", "Acciones"], state.programs.map((program) => [
        esc(program.name), esc(program.code), esc(state.sites.find((site) => site.id === program.siteId)?.name || ""),
        `${button("Editar", `data-edit="programs:${esc(program.id)}"`)} ${button("Eliminar", `data-delete="programs:${esc(program.id)}"`, "bad")}`,
      ]));
  }
  if (activeView === "fichas") {
    return heading("Fichas y competencias", "Configura grupos, programas y competencias.") +
      button("＋ Nueva ficha", 'data-form="ficha"', "gold") + " " +
      button("＋ Nueva competencia", 'data-form="competency"', "gold") +
      table(["Ficha", "Programa", "Jornada", "Instructor jefe", "Aprendices", "Acción"], state.fichas.map((ficha) => [
        esc(ficha.number), esc(state.programs.find((program) => program.id === ficha.programId)?.name || ""),
        badge(ficha.journey), esc(state.instructors.find((item) => item.id === ficha.jefeId)?.name || ""),
        state.learners.filter((learner) => learner.fichaId === ficha.id).length,
        button("Eliminar", `data-delete="fichas:${esc(ficha.id)}"`, "bad"),
      ])) +
      table(["Código", "Competencia", "Programa", "Instructor"], state.comps.map((comp) => [
        esc(comp.code), esc(comp.name), esc(state.programs.find((program) => program.id === comp.programId)?.name || ""),
        esc(state.instructors.find((item) => item.id === comp.instId)?.name || ""),
      ]));
  }
  if (activeView === "usuarios") {
    return heading("Cuentas e instructores", "Crea cuentas con contraseñas iniciales definidas por el administrador.", button("＋ Nuevo instructor", 'data-form="instructor"', "gold") + " " + button("＋ Nuevo coordinador", 'data-form="coordinator"', "out")) +
      table(["Nombre", "Documento", "Rol", "Correo", "Acciones"], state.users.map((account) => [
        esc(account.name), esc(account.doc), badge(roles[account.role]), esc(account.email),
        button("Restablecer contraseña", `data-reset="${esc(account.doc)}"`),
      ])) +
      table(["Instructor", "Vinculación", "Sede", "Acción"], state.instructors.map((item) => [
        esc(item.name), badge(item.type), esc(state.sites.find((site) => site.id === item.siteId)?.name || ""),
        button("Eliminar", `data-delete="instructors:${esc(item.id)}"`, "bad"),
      ]));
  }
  return adminDashboardView();
}

function coordinatorView() {
  if (activeView === "sedes") {
    return heading("Sedes activas", "Centros disponibles.") +
      `<div class="grid g2">${state.sites.filter((site) => site.active).map((site) => `<article class="card"><h3>${esc(site.name)}</h3><p>${esc(site.city)} · ${esc(site.address)}</p></article>`).join("") || '<div class="empty">No hay sedes activas.</div>'}</div>`;
  }
  if (activeView === "instr") {
    return heading("Instructores", "Personal docente por sede.") +
      table(["Nombre", "Vinculación", "Sede", "Correo"], state.instructors.map((item) => [
        esc(item.name), badge(item.type), esc(state.sites.find((site) => site.id === item.siteId)?.name || ""), esc(item.email),
      ]));
  }
  if (activeView === "audit") {
    return heading("Auditoría docente", "Registra observaciones de seguimiento.", button("＋ Nueva observación", 'data-form="observation"', "gold")) +
      `<div class="card"><h3>Material de los instructores</h3>${state.materials.map((item) => `<div class="item"><div><strong>${esc(item.title)}</strong><p>${esc(item.comp)} · ${esc(item.q)} · ${esc(item.visib)}</p></div></div>`).join("") || '<p class="mut">No hay materiales publicados.</p>'}</div>` +
      `<div class="list">${state.obs.map((item) => `<article class="item"><div><strong>${esc(item.instructor)} · ${esc(item.q)}</strong><p>${esc(item.comment)} · ${esc(item.date)}</p></div>${button("Eliminar", `data-delete="obs:${esc(item.id)}"`, "bad")}</article>`).join("") || '<div class="empty">Aún no hay observaciones.</div>'}</div>`;
  }
  return homeView();
}

function render() {
  if (!user) return;
  const items = navItems[user.role] || [];
  $("nav").innerHTML = items.map(([id, label]) => `<button type="button" class="${activeView === id ? "on" : ""}" data-view="${id}">${esc(label)}</button>`).join("") +
    '<button type="button" class="mobile-action" data-action="change-password">Cambiar contraseña</button>';
  const renderer = user.role === "aprendiz" ? learnerView : user.role === "instructor" ? instructorView : user.role === "administrador" ? adminView : coordinatorView;
  $("view").innerHTML = renderer();
  $("uname").textContent = user.name;
  $("urole").textContent = roles[user.role] || user.role;
}

function closeMobileNav() {
  $("nav").classList.remove("open");
  $("umenu").setAttribute("aria-expanded", "false");
  $("umenu").setAttribute("aria-label", "Abrir menú de navegación");
}

async function refreshState() {
  state = await api("/api/private/state");
}

function showPrivate(userInfo) {
  user = userInfo;
  activeView = "inicio";
  $("login").classList.add("hidden");
  $("app").classList.remove("hidden");
  return refreshState().then(render);
}

function field(name, label, type = "text", options = [], value = "") {
  if (type === "select") {
    return `<div class="field"><label for="f-${esc(name)}">${esc(label)}</label><select id="f-${esc(name)}" name="${esc(name)}" required>${options.map(([key, text]) => `<option value="${esc(key)}" ${String(key) === String(value) ? "selected" : ""}>${esc(text)}</option>`).join("")}</select></div>`;
  }
  if (type === "textarea") {
    return `<div class="field"><label for="f-${esc(name)}">${esc(label)}</label><textarea id="f-${esc(name)}" name="${esc(name)}" rows="4" required>${esc(value)}</textarea></div>`;
  }
  return `<div class="field"><label for="f-${esc(name)}">${esc(label)}</label><input id="f-${esc(name)}" name="${esc(name)}" type="${esc(type)}" value="${esc(value)}" ${type === "password" ? 'minlength="10" autocomplete="new-password"' : ""} required></div>`;
}

function selectOptions(items, getValue, getLabel) {
  return items.map((item) => [getValue(item), getLabel(item)]);
}

function openForm(kind, editing = null) {
  const ownCompetencies = state.comps.filter((comp) => user.role !== "instructor" || comp.instId === user.ref);
  const ownFichas = state.fichas.filter((ficha) => user.role !== "instructor" || ficha.jefeId === user.ref || ownCompetencies.some((comp) => comp.programId === ficha.programId));
  const forms = {
    note: ["Nueva nota", [["title", "Título", "text"], ["body", "Contenido", "textarea"]]],
    task: ["Nueva actividad", [
      ["title", "Título", "text"],
      ["desc", "Descripción", "textarea"],
      ["compId", "Competencia", "select", selectOptions(ownCompetencies, (item) => item.id, (item) => `${item.code} · ${item.name}`)],
      ["ficha", "Ficha", "select", [["all", "Todas mis fichas"], ...selectOptions(ownFichas, (item) => item.id, (item) => `Ficha ${item.number}`)]],
      ["due", "Fecha límite", "date"],
    ]],
    learner: ["Añadir aprendiz", [
      ["name", "Nombre completo", "text"],
      ["document", "Documento", "text"],
      ["email", "Correo", "email"],
      ["password", "Contraseña inicial (mín. 10 caracteres)", "password"],
      ["fichaId", "Ficha", "select", selectOptions(ownFichas, (item) => item.id, (item) => `Ficha ${item.number}`)],
    ]],
    risk: ["Emitir reporte de riesgo", [
      ["learnerId", "Aprendiz", "select", selectOptions(state.learners, (item) => item.id, (item) => `${item.name} · ${item.doc}`)],
      ["level", "Nivel", "select", [["Bajo", "Bajo"], ["Medio", "Medio"], ["Alto", "Alto"]]],
      ["obs", "Observaciones", "textarea"], ["orient", "Orientación pedagógica", "textarea"],
    ]],
    material: ["Publicar material", [
      ["title", "Título", "text"],
      ["type", "Tipo", "select", ["PDF", "Video", "Presentación", "Enlace"].map((item) => [item, item])],
      ["compId", "Competencia", "select", selectOptions(ownCompetencies, (item) => item.id, (item) => `${item.code} · ${item.name}`)],
      ["visibility", "Visibilidad", "select", ["Público", "Privado (solo mi ficha)", "Restringido (solo instructores)"].map((item) => [item, item])],
    ]],
    site: ["Registrar sede", [["name", "Nombre", "text"], ["city", "Ciudad", "text"], ["address", "Dirección", "text"]]],
    program: ["Agregar programa", [
      ["name", "Nombre", "text"], ["code", "Código", "text"],
      ["siteId", "Sede", "select", selectOptions(state.sites, (item) => item.id, (item) => item.name)],
    ]],
    instructor: ["Nuevo instructor", [
      ["name", "Nombre completo", "text"], ["document", "Documento", "text"],
      ["email", "Correo", "email"], ["password", "Contraseña inicial (mín. 10 caracteres)", "password"],
      ["type", "Vinculación", "select", ["De planta", "Técnico", "Transversal"].map((item) => [item, item])],
      ["siteId", "Sede", "select", selectOptions(state.sites, (item) => item.id, (item) => item.name)],
    ]],
    coordinator: ["Nuevo coordinador", [
      ["name", "Nombre completo", "text"], ["document", "Documento", "text"],
      ["email", "Correo", "email"], ["password", "Contraseña inicial (mín. 10 caracteres)", "password"],
    ]],
    ficha: ["Nueva ficha", [
      ["number", "Número de ficha", "text"],
      ["programId", "Programa", "select", selectOptions(state.programs, (item) => item.id, (item) => item.name)],
      ["journey", "Jornada", "select", ["Diurna", "Nocturna", "Mixta"].map((item) => [item, item])],
      ["quarter", "Trimestre", "select", Array.from({ length: 4 }, (_, i) => [`Trimestre ${i + 1}`, `Trimestre ${i + 1}`])],
      ["start", "Fecha de inicio", "date"], ["end", "Fecha de fin", "date"],
      ["jefeId", "Instructor jefe", "select", selectOptions(state.instructors, (item) => item.id, (item) => item.name)],
    ]],
    competency: ["Nueva competencia", [
      ["code", "Código", "text"], ["name", "Nombre", "text"],
      ["quarter", "Trimestre", "select", Array.from({ length: 4 }, (_, i) => [`Trimestre ${i + 1}`, `Trimestre ${i + 1}`])],
      ["programId", "Programa", "select", selectOptions(state.programs, (item) => item.id, (item) => item.name)],
      ["instructorId", "Instructor", "select", selectOptions(state.instructors, (item) => item.id, (item) => item.name)],
    ]],
    observation: ["Observación de coordinación", [
      ["instructorId", "Instructor", "select", selectOptions(state.instructors, (item) => item.id, (item) => item.name)],
      ["quarter", "Trimestre", "select", Array.from({ length: 4 }, (_, i) => [`Trimestre ${i + 1}`, `Trimestre ${i + 1}`])],
      ["comment", "Observación", "textarea"],
    ]],
  };
  let title;
  let fields;
  if (editing) {
    title = editing.type === "sites" ? "Editar sede" : "Editar programa";
    fields = editing.type === "sites"
      ? [["name", "Nombre", "text"], ["city", "Ciudad", "text"], ["address", "Dirección", "text"]]
      : [["name", "Nombre", "text"], ["code", "Código", "text"], ["siteId", "Sede", "select", selectOptions(state.sites, (item) => item.id, (item) => item.name)]];
  } else {
    [title, fields] = forms[kind] || [];
  }
  if (!fields) return toast("No hay campos disponibles para esta acción.", "bad");
  $("modal").innerHTML = `<div class="mb"><form class="modal" id="dataForm"><h3>${esc(title)}</h3>${fields.map(([name, label, type, options]) => field(name, label, type, options || [], editing?.record[name] || "")).join("")}<div class="err" id="formError" role="alert"></div><div class="foot"><button type="button" class="btn out" data-close>Cancelar</button><button type="submit" class="btn">Guardar</button></div></form></div>`;
  $("dataForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));
    try {
      let endpoint;
      let method = "POST";
      if (editing) {
        endpoint = `/api/private/${editing.type}/${encodeURIComponent(editing.id)}`;
        method = "PUT";
      } else {
        const routes = {
          note: "notes", task: "tasks", learner: "learners", risk: "risks", material: "materials",
          site: "sites", program: "programs", instructor: "instructors", ficha: "fichas",
          competency: "competencies", observation: "observations", coordinator: "coordinators",
        };
        endpoint = `/api/private/${routes[kind]}`;
        if (kind === "task") {
          data.fichaIds = data.ficha === "all" ? ownFichas.filter((ficha) => {
            const comp = ownCompetencies.find((item) => item.id === data.compId);
            return comp && ficha.programId === comp.programId;
          }).map((ficha) => ficha.id) : [data.ficha];
          delete data.ficha;
        }
      }
      await api(endpoint, { method, body: JSON.stringify(data) });
      $("modal").innerHTML = "";
      await refreshState();
      render();
      toast("Cambios guardados.");
    } catch (error) {
      $("formError").textContent = error.message;
    }
  });
}

function openGrade(deliveryId) {
  const delivery = state.entregas.find((entry) => String(entry.id) === String(deliveryId));
  $("modal").innerHTML = `<div class="mb"><form id="gradeForm" class="modal"><h3>Retroalimentar entrega</h3>${field("grade", "Calificación (0 a 5)", "number")}${field("result", "Resultado", "select", [["Aprobado", "Aprobado"], ["No Aprobado", "No Aprobado"]])}${field("comment", "Observaciones", "textarea")}<div class="err" id="formError"></div><div class="foot"><button type="button" class="btn out" data-close>Cancelar</button><button class="btn">Guardar</button></div></form></div>`;
  $("gradeForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));
    try {
      await api(`/api/private/deliveries/${encodeURIComponent(delivery.id)}/grade`, { method: "POST", body: JSON.stringify(data) });
      $("modal").innerHTML = "";
      await refreshState();
      render();
      toast("Calificación guardada.");
    } catch (error) {
      $("formError").textContent = error.message;
    }
  });
}

async function uploadEvidence(taskId) {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.rar,.png,.jpg,.jpeg,.txt";
  input.onchange = async () => {
    const file = input.files[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) return toast("El archivo supera el límite de 10 MB.", "bad");
    try {
      await api(`/api/private/tasks/${encodeURIComponent(taskId)}/evidence`, {
        method: "POST",
        body: file,
        headers: { "Content-Type": file.type || "application/octet-stream", "X-File-Name": encodeURIComponent(file.name) },
      });
      await refreshState();
      render();
      toast("Evidencia guardada de forma privada.");
    } catch (error) {
      toast(error.message, "bad");
    }
  };
  input.click();
}

async function downloadEvidence(deliveryId) {
  const response = await fetch(`/api/private/deliveries/${encodeURIComponent(deliveryId)}/file`, { credentials: "same-origin" });
  if (!response.ok) {
    const result = await response.json().catch(() => ({}));
    throw new Error(result.error || "No fue posible descargar el archivo.");
  }
  const blob = await response.blob();
  const disposition = response.headers.get("Content-Disposition") || "";
  const encoded = disposition.match(/filename\*=UTF-8''([^;]+)/);
  const filename = encoded ? decodeURIComponent(encoded[1]) : "evidencia";
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

$("umenu").addEventListener("click", () => {
  const isOpen = $("nav").classList.toggle("open");
  $("umenu").setAttribute("aria-expanded", String(isOpen));
  $("umenu").setAttribute("aria-label", isOpen ? "Cerrar menú de navegación" : "Abrir menú de navegación");
});

document.addEventListener("click", async (event) => {
  const target = event.target.closest("button");
  if (!target) return;
  try {
    if (target.dataset.view) {
      activeView = target.dataset.view;
      if (activeView === "avisos") {
        await api("/api/private/notifications/read", { method: "PATCH", body: "{}" });
        await refreshState();
      }
      render();
      closeMobileNav();
    } else if (target.dataset.action === "change-password") {
      closeMobileNav();
      $("changePassword").click();
    } else if (target.dataset.form) {
      openForm(target.dataset.form);
    } else if (target.dataset.edit) {
      const [type, id] = target.dataset.edit.split(":");
      const record = (type === "sites" ? state.sites : state.programs).find((item) => String(item.id) === id);
      if (record) openForm("", { type, id, record });
    } else if (target.dataset.close !== undefined) {
      $("modal").innerHTML = "";
    } else if (target.dataset.upload) {
      uploadEvidence(target.dataset.upload);
    } else if (target.dataset.grade) {
      openGrade(target.dataset.grade);
    } else if (target.dataset.reset) {
      openResetPassword(target.dataset.reset);
    } else if (target.dataset.download) {
      await downloadEvidence(target.dataset.download);
    } else if (target.dataset.toggle) {
      const site = state.sites.find((item) => String(item.id) === target.dataset.toggle);
      await api(`/api/private/sites/${encodeURIComponent(site.id)}/active`, {
        method: "PATCH", body: JSON.stringify({ active: !site.active }),
      });
      await refreshState();
      render();
    } else if (target.dataset.delete) {
      const [type, id] = target.dataset.delete.split(":");
      if (!window.confirm("¿Eliminar este registro permanentemente?")) return;
      await api(`/api/private/records/${encodeURIComponent(type)}/${encodeURIComponent(id)}`, { method: "DELETE" });
      await refreshState();
      render();
    }
  } catch (error) {
    toast(error.message, "bad");
  }
});

function openResetPassword(document) {
  const account = state.users.find((item) => item.doc === document);
  if (!account) return toast("La cuenta ya no está disponible.", "bad");
  $("modal").innerHTML = `<div class="mb"><form id="resetForm" class="modal"><h3>Restablecer contraseña</h3><p>${esc(account.name)} · ${esc(account.doc)}</p>${field("password", "Nueva contraseña (mín. 10 caracteres)", "password")}<div class="err" id="formError"></div><div class="foot"><button type="button" class="btn out" data-close>Cancelar</button><button class="btn">Guardar</button></div></form></div>`;
  $("resetForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const password = new FormData(event.currentTarget).get("password");
    try {
      await api(`/api/private/users/${encodeURIComponent(document)}/password`, {
        method: "POST",
        body: JSON.stringify({ password }),
      });
      $("modal").innerHTML = "";
      toast("Contraseña restablecida; se cerraron las sesiones existentes.");
    } catch (error) {
      $("formError").textContent = error.message;
    }
  });
}

$("loginForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  $("loginErr").textContent = "";
  const form = new FormData(event.currentTarget);
  try {
    const result = await api("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ document: form.get("document"), password: form.get("password") }),
    });
    await showPrivate(result.user);
  } catch (error) {
    $("loginErr").textContent = error.message;
  }
});

const passwordInput = $("pass");
const passwordToggle = $("togglePassword");
passwordToggle.addEventListener("click", () => {
  const isVisible = passwordInput.type === "text";
  passwordInput.type = isVisible ? "password" : "text";
  passwordToggle.setAttribute("aria-label", isVisible ? "Mostrar contraseña" : "Ocultar contraseña");
  passwordToggle.setAttribute("aria-pressed", String(!isVisible));
  passwordToggle.querySelector(".eye-open").hidden = !isVisible;
  passwordToggle.querySelector(".eye-closed").hidden = isVisible;
});

$("logout").addEventListener("click", async () => {
  try {
    await api("/api/auth/logout", { method: "POST", body: "{}" });
  } finally {
    user = null;
    state = Object.fromEntries(stateKeys.map((key) => [key, []]));
    $("app").classList.add("hidden");
    $("login").classList.remove("hidden");
  }
});

$("changePassword").addEventListener("click", () => {
  $("modal").innerHTML = `<div class="mb"><form id="passwordForm" class="modal"><h3>Cambiar contraseña</h3>${field("currentPassword", "Contraseña actual", "password")}${field("newPassword", "Nueva contraseña (mín. 10 caracteres)", "password")}<div class="err" id="formError"></div><div class="foot"><button type="button" class="btn out" data-close>Cancelar</button><button class="btn">Actualizar</button></div></form></div>`;
  $("passwordForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      await api("/api/auth/password", {
        method: "POST",
        body: JSON.stringify(Object.fromEntries(new FormData(event.currentTarget))),
      });
      user = null;
      $("app").classList.add("hidden");
      $("login").classList.remove("hidden");
      $("modal").innerHTML = "";
      toast("Contraseña actualizada. Inicia sesión de nuevo.");
    } catch (error) {
      $("formError").textContent = error.message;
    }
  });
});

async function loadPublicCatalog() {
  const target = $("catalogContent");
  try {
    const result = await api("/api/public/catalog");
    target.innerHTML = result.programs.length
      ? `<ul>${result.programs.map((program) => `<li>${esc(program.name)} <span class="mut">· ${esc(program.site_name)}</span></li>`).join("")}</ul>`
      : '<p>No hay programas publicados.</p>';
  } catch {
    target.textContent = "El catálogo público no está disponible temporalmente.";
  }
}

async function restoreSession() {
  try {
    const result = await api("/api/auth/session");
    if (result.user) await showPrivate(result.user);
  } catch {
    $("loginErr").textContent = "No fue posible verificar la sesión. Intenta iniciar sesión.";
  }
}

try {
  localStorage.removeItem("senaPortafolioV5");
  localStorage.removeItem("senaAuthV5");
  sessionStorage.removeItem("senaSession");
} catch {
  // Storage may be disabled by the browser; the app never uses it for application data.
}

loadPublicCatalog();
restoreSession();
