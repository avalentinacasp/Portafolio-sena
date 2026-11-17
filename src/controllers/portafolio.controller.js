
const servicio = require("../services/portafolio.service");

// Crear los controladores de cada módulo
function crearControlador(tipo) {

    return {

        // Consultar todos los registros
        listar: async (req, res, next) => {
            try {
                const registros = await servicio.listar(tipo);

                return res.status(200).json({
                    mensaje: "Registros consultados correctamente",
                    datos: registros
                });

            } catch (error) {
                next(error);
            }
        },

        // Consultar un registro por ID
        obtener: async (req, res, next) => {
            try {
                const registro = await servicio.obtenerPorId(
                    tipo,
                    req.params.id
                );

                if (!registro) {
                    return res.status(404).json({
                        mensaje: "Registro no encontrado"
                    });
                }

                return res.status(200).json({
                    mensaje: "Registro encontrado",
                    datos: registro
                });

            } catch (error) {
                next(error);
            }
        },

        // Crear un registro
        crear: async (req, res, next) => {
            try {
                const nuevoRegistro = await servicio.crear(
                    tipo,
                    req.body
                );

                return res.status(201).json({
                    mensaje: "Registro creado correctamente",
                    datos: nuevoRegistro
                });

            } catch (error) {
                next(error);
            }
        },

        // Actualizar un registro
        actualizar: async (req, res, next) => {
            try {
                const registroActualizado =
                    await servicio.actualizar(
                        tipo,
                        req.params.id,
                        req.body
                    );

                return res.status(200).json({
                    mensaje: "Registro actualizado correctamente",
                    datos: registroActualizado
                });

            } catch (error) {
                next(error);
            }
        },

        // Eliminar un registro
        eliminar: async (req, res, next) => {
            try {
                const resultado = await servicio.eliminar(
                    tipo,
                    req.params.id
                );

                return res.status(200).json(resultado);

            } catch (error) {
                next(error);
            }
        }
    };
}

module.exports = crearControlador;
