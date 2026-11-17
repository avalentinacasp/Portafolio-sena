
const express = require("express");

const crearControlador = require("../controllers/portafolio.controller");

const validarId = require("../middlewares/ValidarId.middleware");
const validarBody = require("../middlewares/ValidarBody.middleware");

// Crear rutas para cada entidad
function crearRutas(tipo) {
    const router = express.Router();

    const controlador = crearControlador(tipo);

    // GET: consultar todos los registros
    router.get("/", controlador.listar);

    // GET: consultar un registro por ID
    router.get(
        "/:id",
        validarId,
        controlador.obtener
    );

    // POST: crear un registro
    router.post(
        "/",
        validarBody,
        controlador.crear
    );

    // PUT: actualizar un registro
    router.put(
        "/:id",
        validarId,
        validarBody,
        controlador.actualizar
    );

    // DELETE: eliminar un registro
    router.delete(
        "/:id",
        validarId,
        controlador.eliminar
    );

    return router;
}

// Exportar las rutas
module.exports = crearRutas;
