
function manejarError(error, req, res, next) {

    console.error("Error:", error.message);

    const codigo = error.code ? 500 : 400;

    res.status(codigo).json({
        mensaje: error.message || "Error interno del servidor"
    });
}

module.exports = manejarError;
