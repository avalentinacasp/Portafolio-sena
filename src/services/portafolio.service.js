const { leerArchivo, guardarArchivo } = require("../models/json.model");

// Archivo JSON de cada entidad
const archivos = {
    aprendices: "aprendices.json",
    instructores: "instructores.json",
    evidencias: "evidencias.json"
};

// Campos obligatorios de cada entidad
const camposObligatorios = {
    aprendices: ["nombre"],
    instructores: ["nombre"],
    evidencias: ["titulo", "aprendizId", "instructorId"]
};

// Validar que el tipo de entidad exista
function validarTipo(tipo) {
    if (!archivos[tipo]) {
        throw new Error("Tipo de entidad no válido");
    }
}

// Validar que vengan los campos obligatorios
function validarDatos(tipo, datos) {
    const faltantes = camposObligatorios[tipo].filter(
        campo => datos[campo] === undefined || datos[campo] === ""
    );

    if (faltantes.length) {
        throw new Error(`Faltan campos obligatorios: ${faltantes.join(", ")}`);
    }
}

// Validar que el aprendiz y el instructor de una evidencia existan
async function validarRelaciones(datos) {
    const aprendizId = Number(datos.aprendizId);
    const instructorId = Number(datos.instructorId);

    const aprendices = await listar("aprendices");
    const instructores = await listar("instructores");

    if (!aprendices.some(a => a.id === aprendizId)) {
        throw new Error("El aprendiz indicado no existe");
    }

    if (!instructores.some(i => i.id === instructorId)) {
        throw new Error("El instructor indicado no existe");
    }

    return { ...datos, aprendizId, instructorId };
}

// Consultar todos los registros
async function listar(tipo) {
    validarTipo(tipo);
    return await leerArchivo(archivos[tipo]);
}

// Consultar un registro por ID
async function obtenerPorId(tipo, id) {
    const registros = await listar(tipo);
    return registros.find(r => r.id === Number(id)) || null;
}

// Crear un registro
async function crear(tipo, datos) {
    validarTipo(tipo);
    validarDatos(tipo, datos);

    if (tipo === "evidencias") {
        datos = await validarRelaciones(datos);
    }

    const registros = await listar(tipo);

    const nuevoRegistro = {
        ...datos,
        id: registros.length
            ? Math.max(...registros.map(r => r.id)) + 1
            : 1
    };

    registros.push(nuevoRegistro);

    await guardarArchivo(archivos[tipo], registros);

    return nuevoRegistro;
}

// Actualizar un registro
async function actualizar(tipo, id, datos) {
    validarTipo(tipo);
    validarDatos(tipo, datos);

    if (tipo === "evidencias") {
        datos = await validarRelaciones(datos);
    }

    const registros = await listar(tipo);
    const indice = registros.findIndex(r => r.id === Number(id));

    if (indice === -1) {
        throw new Error("Registro no encontrado");
    }

    // El ID no se puede modificar
    registros[indice] = { ...datos, id: registros[indice].id };

    await guardarArchivo(archivos[tipo], registros);

    return registros[indice];
}

// Eliminar un registro
async function eliminar(tipo, id) {
    const registros = await listar(tipo);
    const indice = registros.findIndex(r => r.id === Number(id));

    if (indice === -1) {
        throw new Error("Registro no encontrado");
    }

    registros.splice(indice, 1);

    await guardarArchivo(archivos[tipo], registros);

    return { mensaje: "Registro eliminado correctamente" };
}

module.exports = {
    listar,
    obtenerPorId,
    crear,
    actualizar,
    eliminar
};
